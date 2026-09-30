import type { ImageMetadata } from "astro";
import catalog from "../data/catalog.json";

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
