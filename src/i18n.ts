// Языки сайта. Английский — на корне (/works), русский — с префиксом (/ru/works).
// Русские страницы собираются из тех же компонентов (i18n.fallback в astro.config.mjs);
// компонент узнаёт язык через langOf(Astro.currentLocale) и выбирает текст через t("…", "…").

export type Lang = "en" | "ru";

export const langOf = (locale: string | undefined): Lang => (locale === "ru" ? "ru" : "en");

/** Строка на языке страницы: t("Works", "Работы") */
export const tr =
  (lang: Lang) =>
  (en: string, ru: string): string =>
    lang === "ru" ? ru : en;

/** Адрес без языка: "/ru/works" → "/works", "/ru" → "/" */
export const stripLang = (path: string): string => path.replace(/^\/ru(?=\/|$)/, "") || "/";

/** Адрес на нужном языке: "/works" → "/ru/works" */
export function pathIn(lang: Lang, path: string): string {
  const bare = stripLang(path);
  if (lang === "en") return bare;
  return bare === "/" ? "/ru/" : `/ru${bare}`;
}

// ---------- Ссылки в русской версии (src/middleware.ts) ----------
// В HTML русской страницы внутренние ссылки получают префикс /ru, чтобы посетитель не выпадал в английскую версию.
// Не трогаем: файлы (картинки, видео, php), /_astro, /api, архив /v1, уже русские адреса и ссылки с hreflang
// (переключатель языка и альтернативные версии страницы).
const ATTR = /(\s(?:href|action|data-art-href|data-art-order)=")(\/(?!\/)[^"]*)"/g;
const KEEP = /^\/(?:ru(?:[/?#]|$)|_astro\/|api\/|video\/|v1(?:[/?#]|$))|\.[a-z0-9]{2,5}(?:[?#]|$)/i;

export function localizeLinks(html: string): string {
  return html.replace(/<(?:a|img|form)\b[^>]*>/g, (tag) => {
    if (/\shreflang="/.test(tag)) return tag;
    return tag.replace(ATTR, (m, pre: string, path: string) => (KEEP.test(path) ? m : `${pre}${pathIn("ru", path)}"`));
  });
}

/** Русское число: plural(3, "работа", "работы", "работ") → «работы» */
export function plural(n: number, one: string, few: string, many: string): string {
  const d = n % 10;
  const dd = n % 100;
  if (d === 1 && dd !== 11) return one;
  if (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return few;
  return many;
}
