// Картины. Наведение: остальные гаснут до контура, наведённая выезжает краем на всю ширину экрана
// (под плавающим углом, как в прошлой версии, src/v1/scripts/art.ts). Клик — просмотр почти на весь экран.
import { gsap } from "gsap";

const peek = document.querySelector<HTMLElement>("[data-peek]");
const peekImg = document.querySelector<HTMLImageElement>("[data-peek-img]");
const viewer = document.querySelector<HTMLElement>("[data-viewer]");
const viewerImg = document.querySelector<HTMLImageElement>("[data-viewer-img]");
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
const canHover = window.matchMedia("(hover: hover) and (pointer: fine)");

const hero = document.querySelector<HTMLElement>("[data-hero]");
const heroIntro = hero?.querySelector<HTMLElement>("[data-hero-intro]") ?? null;

/** Большая картина первого экрана, выбранная миниатюрой */
const heroBig = (index: string | undefined) =>
  hero?.querySelector<HTMLImageElement>(`[data-hero-big="${index}"] img[data-art]`) ?? null;

/** Картина под курсором: сама картинка, любая точка её карточки или миниатюра первого экрана */
function artFrom(target: EventTarget | null): HTMLImageElement | null {
  if (!(target instanceof Element)) return null;
  if (viewer?.contains(target)) return null;
  const pick = target.closest<HTMLElement>("[data-hero-pick]");
  if (pick) return heroBig(pick.dataset.heroPick);
  const direct = target.closest<HTMLImageElement>("img[data-art]");
  if (direct) return direct;
  return target.closest(".pt__link")?.querySelector<HTMLImageElement>("img[data-art]") ?? null;
}

/** Сначала показываем то, что уже загружено, потом подменяем на большую версию */
function loadInto(img: HTMLImageElement, art: HTMLImageElement, isCurrent: () => boolean) {
  img.src = art.currentSrc || art.src;
  const full = art.dataset.art;
  if (!full || img.src.endsWith(full)) return;
  const pre = new Image();
  pre.decoding = "async";
  pre.onload = () => isCurrent() && (img.src = full);
  pre.src = full;
}

// ---------- Наведение ----------
// Картину под курсором определяем сами, по координатам мыши: так наведение не сбрасывается,
// пока страница едет под неподвижным курсором. Наведённая картина получает .is-hovered,
// остальные гаснут до контура (стили в global.css), а сама она выезжает снизу краем на всю ширину.
// Первый экран — особый: выбранная картина опускается сверху до заголовка и остаётся, пока экран
// виден; миниатюры в ленте меняют её. При скролле она уезжает вверх вместе с первым экраном.
let pointerX = -1;
let pointerY = -1;
let hoveredCard: Element | null = null;
let heroArt: HTMLImageElement | null = heroBig("0");

const setHovered = (card: Element | null) => {
  if (card === hoveredCard) return;
  hoveredCard?.classList.remove("is-hovered");
  hoveredCard = card;
  card?.classList.add("is-hovered");
  document.documentElement.classList.toggle("has-hover", card !== null);
};

/** Где кончается низ картины первого экрана: чуть выше заголовка и не ниже двух третей экрана */
const heroEdge = () => {
  const limit = heroIntro ? heroIntro.getBoundingClientRect().top - 28 : window.innerHeight * (2 / 3);
  return Math.min(window.innerHeight * (2 / 3), limit);
};
const heroActive = () => hero !== null && heroEdge() > window.innerHeight * 0.22;

let showPeek: (art: HTMLImageElement) => void = () => {};
let hidePeek: () => void = () => {};
let followPeek: () => void = () => {};
let peekCurrent: () => HTMLImageElement | null = () => null;

