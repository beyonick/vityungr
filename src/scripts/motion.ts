// Движение страницы: плавное появление снизу при скролле.
import { scroller } from "./scroll";

declare global {
  interface Window {
    __motionFallback?: number;
  }
}

const root = document.documentElement;
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

window.clearTimeout(window.__motionFallback);

// ---------- Появление ----------
// Картина всплывает, только когда уже загрузилась, — чтобы не выезжала пустая рамка.
function whenReady(el: Element) {
  const img = el.querySelector("img");
  if (!img || img.complete) return Promise.resolve();
  return new Promise<void>((resolve) => {
    img.addEventListener("load", () => resolve(), { once: true });
    img.addEventListener("error", () => resolve(), { once: true });
    window.setTimeout(resolve, 1800);
  });
}

const revealables = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));

if (reduced || !("IntersectionObserver" in window)) {
  root.classList.add("no-motion");
} else {
  // Сдвинутый вниз элемент может стартовать за краем экрана — тогда следим за его неподвижной обёрткой
  const watched = new Map<Element, HTMLElement[]>();
  const io = new IntersectionObserver(
    (entries) => {
      const entering = entries
        .filter((e) => e.isIntersecting)
        .sort(
          (a, b) =>
            a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left,
        );
      const els = entering.flatMap((entry) => {
        io.unobserve(entry.target);
        return watched.get(entry.target) ?? [];
      });
      els.forEach((el, i) => {
        const step = el.dataset.reveal === "rise" ? 120 : 70;
        el.style.setProperty("--d", `${Math.min(i, 8) * step}ms`);
        whenReady(el).then(() => requestAnimationFrame(() => el.classList.add("is-in")));
      });
    },
    { rootMargin: "0px 0px -6% 0px" },
  );
  revealables.forEach((el) => {
    const target = el.dataset.reveal === "rise" && el.parentElement ? el.parentElement : el;
    watched.set(target, [...(watched.get(target) ?? []), el]);
    io.observe(target);
  });
}

// ---------- Просмотр картины останавливает скролл (scripts/art.ts) ----------
window.addEventListener("art:open", () => scroller.lock());
window.addEventListener("art:close", () => scroller.unlock());
