// Пишет api/order-config.php — куда обработчик заявок (public/api/order.php) шлёт заявки.
// Значения берутся из секретов и переменных GitHub, в репозитории их нет.
// Запуск: node .github/order-config.mjs dist/api/order-config.php
import { writeFileSync } from "node:fs";

const env = process.env;
const config = {
  telegram_token: env.ORDER_TELEGRAM_TOKEN,
  telegram_chat: env.ORDER_TELEGRAM_CHAT,
  email: env.ORDER_EMAIL || "vityungr.art@gmail.com",
  mail_from: env.ORDER_MAIL_FROM,
  site: env.SITE_URL,
};

// строка PHP в одинарных кавычках: внутри значимы только \ и '
const php = (v) => `'${String(v ?? "").replace(/[\\']/g, "\\$&")}'`;
const body = Object.entries(config)
  .map(([k, v]) => `  ${php(k)} => ${php(v)},`)
  .join("\n");

writeFileSync(process.argv[2], `<?php\nreturn [\n${body}\n];\n`);

if (!config.telegram_token || !config.telegram_chat) {
  console.log("::warning::ORDER_TELEGRAM_TOKEN или ORDER_TELEGRAM_CHAT не заданы — заявки придут только на почту");
}