if (peek && peekImg) {
  let current: HTMLImageElement | null = null;
  let fromTop = false;
  let sway: gsap.core.Tween | null = null;
  let move: gsap.core.Timeline | null = null;

  const away = () => (fromTop ? -110 : 110);
  gsap.set(peek, { yPercent: 110 });

  /** Доля картины, видимая из-за края экрана */
  const visibleShare = () => {
    const h = peek.offsetHeight || 1;
    const shown = fromTop ? Math.min(heroEdge(), h) : Math.min(window.innerHeight * 0.24, h * 0.5);
    return Math.max(0, shown) / h;
  };
  const target = () => (fromTop ? -1 : 1) * (100 - visibleShare() * 100);

  const setSide = (top: boolean) => {
    fromTop = top;
    peek.classList.toggle("peek--top", top);
    // пока картина первого экрана опущена, шапке нужна подложка (Header.astro)
    document.documentElement.classList.toggle("hero-peek", top);
  };

  const startSway = () => {
    sway?.kill();
    if (reduced.matches) return;
    sway = gsap.to(peek, {
      rotation: gsap.utils.random(-5, 5) * (fromTop ? 0.4 : 1),
      xPercent: gsap.utils.random(-1, 1),
      duration: gsap.utils.random(1.3, 2.4),
      ease: "sine.inOut",
      onComplete: startSway,
    });
  };

  showPeek = (art: HTMLImageElement) => {
    const wasVisible = current !== null;
    const top = hero?.contains(art) ?? false;
    current = art;
    const swap = () => {
      if (top !== fromTop) {
        setSide(top);
        gsap.set(peek, { yPercent: away() });
      }
      peekImg.style.aspectRatio = art.dataset.artRatio ?? "";
      loadInto(peekImg, art, () => current === art);
    };
    if (!wasVisible) {
      setSide(top);
      gsap.set(peek, { yPercent: away() });
    }
    peek.style.visibility = "visible";
    move?.kill();
    move = gsap.timeline();
    if (wasVisible) move.to(peek, { yPercent: away, duration: fromTop ? 0.3 : 0.22, ease: "power2.in" });
    move.add(() => {
      swap();
      gsap.set(peek, { rotation: gsap.utils.random(-4, 4) * (fromTop ? 0.4 : 1) });
      startSway();
    });
    move.to(peek, {
      yPercent: target,
      duration: reduced.matches ? 0.01 : fromTop ? 1.1 : 0.8,
      ease: "expo.out",
    });
  };

  hidePeek = () => {
    if (!current) return;
    current = null;
    sway?.kill();
    move?.kill();
    move = gsap.timeline().to(peek, {
      yPercent: away(),
      rotation: 0,
      duration: reduced.matches ? 0.01 : 0.5,
      ease: "power3.in",
      onComplete: () => {
        if (current) return;
        peek.style.visibility = "hidden";
        document.documentElement.classList.remove("hero-peek");
      },
    });
  };

  // картина первого экрана едет вверх вместе с заголовком
  followPeek = () => {
    if (!fromTop || !current || move?.isActive()) return;
    gsap.set(peek, { yPercent: target() });
  };

  peekCurrent = () => current;
}

const clearHover = () => {
  setHovered(null);
  hidePeek();
};

const updateHover = () => {
  if (!canHover.matches || !viewer?.hidden) return clearHover();
  const el = pointerX < 0 ? null : document.elementFromPoint(pointerX, pointerY);
  let art = artFrom(el);
  if (art && hero?.contains(art) && art !== heroArt) {
    heroArt = art;
    const index = art.closest<HTMLElement>("[data-hero-big]")?.dataset.heroBig;
    window.dispatchEvent(new CustomEvent("hero:select", { detail: index }));
  }
  setHovered(art?.closest(".pt") ?? null);
  // курсор не на картине, а первый экран на месте — показываем выбранную на нём
  if (!art && heroActive()) art = heroArt;
  if (art && hero?.contains(art) && !heroActive()) art = null;
  if (art === peekCurrent()) return followPeek();
  art ? showPeek(art) : hidePeek();
};

let hoverFrame = 0;
const scheduleHover = () => {
  if (hoverFrame) return;
  hoverFrame = requestAnimationFrame(() => {
    hoverFrame = 0;
    updateHover();
  });
};

document.addEventListener("pointermove", (e) => {
  if (e.pointerType !== "mouse") return;
  pointerX = e.clientX;
  pointerY = e.clientY;
  scheduleHover();
});
window.addEventListener("scroll", scheduleHover, { passive: true });
window.addEventListener("resize", scheduleHover);
document.documentElement.addEventListener("pointerleave", () => {
  pointerX = pointerY = -1;
  scheduleHover();
});
window.addEventListener("blur", () => {
  pointerX = pointerY = -1;
  scheduleHover();
});
document.addEventListener("visibilitychange", () => document.hidden && clearHover());
window.addEventListener("art:open", clearHover);
window.addEventListener("art:close", scheduleHover);
// картина первого экрана опускается сама, когда проявился заголовок
window.setTimeout(scheduleHover, 700);

