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

export function workHref(w: Work): string {
  return `/works/${w.series}/${workId(w).split("/").pop()}`;
}

/** Фото «в руках / в интерьере», если есть — для hover-состояния карточки. */
export function contextPhoto(w: Work): WorkImage | undefined {
  return w.images.slice(1).find((i) => !i.cutout);
}

// ---------- Для новой версии (галерея) ----------

export const ratioOf = (w: { images: WorkImage[] }) => w.images[0].w / w.images[0].h;

/** «Oil on board, 47 × 32 cm» */
export function mediumSize(w: Work): string {
  return [w.medium, w.size && formatSize(w.size)].filter(Boolean).join(", ");
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
