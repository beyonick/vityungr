// Плавный скролл — свой, без библиотек.
// Колесо мыши и клавиатура двигают не страницу, а цель; страница догоняет её с инерцией.
// Тач, полоса прокрутки и поиск по странице остаются нативными — мы только подстраиваемся под них.

type Listener = (y: number) => void;

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const LERP = 0.07; // доля пути за кадр при 60 fps: меньше — плавнее и дольше

let target = window.scrollY;
let current = window.scrollY;
let expected = window.scrollY;
let running = false;
let locked = false;
let last = 0;
const listeners = new Set<Listener>();

const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;
const clamp = (v: number) => Math.min(Math.max(v, 0), maxScroll());

function frame(time: number) {
  if (!running) return;
  const dt = last ? Math.min((time - last) / 16.667, 4) : 1;
  last = time;
  const k = 1 - Math.pow(1 - LERP, dt);
  current += (target - current) * k;
  if (Math.abs(target - current) < 0.4) current = target;
  expected = current;
  window.scrollTo(0, current);
  if (current === target) {
    running = false;
    last = 0;
  } else {
    requestAnimationFrame(frame);
  }
}

function glideTo(y: number) {
  if (!running) current = window.scrollY;
  target = clamp(y);
  if (reduced) {
    window.scrollTo(0, target);
    current = target;
    return;
  }
  if (!running) {
    running = true;
    last = 0;
    requestAnimationFrame(frame);
  }
}

/** Внутри есть свой скролл (например, меню) — колесо отдаём ему */
function insideScrollable(el: EventTarget | null) {
  let node = el instanceof Element ? el : null;
  while (node && node !== document.body && node !== document.documentElement) {
    if (node.scrollHeight > node.clientHeight) {
      const oy = getComputedStyle(node).overflowY;
      if (oy === "auto" || oy === "scroll") return true;
    }
    node = node.parentElement;
  }
  return false;
}

function isTyping(el: EventTarget | null) {
  return (
    el instanceof HTMLElement &&
    (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
  );
}

if (!reduced) {
  window.addEventListener(
    "wheel",
    (e) => {
      if (locked || e.ctrlKey || e.defaultPrevented) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (insideScrollable(e.target)) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? window.innerHeight : 1;
      glideTo((running ? target : window.scrollY) + e.deltaY * unit);
    },
    { passive: false },
  );

  window.addEventListener("keydown", (e) => {
    if (locked || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || isTyping(e.target)) return;
    const onControl = e.target instanceof HTMLElement && e.target.closest("button, a, [role='button']");
    const page = window.innerHeight * 0.85;
    const from = running ? target : window.scrollY;
    let to: number | null = null;
    if (e.key === "ArrowDown") to = from + 140;
    else if (e.key === "ArrowUp") to = from - 140;
    else if (e.key === "PageDown") to = from + page;
    else if (e.key === "PageUp") to = from - page;
    else if (e.key === " " && !onControl) to = from + (e.shiftKey ? -page : page);
    else if (e.key === "Home") to = 0;
    else if (e.key === "End") to = maxScroll();
    if (to === null) return;
    e.preventDefault();
    glideTo(to);
  });
}

// Любой скролл, который начали не мы, становится новой точкой отсчёта
window.addEventListener(
  "scroll",
  () => {
    const y = window.scrollY;
    if (running && Math.abs(y - expected) > 3) {
      running = false;
      last = 0;
    }
    if (!running) current = target = y;
    listeners.forEach((fn) => fn(y));
  },
  { passive: true },
);

window.addEventListener("resize", () => {
  target = clamp(target);
});

// Якоря на странице — тоже плавно
document.addEventListener("click", (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const link = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>('a[href^="#"]') : null;
  if (!link) return;
  const id = decodeURIComponent(link.hash.slice(1));
  const el = id ? document.getElementById(id) : document.body;
  if (!el) return;
  e.preventDefault();
  const y = id === "top" || !id ? 0 : el.getBoundingClientRect().top + window.scrollY - 24;
  glideTo(y);
  history.pushState(null, "", id ? `#${id}` : location.pathname);
  if (id && !el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
  el.focus({ preventScroll: true });
});

export const scroller = {
  to: glideTo,
  onScroll(fn: Listener) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  /** Останавливает инерцию и перестаёт принимать колесо (например, пока картину рассматривают) */
  lock() {
    locked = true;
    running = false;
    last = 0;
    current = target = window.scrollY;
  },
  unlock() {
    locked = false;
    current = target = window.scrollY;
  },
};