// ---------- Полноэкранный просмотр ----------
if (viewer && viewerImg) {
  const title = viewer.querySelector<HTMLElement>("[data-viewer-title]")!;
  const meta = viewer.querySelector<HTMLElement>("[data-viewer-meta]")!;
  const link = viewer.querySelector<HTMLAnchorElement>("[data-viewer-link]")!;
  const linkLabel = viewer.querySelector<HTMLElement>("[data-viewer-link-label]")!;
  const closeBtn = viewer.querySelector<HTMLButtonElement>("button[data-viewer-close]")!;
  const backdrop = viewer.querySelector<HTMLElement>(".viewer__backdrop")!;
  const caption = viewer.querySelector<HTMLElement>("[data-viewer-caption]")!;

  let source: HTMLImageElement | null = null;
  let lastFocus: HTMLElement | null = null;
  let busy = false;

  const fit = (ratio: number) => {
    const maxW = Math.min(window.innerWidth * 0.94, 1600);
    const maxH = window.innerHeight - 190;
    return Math.max(120, Math.min(maxW, maxH * ratio));
  };

  const flipFrom = (from: DOMRect) => {
    const to = viewerImg.getBoundingClientRect();
    return {
      x: from.left + from.width / 2 - (to.left + to.width / 2),
      y: from.top + from.height / 2 - (to.top + to.height / 2),
      scale: from.width / to.width,
    };
  };

  const open = (art: HTMLImageElement) => {
    if (busy) return;
    busy = true;
    source = art;
    lastFocus = document.activeElement as HTMLElement | null;
    window.dispatchEvent(new CustomEvent("art:open"));

    const ratio = Number(art.dataset.artRatio) || art.naturalWidth / art.naturalHeight || 1;
    title.textContent = art.dataset.artTitle ?? "";
    meta.textContent = art.dataset.artMeta ?? "";
    viewerImg.alt = art.alt || art.dataset.artTitle || "";
    link.hidden = !art.dataset.artHref;
    if (art.dataset.artHref) link.href = art.dataset.artHref;
    linkLabel.textContent = art.dataset.artHrefLabel ?? "View the work";
    viewerImg.style.aspectRatio = String(ratio);
    viewerImg.style.width = `${fit(ratio)}px`;
    loadInto(viewerImg, art, () => source === art);

    viewer.hidden = false;
    document.documentElement.classList.add("viewer-open");
    const from = flipFrom(art.getBoundingClientRect());
    const fast = reduced.matches;
    gsap
      .timeline({ onComplete: () => void (busy = false) })
      .fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: fast ? 0.01 : 0.45, ease: "power2.out" }, 0)
      .fromTo(
        viewerImg,
        fast ? { opacity: 0 } : { ...from, rotation: gsap.utils.random(-3, 3) },
        { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, duration: fast ? 0.2 : 0.85, ease: "expo.inOut" },
        0,
      )
      .fromTo([caption, closeBtn], { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.05 }, fast ? 0 : 0.55);
    closeBtn.focus({ preventScroll: true });
  };

  const close = () => {
    if (busy || viewer.hidden) return;
    busy = true;
    const src = source;
    const rect = src?.getBoundingClientRect();
    const onScreen = rect && rect.bottom > 0 && rect.top < window.innerHeight && rect.width > 0;
    const fast = reduced.matches;
    gsap
      .timeline({
        onComplete: () => {
          viewer.hidden = true;
          gsap.set([viewerImg, backdrop, caption, closeBtn], { clearProps: "all" });
          viewerImg.style.aspectRatio = "";
          document.documentElement.classList.remove("viewer-open");
          window.dispatchEvent(new CustomEvent("art:close"));
          busy = false;
          source = null;
          lastFocus?.focus({ preventScroll: true });
        },
      })
      .to([caption, closeBtn], { opacity: 0, duration: 0.2 }, 0)
      .to(
        viewerImg,
        !fast && onScreen && rect ? { ...flipFrom(rect), duration: 0.7, ease: "expo.inOut" } : { opacity: 0, duration: 0.3 },
        0,
      )
      .to(backdrop, { opacity: 0, duration: fast ? 0.01 : 0.45, ease: "power2.in" }, fast ? 0 : 0.3);
  };

  document.addEventListener("click", (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    // на тач-экране тап по миниатюре первого экрана просто выбирает картину (Hero.astro)
    if (!canHover.matches && e.target instanceof Element && e.target.closest("[data-hero-pick]")) return;
    const art = artFrom(e.target);
    if (!art) return;
    e.preventDefault(); // клик по картине открывает её, а не ссылку карточки
    open(art);
  });

  viewer.querySelectorAll("[data-viewer-close]").forEach((el) => el.addEventListener("click", close));

  viewer.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
    if (e.key === "Tab") {
      const items = [link, closeBtn].filter((el) => !el.hidden);
      const i = items.indexOf(document.activeElement as HTMLAnchorElement & HTMLButtonElement);
      e.preventDefault();
      items[(i + (e.shiftKey ? -1 : 1) + items.length) % items.length]?.focus();
    }
  });

  window.addEventListener("resize", () => {
    if (!viewer.hidden && source) {
      viewerImg.style.width = `${fit(Number(source.dataset.artRatio) || 1)}px`;
    }
  });
}
