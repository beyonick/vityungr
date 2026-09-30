// Движение сайта: Lenis (единственный smooth-scroll) + GSAP/ScrollTrigger.
// Идея: пейзаж «воздушный, будто на него можно подуть — и всё разлетится».
// Картины в hero выдуваются из центра, покачиваются и разлетаются при скролле.
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

declare global {
  interface Window {
    __motionFallback?: number;
  }
}

gsap.registerPlugin(ScrollTrigger);

const root = document.documentElement;
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Разбивает простой текстовый заголовок на слова. Читалки видят исходный текст целиком. */
function splitWords(el: HTMLElement): HTMLElement[] {
  if (el.dataset.splitDone) return Array.from(el.querySelectorAll<HTMLElement>(".split-word"));
  const text = (el.textContent ?? "").trim().replace(/\s+/g, " ");
  const sr = document.createElement("span");
  sr.className = "sr-only";
  sr.textContent = text;
  const visual = document.createElement("span");
  visual.setAttribute("aria-hidden", "true");
  const words = text.split(" ");
  words.forEach((w, i) => {
    const line = document.createElement("span");
    line.className = "split-line";
    const word = document.createElement("span");
    word.className = "split-word";
    word.textContent = w;
    line.append(word);
    visual.append(line);
    if (i < words.length - 1) visual.append(" ");
  });
  el.replaceChildren(sr, visual);
  el.dataset.splitDone = "1";
  return Array.from(visual.querySelectorAll<HTMLElement>(".split-word"));
}

