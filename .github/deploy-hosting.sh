#!/usr/bin/env bash
# Собирает сайт в dist/ и заливает на хостинг. Без --upload только собирает.
# Переменные для заливки: HOSTING_PROTOCOL (sftp|ftp), HOSTING_HOST, HOSTING_USER, HOSTING_PASSWORD, HOSTING_DIR.
set -euo pipefail
cd "$(dirname "$0")/.."

npm run build
OUT=dist
[[ -f "$OUT/.htaccess" ]] || { echo "::error::нет $OUT/.htaccess (должен прийти из public/)"; exit 1; }
[[ "${1:-}" == "--upload" ]] || exit 0

# Куда уходят заявки с формы /order: секреты GitHub → api/order-config.php
# (.htaccess закрывает его от прямых запросов).
node .github/order-config.mjs "$OUT/api/order-config.php"

if [[ -z "${HOSTING_HOST:-}" ]]; then
  echo "::warning::HOSTING_HOST не задан — выкладка на хостинг пропущена"
  exit 0
fi
fail() { echo "::error::$*"; exit 1; }
[[ -n "${HOSTING_USER:-}" ]] || fail "переменная HOSTING_USER пуста"
[[ -n "${HOSTING_PASSWORD:-}" ]] || fail "секрет HOSTING_PASSWORD пуст или не виден"
[[ -n "${HOSTING_DIR:-}" ]] || fail "переменная HOSTING_DIR пуста"
echo "target=${HOSTING_PROTOCOL}://${HOSTING_HOST}/${HOSTING_DIR}"

# .well-known и cgi-bin создаёт сам хостинг: --delete не должен их трогать.
# В CI у всех файлов свежая дата, поэтому по времени сравнивать нельзя — залилось бы всё.
# 1) Всё, кроме html, php и json, сверяем по размеру: в _astro имя файла содержит хэш, новое содержимое = новое имя.
# 2) html, php и json (обработчик заявок, его конфиг и список работ) заливаем всегда и после файлов:
#    цена 700 → 800 не меняет размер works.json, а страницы не должны ссылаться на ещё не залитое.
# 3) Только потом удаляем то, чего больше нет в сборке.
LFTP_PASSWORD="$HOSTING_PASSWORD" lftp --env-password -u "$HOSTING_USER" "${HOSTING_PROTOCOL}://${HOSTING_HOST}" -e "
  set cmd:fail-exit yes
  set net:max-retries 3
  set net:timeout 20
  set sftp:auto-confirm yes
  set ftp:ssl-allow yes
  mirror --reverse --ignore-time --parallel=4 --exclude-glob *.html --exclude-glob *.php --exclude-glob *.json $OUT/ $HOSTING_DIR/
  mirror --reverse --parallel=4 --include-glob *.html --include-glob *.php --include-glob *.json $OUT/ $HOSTING_DIR/
  mirror --reverse --delete --ignore-time \
    --exclude-glob .well-known/ --exclude-glob cgi-bin/ \
    $OUT/ $HOSTING_DIR/
  quit
" || fail "заливка на ${HOSTING_HOST} не удалась, подробности в логе шага"
