# Vityungr — сайт художника

Статический сайт на [Astro](https://astro.build). Шрифты локальные (Fraunces, Schibsted Grotesk через Fontsource), без Google Fonts.

Сейчас в проекте две версии главной:

| Версия | Адрес | Код |
|---|---|---|
| **Галерея** (основная): белый фон, ровные ряды картин, у каждого раздела заголовок и текст. Плавный скролл и появление написаны вручную; выезд картины снизу и просмотр — код прошлой версии на GSAP | `/` | `src/components`, `src/scripts`, `src/styles` |
| Прошлая, лендинг (в запасе): GSAP + Lenis | `/v1/` | `src/v1`, страница `src/pages/v1` |

Все работы в продаже — `/works` (`src/pages/works.astro`). На главной в Available now видно три ряда (`<Wall rows={3}>`), дальше кнопка на эту страницу. Первый экран — лента миниатюр внизу, выбранная картина опускается сверху (`src/components/home/Hero.astro` + `src/scripts/art.ts`).

Каталог, фото и тексты у обеих общие. Чтобы убрать прошлую версию, удалите `src/v1` и `src/pages/v1`. После этого из `package.json` можно убрать `lenis` и `@iconify*` (`gsap` нужен галерее).

## Запуск

```bash
npm install
npm run dev      # http://127.0.0.1:4321
npm run build    # статика в dist/
```

## Где что лежит (галерея)

| Что | Где |
|---|---|
| Главная | `src/pages/index.astro`, разделы — `src/components/home/*` |
| Шапка раздела (номер, заголовок, текст) | `src/components/SectionHead.astro` |
| Картина с подписью | `src/components/Painting.astro` |
| Ряды картин одной высоты | `src/components/Wall.astro` |
| Выезд картины снизу при наведении, просмотр по клику | `src/components/ArtOverlay.astro`, `src/scripts/art.ts` |
| Плавный скролл | `src/scripts/scroll.ts` |
| Появление при скролле | `src/scripts/motion.ts` |
| Цвета, шрифты, общие стили | `src/styles/global.css` |
| Тексты серий и истории с пленэра | `src/data/series.ts` (черновики от лица Вити — сверить с ним) |
| Контакты, соцсети, ссылки Print Club | `src/data/site.ts` |
| Каталог работ (цены, статусы, размеры) | `src/data/catalog.json` — генерируется, руками не править |
| Фото работ для сайта | `src/assets/works/**` — генерируются |
| Фото Вити | `src/assets/vitya/*` (из Instagram) |

### Как ведут себя картины

- Под каждой картиной всегда видно название.
- Навёл курсор — остальные картины гаснут до тонкого контура, наведённая чуть приподнимается, проявляются цена и размер. Одновременно она выезжает снизу краем на всю ширину экрана и покачивается.
- Первый экран: выбранная картина опускается сверху до заголовка и остаётся, пока экран виден; наведение на миниатюру в ленте меняет её, при скролле она уезжает вверх вместе с заголовком. На тач-экранах вместо этого картина стоит по центру и меняется тапом.
- Картину под курсором определяет `scripts/art.ts` по координатам мыши, поэтому наведение не сбрасывается, пока страница едет.
- Клик — картина открывается почти на весь экран. Закрыть: Esc, клик мимо или «Close».
- На телефоне цена и размер видны сразу, картина открывается по тапу.
- Высота рядов задаётся в разделах (`<Wall height={…}>`), скорость скролла — константа в начале `scroll.ts`.

## Как обновляется каталог

1. `npm run scrape` — забирает работы, цены и фото со старого сайта на Тильде в `works/` (в git не идёт).
2. `npm run images` — обрезает белую подложку, уменьшает фото до 1600 px, пишет `src/assets/works` и `src/data/catalog.json`.

3. `npm run media:prepare` — собирает `media/vityungr/` для архива исходников в Selectel (бакет `websites-media`, папка `vityungr/`): `tilda/` — фото со старого сайта и каталог, `hires/` — исходники от Вити в полном размере. В git и на хостинг они не идут.

Веб-версии фото (`src/assets/works`) лежат в git, сайт собирается без внешних сервисов.

## Выкладка

Как у nicktmsh: пуш в `main` → GitHub Actions (`.github/workflows/deploy-hosting.yml`) собирает сайт и заливает `dist/` на Timeweb по SFTP (`.github/deploy-hosting.sh`, lftp mirror). `.htaccess` лежит в `public/` и попадает в `dist` при сборке.

В настройках репозитория (Settings → Secrets and variables → Actions):

| Что | Тип | Пример |
|---|---|---|
| `HOSTING_HOST` | variable | сервер Timeweb, `vh460.timeweb.ru` (тот же, что у nicktmsh) |
| `HOSTING_USER` | variable | логин хостинга |
| `HOSTING_DIR` | variable | `vityungr/public_html` (по умолчанию): папка сайта в Timeweb + `/public_html` |
| `HOSTING_PROTOCOL` | variable | `sftp` (по умолчанию) или `ftp` |
| `HOSTING_PASSWORD` | secret | пароль хостинга |

Пока `HOSTING_HOST` не задан, workflow только собирает сайт. Перезапустить вручную: Actions → Deploy to hosting → Run workflow.

## Проверка

- `npm run shots -- http://127.0.0.1:4321/ shots [--mobile|--wide|--reduced]` — скриншоты страницы по ходу скролла через установленный Chrome.
- `npm run hover-test -- http://127.0.0.1:4321/ shots 0` — наводит курсор на картину, кликает, закрывает по Esc; скриншоты каждого шага.