function initMotion() {
  const cleanups: Array<() => void> = [];

  // ---------- Smooth scroll ----------
  const lenis = new Lenis({ autoRaf: false, anchors: { offset: -72 }, lerp: 0.11 });
  lenis.on("scroll", ScrollTrigger.update);
  const raf = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);
  // Полноэкранный просмотр картины (scripts/art.ts) останавливает скролл
  const lock = () => lenis.stop();
  const unlock = () => lenis.start();
  window.addEventListener("art:open", lock);
  window.addEventListener("art:close", unlock);
  cleanups.push(() => {
    window.removeEventListener("art:open", lock);
    window.removeEventListener("art:close", unlock);
    gsap.ticker.remove(raf);
    lenis.destroy();
  });

  // ---------- Hero ----------
  const hero = document.querySelector<HTMLElement>("[data-hero]");
  const stage = document.querySelector<HTMLElement>("[data-hero-stage]");
  const pieces = Array.from(document.querySelectorAll<HTMLElement>("[data-piece]")).filter(
    (p) => getComputedStyle(p).display !== "none",
  );
  const floats: gsap.core.Tween[] = [];

  if (hero && stage) {
    const title = hero.querySelector<HTMLElement>('[data-split="hero"]');
    const words = title ? splitWords(title) : [];
    if (title) title.style.visibility = "visible";
    const stageBox = stage.getBoundingClientRect();
    const cx = stageBox.left + stageBox.width / 2;
    const cy = stageBox.top + stageBox.height / 2;

    const intro = gsap.timeline({ defaults: { ease: "expo.out" } });
    if (words.length) intro.from(words, { yPercent: 115, duration: 1.3, stagger: 0.06 }, 0.1);

    pieces.forEach((piece) => {
      const inner = piece.querySelector<HTMLElement>("[data-piece-inner]")!;
      const box = piece.getBoundingClientRect();
      const px = box.left + box.width / 2;
      const py = box.top + box.height / 2;
      intro.fromTo(
        inner,
        {
          x: (cx - px) * 0.8,
          y: (cy - py) * 0.8,
          scale: 0.3,
          rotation: gsap.utils.random(-12, 12),
          opacity: 0,
          filter: "blur(6px)",
        },
        {
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
          opacity: 1,
          filter: "blur(0px)",
          duration: 1.9,
          clearProps: "filter",
          onComplete: () => {
            floats.push(
              gsap.to(inner, {
                y: gsap.utils.random(-9, 9),
                rotation: gsap.utils.random(-0.9, 0.9),
                duration: gsap.utils.random(3.2, 5.2),
                ease: "sine.inOut",
                yoyo: true,
                repeat: -1,
              }),
            );
          },
        },
        0.2 + Math.random() * 0.35,
      );
    });

    // Параллакс за курсором — только для мыши
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (finePointer.matches) {
      const movers = pieces.map((p) => {
        const el = p.querySelector<HTMLElement>("[data-piece-pointer]")!;
        const depth = Number(p.dataset.depth ?? 1);
        return {
          depth,
          x: gsap.quickTo(el, "x", { duration: 1.1, ease: "power3.out" }),
          y: gsap.quickTo(el, "y", { duration: 1.1, ease: "power3.out" }),
        };
      });
      let frame = 0;
      const onMove = (e: PointerEvent) => {
        if (e.pointerType !== "mouse" || frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          const nx = e.clientX / window.innerWidth - 0.5;
          const ny = e.clientY / window.innerHeight - 0.5;
          movers.forEach((m) => {
            m.x(-nx * 30 * m.depth);
            m.y(-ny * 22 * m.depth);
          });
        });
      };
      const reset = () => movers.forEach((m) => (m.x(0), m.y(0)));
      const onVisibility = () => document.hidden && reset();
      stage.addEventListener("pointermove", onMove);
      stage.addEventListener("pointerleave", reset);
      window.addEventListener("blur", reset);
      document.addEventListener("visibilitychange", onVisibility);
      cleanups.push(() => {
        stage.removeEventListener("pointermove", onMove);
        stage.removeEventListener("pointerleave", reset);
        window.removeEventListener("blur", reset);
        document.removeEventListener("visibilitychange", onVisibility);
        cancelAnimationFrame(frame);
      });
    }

    // Разлёт при скролле (десктоп): как будто на пейзаж подули
    const mm = gsap.matchMedia();
    mm.add("(min-width: 760px)", () => {
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: "+=55%",
          scrub: 0.9,
          pin: stage,
          anticipatePin: 1,
          onLeave: () => floats.forEach((t) => t.pause()),
          onEnterBack: () => floats.forEach((t) => t.resume()),
        },
      });
      const box = stage.getBoundingClientRect();
      pieces.forEach((piece) => {
        const scatter = piece.querySelector<HTMLElement>("[data-piece-scatter]")!;
        const depth = Number(piece.dataset.depth ?? 1);
        const r = piece.getBoundingClientRect();
        const dx = r.left + r.width / 2 - (box.left + box.width / 2);
        const dy = r.top + r.height / 2 - (box.top + box.height / 2);
        // улетают наружу, за края экрана — а не гаснут на месте
        tl.to(
          scatter,
          {
            x: dx * 1.25 * depth,
            y: dy * 1.1 * depth - 120 * depth,
            scale: 1 + 0.18 * depth,
            rotation: gsap.utils.random(-10, 10),
            ease: "power1.in",
          },
          0,
        );
      });
      const copy = hero.querySelector("[data-hero-copy]");
      if (copy) tl.to(copy, { y: -60, opacity: 0, ease: "power1.in", duration: 0.5 }, 0.5);
      tl.to(hero.querySelectorAll(".hero__side"), { opacity: 0, duration: 0.3 }, 0.2);
    });
    cleanups.push(() => mm.revert());
  }

  // ---------- Появление секций ----------
  document.querySelectorAll<HTMLElement>("[data-split]:not([data-split='hero'])").forEach((el) => {
    const words = splitWords(el);
    gsap.from(words, {
      yPercent: 115,
      duration: 1.1,
      stagger: 0.045,
      ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
    });
  });

  document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
    gsap.from(el, {
      y: 26,
      opacity: 0,
      duration: 1.1,
      ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top 90%", once: true },
    });
  });

  const cards = gsap.utils.toArray<HTMLElement>("[data-reveal-card]");
  gsap.set(cards, { y: 44, opacity: 0 });
  ScrollTrigger.batch(cards, {
    start: "top 92%",
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, { y: 0, opacity: 1, duration: 1.1, stagger: 0.08, ease: "expo.out", overwrite: true }),
  });

  // Пересчёт после шрифтов и картинок
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  const onLoad = () => ScrollTrigger.refresh();
  window.addEventListener("load", onLoad, { once: true });

  cleanups.push(() => {
    window.removeEventListener("load", onLoad);
    floats.forEach((t) => t.kill());
    ScrollTrigger.getAll().forEach((t) => t.kill());
    gsap.killTweensOf("*");
  });

  // Страница из bfcache возвращается уже живой — чистим только при настоящей выгрузке
  window.addEventListener("pagehide", (e) => {
    if (!e.persisted) cleanups.reverse().forEach((fn) => fn());
  });
}

if (reduced) {
  // Без анимаций: финальные состояния, нативный скролл
  window.clearTimeout(window.__motionFallback);
  root.classList.add("motion-fallback");
} else {
  try {
    initMotion();
    window.clearTimeout(window.__motionFallback);
  } catch (err) {
    root.classList.add("motion-fallback");
    console.error(err);
  }
}
