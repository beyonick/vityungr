// Русская версия (/ru/…) — те же страницы, что и английская (i18n.fallback в astro.config.mjs).
// Здесь её внутренние ссылки получают префикс /ru (localizeLinks в src/i18n.ts). Работает и в dev, и при сборке.
import { defineMiddleware } from "astro:middleware";
import { localizeLinks } from "./i18n";

export const onRequest = defineMiddleware(async (ctx, next) => {
  const res = await next();
  if (ctx.currentLocale !== "ru" || !res.headers.get("content-type")?.includes("text/html")) return res;
  const html = localizeLinks(await res.text());
  return new Response(html, { status: res.status, statusText: res.statusText, headers: res.headers });
});
