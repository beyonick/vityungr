import type { ImageMetadata } from "astro";
import catalog from "../data/catalog.json";
import { animationFrames, openSizes } from "../data/prints";

export type WorkImage = { src: string; w: number; h: number; cutout: boolean };

export type Work = {
  title: string;
  year: number | null;
  medium: string;
  size: string;
  exhibition_work: boolean;
  status: "available" | "reserved" | "sold" | "archive";
  price_eur: number | null;
  old_price_eur: number | null;
  label: string | null;
  series: string;
  images: WorkImage[];
};

export type Print = {
  title: string;
  kind: "open" | "limited" | "animation" | "print-club";
  paper: string;
  edition_note: string | null;
  left: number | null;
  status: string;
  price_eur: number | null;
  label: string | null;
  images: WorkImage[];
};

export const works = catalog.originals as Work[];
export const prints = catalog.prints as Print[];

// Картинки лежат в src/assets/works; грузим лениво, чтобы в сборку шли только используемые.
const loaders = import.meta.glob<{ default: ImageMetadata }>("/src/assets/works/**/*.jpg");

export async function loadImage(src: string): Promise<ImageMetadata> {
  const key = `/src/assets/works/${src}`;
  const loader = loaders[key];
  if (!loader) throw new Error(`Image not found: ${key}`);
  return (await loader()).default;
}

/** "originals/montenegro/budva" — стабильный id работы (папка). */
export function workId(w: Work | Print): string {
  return w.images[0].src.split("/").slice(0, 3).join("/");
}

export function findWork(id: string): Work {
  const w = works.find((x) => workId(x) === id);
  if (!w) throw new Error(`Work not found: ${id}`);
  return w;
}

export function coverOf(seriesSlug: string, folder: string): Work {
  return findWork(`originals/${seriesSlug}/${folder}`);
}

export function worksIn(seriesSlug: string): Work[] {
  return works.filter((w) => w.series === seriesSlug);
}

/** Работы в продаже: сначала NEW, потом со скидкой, потом остальные. */
export function availableWorks(): Work[] {
  const rank = (w: Work) => (w.label === "NEW" ? 0 : w.old_price_eur ? 1 : 2);
  return works.filter((w) => w.status === "available").sort((a, b) => rank(a) - rank(b));
}

export function formatSize(size: string): string {
  return size.replace(/\s*x\s*/i, " × ");
}

export function formatPrice(eur: number | null): string {
  return eur == null ? "" : `€${eur.toLocaleString("en-US")}`;
}

/** Подпись для полноэкранного просмотра: техника · размер · цена или статус */
export function artMeta(w: Work): string {
  const state = w.status === "available" ? formatPrice(w.price_eur) : w.status === "sold" ? "Sold" : w.status === "reserved" ? "Reserved" : "";
  return [w.medium, w.size && formatSize(w.size), state].filter(Boolean).join(" · ");
}

/** Папка работы — последняя часть адреса её страницы */
export const slugOf = (w: Work) => workId(w).split("/").pop()!;

export function workHref(w: Work): string {
  return `/works/${w.series}/${slugOf(w)}`;
}

/** «montenegro/budva» — id работы в форме заказа */
export function orderId(w: Work): string {
  return workId(w).split("/").slice(1).join("/");
}

/** Ссылка на форму заказа с выбранной работой — только для тех, что в продаже */
export function orderHref(w: Work): string | undefined {
  return w.status === "available" ? `/order?work=${orderId(w)}` : undefined;
}

/** Фото «в руках / в интерьере», если есть — для hover-состояния карточки. */
export function contextPhoto(w: Work): WorkImage | undefined {
  return w.images.slice(1).find((i) => !i.cutout);
}

// ---------- Для новой версии (галерея) ----------

export const ratioOf = (w: { images: WorkImage[] }) => w.images[0].w / w.images[0].h;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** «Oil on board» (в каталоге встречается и со строчной) */
export const mediumOf = (w: Work) => cap(w.medium);

/** «Oil on board, 47 × 32 cm» */
export function mediumSize(w: Work): string {
  return [mediumOf(w), w.size && formatSize(w.size)].filter(Boolean).join(", ");
}

