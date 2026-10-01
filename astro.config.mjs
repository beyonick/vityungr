// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://vityungr.nicktmsh.ru",
  server: {
    host: "127.0.0.1",
    port: Number(process.env.PORT) || 4321,
  },
  // панель разработчика Astro перекрывает низ страницы на скриншотах
  devToolbar: { enabled: false },
  // Английский — на корне, русский — /ru/…: страницы те же, текст выбирает сам компонент (src/i18n.ts)
  i18n: {
    defaultLocale: "en",
    locales: ["en", "ru"],
    routing: { prefixDefaultLocale: false, fallbackType: "rewrite" },
    fallback: { ru: "en" },
  },
});
