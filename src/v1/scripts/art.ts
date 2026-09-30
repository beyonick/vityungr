// Картины: при наведении выезжают снизу краем на всю ширину экрана (под плавающим углом),
// по клику открываются на весь экран.
import { gsap } from "gsap";

const peek = document.querySelector<HTMLElement>("[data-peek]");
const peekImg = document.querySelector<HTMLImageElement>("[data-peek-img]");
const viewer = document.querySelector<HTMLElement>("[data-viewer]");
const viewerImg = document.querySelector<HTMLImageElement>("[data-viewer-img]");
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
const canHover = window.matchMedia("(hover: hover) and (pointer: fine)");

/** Картина под курсором: сама картинка или любая точка её панели / куска коллажа */
function artFrom(target: EventTarget | null): HTMLImageElement | null {
  if (!(target instanceof Element)) return null;
  if (viewer?.contains(target)) return null;
  const direct = target.closest<HTMLImageElement>("img[data-art]");
  if (direct) return direct;
  return target.closest(".board, [data-piece]")?.querySelector<HTMLImageElement>("img[data-art]") ?? null;
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

// ---------- Выезд снизу ----------
if (peek && peekImg) {
  let current: HTMLImageElement | null = null;
  let sway: gsap.core.Tween | null = null;
  let move: gsap.core.Timeline | null = null;

  gsap.set(peek, { yPercent: 110 });

  const visibleShare = () => {
    const h = peek.offsetHeight || 1;
    return Math.min(window.innerHeight * 0.24, h * 0.5) / h; // доля картины над краем экрана
  };

  const startSway = () => {
    sway?.kill();
    if (reduced.matches) return;
    sway = gsap.to(peek, {
      rotation: gsap.utils.random(-5, 5),
      xPercent: gsap.utils.random(-1, 1),
      duration: gsap.utils.random(1.3, 2.4),
      ease: "sine.inOut",
      onComplete: startSway,
    });
  };

  const show = (art: HTMLImageElement) => {
    const wasVisible = current !== null;
    current = art;
    const swap = () => {
      peekImg.style.aspectRatio = art.dataset.artRatio ?? "";
      loadInto(peekImg, art, () => current === art);
    };
    peek.style.visibility = "visible";
    move?.kill();
    move = gsap.timeline();
    if (wasVisible) move.to(peek, { yPercent: 110, duration: 0.22, ease: "power2.in" });
    move.add(() => {
      swap();
      gsap.set(peek, { rotation: gsap.utils.random(-4, 4) });
      startSway();
    });
    move.to(peek, {
      yPercent: () => 100 - visibleShare() * 100,
      duration: reduced.matches ? 0.01 : 0.8,
      ease: "expo.out",
    });
  };

  const hide = () => {
    if (!current) return;
    current = null;
    sway?.kill();
    move?.kill();
    move = gsap.timeline().to(peek, {
      yPercent: 110,
      rotation: 0,
      duration: reduced.matches ? 0.01 : 0.5,
      ease: "power3.in",
      onComplete: () => {
        if (!current) peek.style.visibility = "hidden";
      },
    });
  };

  document.addEventListener("pointerover", (e) => {
    if (e.pointerType !== "mouse" || !canHover.matches || !viewer?.hidden) return;
    const art = artFrom(e.target);
    if (art === current) return;
    art ? show(art) : hide();
  });
  document.documentElement.addEventListener("pointerleave", hide);
  window.addEventListener("blur", hide);
  document.addEventListener("visibilitychange", () => document.hidden && hide());
  window.addEventListener("art:open", hide);
}

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