/** Ширина и высота в см. Какое число — высота, решаем по пропорциям фото: в каталоге порядок не всегда один. */
export function sizeCm(w: Work): { w: number; h: number } | null {
  const m = w.size.match(/([\d.]+)\s*x\s*([\d.]+)/i);
  if (!m) return null;
  const [a, b] = [Number(m[1]), Number(m[2])];
  const wide = ratioOf(w) >= 1;
  return { w: wide ? Math.max(a, b) : Math.min(a, b), h: wide ? Math.min(a, b) : Math.max(a, b) };
}

/** Статус словами — для страницы работы */
export function stateLabel(w: Work): string {
  return { available: "Available", reserved: "Reserved", sold: "Sold", archive: "Not available" }[w.status];
}

/** Работы серии в порядке её страницы: в продаже (новые первыми), забронированные, проданные, остальные */
export function seriesOrder(slug: string): Work[] {
  const rank = { available: 0, reserved: 1, sold: 2, archive: 3 };
  const fresh = (w: Work) => (w.label === "NEW" ? 0 : 1);
  return worksIn(slug).sort((a, b) => rank[a.status] - rank[b.status] || fresh(a) - fresh(b));
}

/** Цена, если работа продаётся, иначе статус. Скидки не показываем. */
export function priceOrState(w: Work): string {
  if (w.status === "available") return formatPrice(w.price_eur);
  if (w.status === "sold") return "Sold";
  if (w.status === "reserved") return "Reserved";
  return "";
}

/** Работы в продаже для галереи: сначала новые, дальше по очереди из разных серий */
export function galleryOrder(): Work[] {
  const all = availableWorks();
  const fresh = all.filter((w) => w.label === "NEW");
  const bySeries = new Map<string, Work[]>();
  all
    .filter((w) => w.label !== "NEW")
    .forEach((w) => bySeries.set(w.series, [...(bySeries.get(w.series) ?? []), w]));
  const queues = [...bySeries.values()];
  const mixed: Work[] = [];
  while (queues.some((q) => q.length)) queues.forEach((q) => q.length && mixed.push(q.shift()!));
  return [...fresh, ...mixed];
}

// ---------- Принты (страница /prints и форма заявки) ----------

/** «prints/limited/olive-grove» — id принта в форме заказа */
export const printId = (p: Print) => workId(p);

export const availablePrints = () => prints.filter((p) => p.status === "available");

/** Анимационные принты называются так же, как обычные, — отличаем припиской */
export const printTitle = (p: Print) => (p.kind === "animation" ? `${p.title}, animation print` : p.title);

/** «A3, 200 gsm matte paper» из «Printed on 200 gsm matte A3 paper» */
export function paperOf(p: Print): string {
  const m = p.paper.match(/Printed on (.+?) paper/i);
  if (!m) return p.paper;
  const size = m[1].match(/\b(A\d)\b/)?.[1];
  const stock = m[1].replace(/\s*\bA\d\b/, "").trim();
  return [size, `${stock} paper`].filter(Boolean).join(", ");
}

/** «2 of 5 left», «Back in stock, 1 of 5 left», «Sold out» */
export function printStock(p: Print): string {
  if (p.status === "sold out") return "Sold out";
  if (p.kind === "animation") return "One of a kind";
  if (p.kind === "open") return "Open edition";
  if (p.left == null) return "Limited batch of 5";
  return `${p.label === "RESTOCK" ? "Back in stock, " : ""}${p.left} of 5 left`;
}

export type PrintOption = { label: string; price: string };

/** Что выбрать: размер у открытого тиража, набор кадров у некоторых анимационных */
export function printOptions(p: Print): { name: string; list: PrintOption[] } | null {
  if (p.kind === "open") {
    return { name: "Size", list: openSizes.map((s) => ({ label: s.label, price: formatPrice(s.price) })) };
  }
  const frames = p.kind === "animation" ? animationFrames[p.title] : undefined;
  if (frames) return { name: "Frames", list: frames.map((f) => ({ label: f, price: formatPrice(p.price_eur) })) };
  return null;
}

/** Цена словами: у открытого тиража — «from €30» */
export function printPrice(p: Print): string {
  if (p.status === "sold out") return "Sold out";
  if (p.kind === "open") return `from ${formatPrice(Math.min(...openSizes.map((s) => s.price)))}`;
  return formatPrice(p.price_eur);
}

export const printOrderHref = (p: Print) => (p.status === "available" ? `/order?work=${printId(p)}` : undefined);
