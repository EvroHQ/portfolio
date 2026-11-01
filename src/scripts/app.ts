import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { navigate } from "astro:transitions/client";
import {
  createEngine,
  lowTier,
  reduceMotion as reduce,
  type Engine,
} from "./gl/engine";
import { Matter, STATES, type Weights } from "./gl/particles";
import { Gallery } from "./gl/gallery";
import { Backdrop } from "./gl/backdrop";

gsap.registerPlugin(ScrollTrigger);
// mobile: don't recompute every trigger when the address bar shows/hides
ScrollTrigger.config({ ignoreMobileResize: true });

const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
const EASE = "expo.out";
const root = document.documentElement;

/* ---------- once per session ---------- */

const engine: Engine | null = createEngine(
  document.getElementById("gl") as HTMLCanvasElement,
);
let matter: Matter | null = null;
let backdrop: Backdrop | null = null;
const matterReady: Promise<Matter | null> = (async () => {
  if (!engine) {
    root.classList.add("no-gl");
    return null;
  }
  try {
    await Promise.all([
      document.fonts.load('600 100px "Geist Variable"'),
      document.fonts.load("700 100px Syne"),
      document.fonts.load('500 20px "Geist Mono Variable"'),
    ]);
  } catch {
    /* fall back to whatever loaded */
  }
  try {
    backdrop = new Backdrop(engine);
    matter = new Matter(engine, ["CHRISTOPHE", "KIRKOUSSIS"]);
  } catch (e) {
    console.warn("[gl]", e);
    root.classList.add("no-gl");
    return null;
  }
  root.classList.add("gl-on");
  gsap.ticker.add(renderTick);
  return matter;
})();

let firstLoad = true;
// render inside GSAP's ticker, always after Lenis: planes read the DOM after it has moved this frame
const renderTick = () => {
  if (engine && matter && !document.hidden) engine.render();
};
let lenis: Lenis | null = null;
let gallery: Gallery | null = null;
let closeMenu: (() => void) | null = null;

// custom cursor
const cursor = document.querySelector<HTMLElement>(".cursor");
if (cursor && fine && !reduce && innerWidth >= 1024) {
  root.classList.add("has-cursor");
  const dot = cursor.querySelector<HTMLElement>(".cursor__dot")!;
  const ring = cursor.querySelector<HTMLElement>(".cursor__ring")!;
  let mx = innerWidth / 2,
    my = innerHeight / 2,
    rx = mx,
    ry = my;
  addEventListener(
    "pointermove",
    (e) => {
      mx = e.clientX;
      my = e.clientY;
    },
    { passive: true },
  );
  gsap.ticker.add(() => {
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
  });
  document.addEventListener("pointerover", (e) => {
    const t = e.target as Element;
    const view = !!t.closest("[data-slide-link], [data-reel-slide]");
    cursor.classList.toggle("is-view", view);
    cursor.classList.toggle("is-link", !view && !!t.closest("a, button"));
  });
}

// same-page anchors go through Lenis (runs before the router's click handler)
addEventListener(
  "click",
  (e) => {
    const a = (e.target as Element).closest?.(
      'a[href*="#"]',
    ) as HTMLAnchorElement | null;
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const url = new URL(a.href, location.href);
    if (
      url.pathname.replace(/\/$/, "") !==
        location.pathname.replace(/\/$/, "") ||
      !url.hash
    )
      return;
    const target =
      url.hash === "#top" ? 0 : document.querySelector<HTMLElement>(url.hash);
    if (target === null) return;
    e.preventDefault();
    closeMenu?.();
    if (lenis) lenis.scrollTo(target, { duration: 1.8 });
    else if (target === 0) scrollTo({ top: 0 });
    else target.scrollIntoView();
  },
  { capture: true },
);

/* ---------- helpers ---------- */

function splitWords(el: HTMLElement) {
  if (el.dataset.splitDone)
    return [...el.querySelectorAll<HTMLElement>(".sw-i")];
  el.dataset.splitDone = "1";
  el.setAttribute("aria-label", el.textContent!.replace(/\s+/g, " ").trim());
  const walk = (node: Node) =>
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === Node.ELEMENT_NODE) {
        if ((n as Element).tagName !== "BR") walk(n);
        return;
      }
      if (n.nodeType !== Node.TEXT_NODE) return;
      const frag = document.createDocumentFragment();
      // split on regular whitespace only, so non-breaking spaces keep words together
      n.textContent!.split(/([ \t\n\r]+)/).forEach((part) => {
        if (!part) return;
        if (/^[ \t\n\r]+$/.test(part)) {
          frag.append(" ");
          return;
        }
        const o = document.createElement("span");
        o.className = "sw-o";
        o.setAttribute("aria-hidden", "true");
        const i = document.createElement("span");
        i.className = "sw-i";
        i.textContent = part;
        o.append(i);
        frag.append(o);
      });
      n.replaceWith(frag);
    });
  walk(el);
  return [...el.querySelectorAll<HTMLElement>(".sw-i")];
}

const GLYPHS = "!<>-_\\/[]{}—=+*^?#01";
function scramble(
  el: HTMLElement,
  text = el.dataset.text || el.textContent || "",
  dur = 0.7,
) {
  el.dataset.text = text;
  if (reduce) {
    el.textContent = text;
    return;
  }
  const t0 = performance.now();
  const tick = () => {
    const p = Math.min(1, (performance.now() - t0) / (dur * 1000));
    const n = Math.floor(p * text.length);
    el.textContent =
      text.slice(0, n) +
      [...text.slice(n)]
        .map((c) =>
          c === " " ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0],
        )
        .join("");
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = text;
  };
  tick();
}

function magnetic(el: HTMLElement, abort: AbortSignal, strength = 0.32) {
  if (!fine || reduce) return;
  const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3.out" });
  const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3.out" });
  el.addEventListener(
    "pointermove",
    (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * strength);
      yTo((e.clientY - r.top - r.height / 2) * strength);
    },
    { signal: abort },
  );
  el.addEventListener(
    "pointerleave",
    () => {
      xTo(0);
      yTo(0);
    },
    { signal: abort },
  );
}

const mix = (a: Weights, b: Weights, t: number): Weights =>
  [0, 1, 2, 3].map((i) => a[i] + (b[i] - a[i]) * t) as Weights;

/* ---------- per page ---------- */

let cleanup: (() => void)[] = [];

async function initPage() {
  const ac = new AbortController();
  const abort = ac.signal;
  cleanup.push(() => ac.abort());
  const page = root.dataset.page;

  if (!reduce && fine) {
    lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis?.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    gsap.ticker.remove(renderTick);
    gsap.ticker.add(renderTick);
    cleanup.push(() => {
      gsap.ticker.remove(raf);
      lenis?.destroy();
      lenis = null;
    });
  }

  // clock
  const clock = document.querySelector<HTMLTimeElement>("[data-clock]");
  if (clock) {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Brussels",
    });
    const tick = () => {
      clock.textContent = fmt.format(new Date());
    };
    tick();
    const id = setInterval(tick, 15000);
    cleanup.push(() => clearInterval(id));
  }

  // mobile menu
  const burger = document.querySelector<HTMLButtonElement>("[data-burger]");
  const menu = document.querySelector<HTMLElement>("[data-menu]");
  if (burger && menu) {
    const set = (open: boolean) => {
      burger.setAttribute("aria-expanded", String(open));
      if (open) {
        menu.hidden = false;
        requestAnimationFrame(() => menu.classList.add("is-open"));
        lenis?.stop();
        root.classList.add("is-locked");
      } else {
        menu.classList.remove("is-open");
        lenis?.start();
        root.classList.remove("is-locked");
        setTimeout(() => {
          if (!menu.classList.contains("is-open")) menu.hidden = true;
        }, 600);
      }
    };
    closeMenu = () => set(false);
    burger.addEventListener(
      "click",
      () => set(burger.getAttribute("aria-expanded") !== "true"),
      { signal: abort },
    );
    menu
      .querySelectorAll("[data-menu-link]")
      .forEach((a) =>
        a.addEventListener("click", () => set(false), { signal: abort }),
      );
    addEventListener(
      "keydown",
      (e) => {
        if (e.key === "Escape") set(false);
      },
      { signal: abort },
    );
    addEventListener(
      "resize",
      () => {
        if (innerWidth >= 768) set(false);
      },
      { signal: abort },
    );
  }

  // the logo talks to the matter: hovering it sends a shockwave from where it sits
  const brand = document.querySelector<HTMLElement>("[data-brand] .nav__mark");
  brand?.closest("a")?.addEventListener(
    "pointerenter",
    () => {
      if (!matter || !engine || reduce) return;
      const r = brand.getBoundingClientRect();
      matter.ripple(
        r.left + r.width / 2 - engine.w / 2,
        engine.h / 2 - r.top - r.height / 2,
        1.8,
      );
      matter.target.heat = Math.max(matter.target.heat, 0.5);
      gsap.delayedCall(0.35, () => {
        if (matter) matter.target.heat = 0;
      });
    },
    { signal: abort },
  );

  // micro-interactions
  // strength per element: data-magnetic="0.06" for big targets, default for buttons
  document
    .querySelectorAll<HTMLElement>("[data-magnetic], .pill")
    .forEach((el) =>
      magnetic(el, abort, parseFloat(el.dataset.magnetic || "") || 0.25),
    );
  document.querySelectorAll<HTMLElement>("[data-scramble]").forEach((el) => {
    el.dataset.text = el.textContent || "";
    ScrollTrigger.create({
      trigger: el,
      start: "top 90%",
      once: true,
      onEnter: () => scramble(el),
    });
  });
  document
    .querySelectorAll<HTMLElement>("[data-scramble-hover]")
    .forEach((el) => {
      el.dataset.text = el.textContent || "";
      el.closest("a")?.addEventListener(
        "pointerenter",
        () => scramble(el, undefined, 0.45),
        { signal: abort },
      );
    });

  // headings: masked word rise
  document.querySelectorAll<HTMLElement>("[data-split]").forEach((el) => {
    const words = splitWords(el);
    if (reduce) return;
    gsap.set(words, { yPercent: 115, rotate: 4 });
    ScrollTrigger.create({
      trigger: el,
      start: "top 88%",
      once: true,
      onEnter: () =>
        gsap.to(words, {
          yPercent: 0,
          rotate: 0,
          duration: 1.3,
          ease: EASE,
          stagger: 0.06,
          delay: page === "case" ? 0.25 : 0,
        }),
    });
  });

  // letter roll ([data-roll]): on each line the wave starts at the letter under the cursor and spreads to both sides
  if (fine && !reduce)
    document.querySelectorAll<HTMLElement>("[data-roll]").forEach((el) => {
      const lines = [...el.querySelectorAll<HTMLElement>(".roll")].map((l) => [
        ...l.querySelectorAll<HTMLElement>("[data-roll-c]"),
      ]);
      const step = parseFloat(el.dataset.rollStep || "0.035"); // seconds between two letters of the wave
      el.addEventListener(
        "pointerenter",
        (e) => {
          lines.forEach((letters) => {
            const xs = letters.map((l) => {
              const r = l.getBoundingClientRect();
              return r.left + r.width / 2;
            });
            const origin = xs.reduce(
              (best, x, i) =>
                Math.abs(x - e.clientX) < Math.abs(xs[best] - e.clientX)
                  ? i
                  : best,
              0,
            );
            letters.forEach((l, i) =>
              l.style.setProperty("--d", `${Math.abs(i - origin) * step}s`),
            );
          });
        },
        { signal: abort },
      );
    });

  // back to top: on hover the arrow takes off like a plane, climbs to the top of the window
  // leaving an ember contrail, and a fresh arrow lands back in its place
  const topArrow = document.querySelector<HTMLElement>("[data-top-arrow]");
  if (topArrow && fine && !reduce) {
    let flying = false;
    topArrow.closest("a")!.addEventListener(
      "pointerenter",
      () => {
        if (flying) return;
        flying = true;
        const r = topArrow.getBoundingClientRect();
        const dist = r.bottom + 24;
        const plane = topArrow.cloneNode(true) as HTMLElement;
        Object.assign(plane.style, {
          position: "fixed",
          left: `${r.left}px`,
          top: `${r.top}px`,
          margin: "0",
          zIndex: "90",
          pointerEvents: "none",
          color: "var(--ember)",
        });
        const trail = document.createElement("span");
        Object.assign(trail.style, {
          position: "fixed",
          left: `${r.left + r.width / 2 - 0.5}px`,
          top: `${r.bottom}px`,
          width: "1px",
          height: "0px",
          zIndex: "89",
          pointerEvents: "none",
          background: "linear-gradient(to bottom, var(--ember), transparent)",
        });
        document.body.append(trail, plane);
        gsap.set(topArrow, { opacity: 0 });
        gsap
          .timeline({
            onComplete: () => {
              plane.remove();
              trail.remove();
              gsap.fromTo(
                topArrow,
                { opacity: 0, y: 10 },
                {
                  opacity: 1,
                  y: 0,
                  duration: 0.5,
                  ease: "power3.out",
                  onComplete: () => {
                    flying = false;
                  },
                },
              );
            },
          })
          .to(plane, { y: -dist, duration: 1.1, ease: "power2.in" }, 0)
          .to(
            plane,
            {
              keyframes: [
                { x: -3, rotate: -8, duration: 0.3 },
                { x: 3, rotate: 6, duration: 0.4 },
                { x: 0, rotate: 0, duration: 0.4 },
              ],
            },
            0,
          )
          .to(
            trail,
            { height: dist, y: -dist, duration: 1.1, ease: "power2.in" },
            0,
          )
          .to(trail, { opacity: 0, duration: 0.6, ease: "power1.out" }, 0.6);
      },
      { signal: abort },
    );
  }

  // roll headings that also rise in on scroll: the letters come up through their line window,
  // then the transform is handed back to the hover CSS
  if (!reduce)
    document.querySelectorAll<HTMLElement>("[data-roll-rise]").forEach((el) => {
      const faces = [
        ...el.querySelectorAll<HTMLElement>(".roll__c > span:first-child"),
      ];
      gsap.set(faces, { yPercent: 100 });
      ScrollTrigger.create({
        trigger: el,
        start: "top 88%",
        once: true,
        onEnter: () =>
          gsap.to(faces, {
            yPercent: 0,
            duration: 1.1,
            ease: EASE,
            stagger: 0.025,
            onComplete: () => gsap.set(faces, { clearProps: "transform" }),
          }),
      });
    });

  // generic reveals
  if (!reduce && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.remove("pre");
            io.unobserve(en.target);
          }
        }),
      { threshold: 0.15 },
    );
    document.querySelectorAll<HTMLElement>(".reveal").forEach((el) => {
      if (el.getBoundingClientRect().top < innerHeight * 0.95) return;
      el.classList.add("pre");
      io.observe(el);
    });
    cleanup.push(() => io.disconnect());
  }

  // read-along paragraphs
  document
    .querySelectorAll<HTMLElement>("[data-scroll-reveal]")
    .forEach((el) => {
      const words = splitWords(el);
      el.querySelectorAll<HTMLElement>(".sw-o").forEach(
        (o) => (o.style.overflow = "visible"),
      );
      if (reduce) return;
      const N = words.length;
      gsap.set(words, { opacity: 0.12 });
      ScrollTrigger.create({
        trigger: el.closest(".about") || el,
        start: el.closest(".about") ? "top top" : "top 80%",
        end: el.closest(".about") ? "center center" : "bottom 50%",
        scrub: true,
        onUpdate: ({ progress: p }) =>
          words.forEach((w, i) => {
            const t = Math.min(1, Math.max(0, (p - (i / N - 0.06)) / 0.1));
            w.style.opacity = (0.12 + 0.88 * t).toFixed(3);
          }),
      });
    });

  // copy email
  document.querySelectorAll<HTMLButtonElement>("[data-copy]").forEach((b) =>
    b.addEventListener(
      "click",
      async () => {
        const label = b.querySelector<HTMLElement>("[data-copy-label]")!;
        try {
          await navigator.clipboard.writeText(b.dataset.copy!);
          scramble(label, "Copied", 0.4);
        } catch {
          label.textContent = "Ctrl+C";
        }
        setTimeout(() => scramble(label, "Copy", 0.4), 1800);
      },
      { signal: abort },
    ),
  );

  const m = await matterReady;
  if (page === "home") await initHome(m, abort);
  else if (m) {
    gsap.set(m.material.uniforms.uAssemble, { value: 1 });
    m.target.w = [...STATES.dust];
    m.target.explode = 0;
    m.target.alpha = page === "error" ? 1 : 0.45;
    m.target.heat = page === "error" ? 0.6 : 0;
  }
  if (backdrop && page !== "home")
    backdrop.target =
      page === "error"
        ? { smoke: 1, glow: 0.8, ember: 1 }
        : { smoke: 0.6, glow: 0, ember: 0 };
  if (page === "case") initCase();
  if (page === "error")
    document.querySelector('[data-section="lost"]')?.addEventListener(
      "click",
      (e) => {
        if (!m || !engine) return;
        const ev = e as MouseEvent;
        m.drop(ev.clientX - engine.w / 2, engine.h / 2 - ev.clientY);
      },
      { signal: abort },
    );

  firstLoad = false;
  requestAnimationFrame(() => ScrollTrigger.refresh());
}

async function runLoader(m: Matter | null) {
  const loader = document.querySelector<HTMLElement>("[data-loader]");
  if (!loader) return;
  if (!firstLoad || reduce) {
    loader.remove();
    return;
  }
  const count = loader.querySelector<HTMLElement>("[data-loader-count]")!;
  const bar = loader.querySelector<HTMLElement>("[data-loader-bar]")!;
  const stage = loader.querySelector<HTMLElement>("[data-loader-stage]");
  const STAGES = [
    "Warming up the desk",
    "Patching the signal chain",
    "Gain staging",
    "Cueing the drop",
  ];
  const state = { v: 0 };
  await gsap.to(state, {
    v: 100,
    duration: 1.6,
    ease: "power2.inOut",
    onUpdate: () => {
      count.textContent = String(Math.round(state.v)).padStart(3, "0");
      bar.style.transform = `scaleX(${state.v / 100})`;
      const s = STAGES[Math.min(STAGES.length - 1, Math.floor(state.v / 25))];
      if (stage && stage.textContent !== s) stage.textContent = s;
    },
  });
  loader.classList.add("is-done");
  setTimeout(() => loader.remove(), 900);
  if (m) m.assemble(1.9);
}

async function initHome(m: Matter | null, abort: AbortSignal) {
  const intro = document.querySelector<HTMLElement>("[data-intro]");
  const fades = [...document.querySelectorAll<HTMLElement>("[data-hero-fade]")];
  if (m) {
    m.target.w = [...STATES.name];
    m.target.alpha = 1;
    if (!firstLoad) m.material.uniforms.uAssemble.value = 1;
  }
  await runLoader(m);
  if (intro) intro.dataset.intro = "running";
  if (!reduce)
    gsap.fromTo(
      fades,
      { opacity: 0, y: 14 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: EASE,
        stagger: 0.08,
        delay: firstLoad ? 0.9 : 0.1,
        onComplete: () => {
          if (intro) intro.dataset.intro = "done";
          gsap.set(fades, { clearProps: "all" });
        },
      },
    );
  else if (intro) intro.dataset.intro = "done";

  // HOLD TO CHARGE: press anywhere in the hero, the name heats up; release sends a shockwave
  // whose strength follows how long you held (full charge in 1.4s)
  const hero = document.querySelector<HTMLElement>(".hero");
  const dropBtn = document.querySelector<HTMLElement>("[data-drop]");
  if (hero && m && engine) {
    const FULL = 1400;
    let charging = false,
      t0 = 0,
      px = 0,
      py = 0,
      raf = 0;
    const level = () => Math.min(1, (performance.now() - t0) / FULL);
    const show = (c: number) => {
      hero.style.setProperty("--charge", c.toFixed(3));
      cursor?.style.setProperty("--charge", c.toFixed(3));
    };
    const tick = () => {
      if (!charging) return;
      const c = level();
      m.target.heat = c * 0.85;
      show(c);
      raf = requestAnimationFrame(tick);
    };
    const start = (x: number, y: number) => {
      if (charging) return;
      charging = true;
      t0 = performance.now();
      px = x;
      py = y;
      cursor?.classList.add("is-charging");
      hero.classList.add("is-charging");
      tick();
    };
    const release = () => {
      if (!charging) return;
      charging = false;
      cancelAnimationFrame(raf);
      const c = level();
      m.drop(px, py, 0.7 + c * 2.6);
      m.target.heat = 0.35 + c * 0.6;
      gsap.delayedCall(0.3, () => (m.target.heat = 0));
      cursor?.classList.remove("is-charging");
      hero.classList.remove("is-charging");
      gsap.to(
        { c },
        {
          c: 0,
          duration: 0.5,
          ease: "power2.out",
          onUpdate() {
            show(this.targets()[0].c);
          },
        },
      );
    };
    const toWorld = (e: PointerEvent) =>
      [e.clientX - engine.w / 2, engine.h / 2 - e.clientY] as const;
    hero.addEventListener(
      "pointerdown",
      (e) => {
        if (e.button !== 0 || (e.target as Element).closest("a")) return;
        const onBtn = (e.target as Element).closest("[data-drop]");
        const [x, y] = onBtn ? [0, engine.h * 0.03] : toWorld(e);
        hero.setPointerCapture(e.pointerId);
        start(x, y);
      },
      { signal: abort },
    );
    hero.addEventListener(
      "pointermove",
      (e) => {
        if (charging && !(e.target as Element).closest("[data-drop]"))
          [px, py] = toWorld(e);
      },
      { signal: abort },
    );
    hero.addEventListener("pointerup", release, { signal: abort });
    hero.addEventListener("pointercancel", release, { signal: abort });
    // keyboard: hold Space/Enter on the button
    dropBtn?.addEventListener(
      "keydown",
      (e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          start(0, engine.h * 0.03);
        }
      },
      { signal: abort },
    );
    dropBtn?.addEventListener(
      "keyup",
      (e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          release();
        }
      },
      { signal: abort },
    );
  }

  // the pinned reel first: triggers below it are measured with its pin spacing
  initWork(m, abort);
  if (!m) return;

  // matter choreography: name → code editor → dust → ember dust → monogram
  const prog = { a: 0, w: 0, s: 0, c: 0 };
  const compose = () => {
    let w: Weights = [...STATES.name];
    w = mix(w, STATES.editor, prog.a);
    w = mix(w, STATES.dust, prog.w);
    w = mix(w, STATES.mono, prog.c);
    m.target.w = w;
    m.target.explode =
      Math.max(
        Math.sin(Math.PI * prog.a),
        Math.sin(Math.PI * prog.w),
        Math.sin(Math.PI * prog.c),
      ) * 0.95;
    const inWork = prog.w * (1 - prog.c);
    // on narrow screens the mark sits behind text: keep it faint
    m.target.alpha =
      (1 - inWork * 0.45) * (innerWidth < 1024 ? 1 - prog.c * 0.6 : 1);
    m.target.heat = prog.s * (1 - prog.c) * 0.55;
    // the background follows the story: calm behind the reel, ember in the toolchain, a glow rising at the end
    if (backdrop)
      backdrop.target = {
        smoke: 1 - inWork * 0.55,
        glow: prog.c,
        ember: prog.s * (1 - prog.c),
      };
  };
  const scrub = (
    trigger: string,
    key: keyof typeof prog,
    start: string,
    end: string,
  ) =>
    ScrollTrigger.create({
      trigger,
      start,
      end,
      scrub: true,
      onUpdate: (s) => {
        prog[key] = s.progress;
        compose();
      },
    });
  scrub("#about", "a", "top 85%", "top top");
  scrub("#work", "w", "top 95%", "top top");
  scrub("#skills", "s", "top 80%", "top 20%");
  scrub("#contact", "c", "top 90%", "top 15%");
  compose();

  // the editor turns toward the text while you read; scroll speed makes the code run faster
  ScrollTrigger.create({
    trigger: "#about",
    start: "top top",
    end: "bottom bottom",
    scrub: true,
    onUpdate: (s) => {
      m.target.tilt = -0.32 + s.progress * 0.2;
      m.target.energy = Math.max(
        m.target.energy,
        Math.min(1, Math.abs(s.getVelocity()) / 3000),
      );
    },
  });

  initRail();
  initMarquee();
}

function initWork(_m: Matter | null, abort: AbortSignal) {
  const pin = document.querySelector<HTMLElement>("[data-work-pin]");
  const track = document.querySelector<HTMLElement>("[data-work-track]");
  if (!pin || !track) return;
  const slides = [...track.querySelectorAll<HTMLElement>("[data-slide]")];
  const indexEl = document.querySelector<HTMLElement>("[data-work-index]");
  const bar = document.querySelector<HTMLElement>("[data-work-progress]");

  if (fine && !reduce) {
    slides.forEach((sl) => {
      const link = sl.querySelector<HTMLElement>("[data-slide-link]")!;
      const media = sl.querySelector<HTMLElement>("[data-slide-media]")!;
      const xTo = gsap.quickTo(media, "x", {
        duration: 0.65,
        ease: "power3.out",
      });
      const yTo = gsap.quickTo(media, "y", {
        duration: 0.65,
        ease: "power3.out",
      });
      const move = (e: PointerEvent) => {
        if (gallery?.expanding || e.pointerType === "touch") return;
        // Use the stationary link as the reference so the image cannot chase its own bounds.
        const r = link.getBoundingClientRect();
        const x = gsap.utils.clamp(
          -1,
          1,
          ((e.clientX - r.left) / r.width) * 2 - 1,
        );
        const y = gsap.utils.clamp(
          -1,
          1,
          ((e.clientY - r.top) / media.offsetHeight) * 2 - 1,
        );
        xTo(x * 18);
        yTo(y * 12 - 6);
      };
      const reset = () => {
        xTo(0);
        yTo(0);
      };
      link.addEventListener("pointerenter", move, { signal: abort });
      link.addEventListener("pointermove", move, { signal: abort });
      link.addEventListener("pointerleave", reset, { signal: abort });
      link.addEventListener("pointercancel", reset, { signal: abort });
      cleanup.push(() => {
        xTo.tween.kill();
        yTo.tween.kill();
        gsap.set(media, { clearProps: "transform" });
      });
    });
  }

  let current = -1;
  const setIndex = (i: number) => {
    if (i === current || !indexEl) return;
    current = i;
    scramble(indexEl, String(i + 1).padStart(2, "0"), 0.35);
  };

  // Match the CSS layout and revert pin spacing/transforms when the mode changes.
  const workMedia = gsap.matchMedia();
  cleanup.push(() => workMedia.revert());
  workMedia.add(
    "(min-width: 1024px) and (hover: hover) and (pointer: fine)",
    () => {
      const activeGallery =
        engine && !lowTier && !reduce
          ? new Gallery(
              engine,
              slides.map(
                (s) => s.querySelector<HTMLElement>("[data-slide-media]")!,
              ),
            )
          : null;
      gallery = activeGallery;
      const dist = () => track.scrollWidth - innerWidth;
      const tween = gsap.to(track, {
        x: () => -dist(),
        ease: "none",
        scrollTrigger: {
          trigger: pin,
          pin: true,
          start: "top top",
          end: () => `+=${dist()}`,
          scrub: true,
          invalidateOnRefresh: true,
          onUpdate: (s) => {
            if (gallery)
              gallery.velocity = gsap.utils.clamp(
                -40,
                40,
                s.getVelocity() / 90,
              );
            if (bar) bar.style.transform = `scaleX(${s.progress})`;
            // the slide nearest the viewport centre is "playing"
            let best = 0,
              bestD = Infinity;
            slides.forEach((sl, i) => {
              const r = sl.getBoundingClientRect();
              const d = Math.abs(r.left + r.width / 2 - innerWidth / 2);
              if (d < bestD) {
                bestD = d;
                best = i;
              }
            });
            setIndex(best);
          },
        },
      });
      // titles drift against the images for depth
      slides.forEach((sl) => {
        const meta = sl.querySelector(".slide__meta");
        gsap.fromTo(
          meta,
          { xPercent: 18 },
          {
            xPercent: -18,
            ease: "none",
            scrollTrigger: {
              trigger: sl,
              containerAnimation: tween,
              start: "left right",
              end: "right left",
              scrub: true,
            },
          },
        );
      });
      return () => {
        activeGallery?.destroy();
        if (gallery === activeGallery) gallery = null;
      };
    },
  );
  workMedia.add("(max-width: 1023px), (hover: none), (pointer: coarse)", () => {
    // The vertical reel only needs a counter, without pinning or scroll transforms.
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting)
            setIndex(slides.indexOf(entry.target as HTMLElement));
        });
      },
      { rootMargin: "-40% 0px -40% 0px" },
    );
    slides.forEach((sl) => observer.observe(sl));
    return () => observer.disconnect();
  });

  // click: the plane swells to full screen, then the case study takes over underneath
  slides.forEach((sl) => {
    const link = sl.querySelector<HTMLAnchorElement>("[data-slide-link]")!;
    link.addEventListener(
      "click",
      async (e) => {
        if (!gallery || e.metaKey || e.ctrlKey) return;
        e.preventDefault();
        lenis?.stop();
        document
          .querySelectorAll<HTMLElement>(
            ".slide__meta, .work__head, .work__progress, .nav, .rail",
          )
          .forEach((el) => gsap.to(el, { opacity: 0, duration: 0.4 }));
        const ok = await gallery.expand(
          sl.querySelector<HTMLElement>("[data-slide-media]")!,
        );
        if (!ok) {
          location.href = link.href;
          return;
        }
        root.dataset.vt = "cut";
        try {
          sessionStorage.setItem("ck-expand", new URL(link.href).pathname);
        } catch {
          /* storage blocked */
        }
        navigate(link.href);
      },
      { signal: abort },
    );
  });
}

function initRail() {
  const links = [
    ...document.querySelectorAll<HTMLAnchorElement>("[data-rail-link]"),
  ];
  const prog = document.querySelector<HTMLElement>("[data-rail-progress]");
  links.forEach((a) => {
    const sec = document.getElementById(a.dataset.railLink!);
    if (!sec) return;
    ScrollTrigger.create({
      trigger: sec,
      start: "top 50%",
      end: "bottom 50%",
      onToggle: (s) =>
        s.isActive &&
        links.forEach((l) => l.classList.toggle("is-active", l === a)),
    });
  });
  if (prog)
    ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (s) => (prog.style.transform = `scaleY(${s.progress})`),
    });
  // the rail only shows up once the hero has played
  const rail = document.querySelector<HTMLElement>("[data-rail]");
  if (rail)
    ScrollTrigger.create({
      trigger: "#about",
      start: "top 60%",
      onToggle: (s) => rail.classList.toggle("is-on", s.isActive),
      end: "max",
    });
}

function initMarquee() {
  const rows = [
    ...document.querySelectorAll<HTMLElement>("[data-marquee-row]"),
  ];
  if (!rows.length || reduce) return;
  const skew = rows.map((r) =>
    gsap.quickTo(r, "skewX", { duration: 0.5, ease: "power3.out" }),
  );
  // each row drifts on its own; scrolling speeds the drift up in its own direction (never against it)
  const drift = rows.map((r, i) =>
    gsap.fromTo(
      r.querySelectorAll(".marquee__set"),
      { xPercent: i ? -100 : 0 },
      {
        xPercent: i ? 0 : -100,
        duration: i ? 44 : 38,
        ease: "none",
        repeat: -1,
      },
    ),
  );
  let boost = 0,
    speed = 1;
  const tick = (_: number, ms: number) => {
    const dt = Math.min(ms, 100) / 1000;
    boost *= Math.exp(-2.5 * dt);
    speed += (1 + boost - speed) * (1 - Math.exp(-8 * dt));
    drift.forEach((t) => t.timeScale(speed));
  };
  gsap.ticker.add(tick);
  cleanup.push(() => {
    gsap.ticker.remove(tick);
    drift.forEach((t) => t.kill());
  });
  ScrollTrigger.create({
    trigger: "[data-marquee]",
    start: "top bottom",
    end: "bottom top",
    onUpdate: (s) => {
      const vel = s.getVelocity();
      skew.forEach((fn, i) =>
        fn(gsap.utils.clamp(-8, 8, vel / 400) * (i ? 1 : -1)),
      );
      boost = Math.max(boost, Math.min(5, Math.abs(vel) / 500));
    },
  });
}

function initCase() {
  const frame = document.querySelector<HTMLElement>("[data-case-cover]");
  if (!frame || reduce) return;
  const img = frame.querySelector(".cover");
  let fromReel = false;
  try {
    fromReel = sessionStorage.getItem("ck-expand") === location.pathname;
    sessionStorage.removeItem("ck-expand");
  } catch {
    /* storage blocked */
  }
  if (fromReel) {
    // the reel's plane filled the screen: start the cover there and let it sink into its frame
    const r = frame.getBoundingClientRect();
    const k = Math.max(innerWidth / r.width, innerHeight / r.height);
    gsap.fromTo(
      frame,
      {
        x: innerWidth / 2 - (r.left + r.width / 2),
        y: innerHeight / 2 - (r.top + r.height / 2),
        scale: k,
      },
      {
        x: 0,
        y: 0,
        scale: 1,
        duration: 1.4,
        ease: "expo.inOut",
        delay: 0.1,
        clearProps: "transform",
      },
    );
  } else {
    gsap.fromTo(
      frame,
      { clipPath: "inset(18% 8% 0% 8% round 8px)" },
      {
        clipPath: "inset(0% 0% 0% 0% round 8px)",
        duration: 1.6,
        ease: EASE,
        delay: 0.2,
        clearProps: "clipPath",
      },
    );
    gsap.fromTo(
      img,
      { scale: 1.25 },
      { scale: 1, duration: 1.8, ease: EASE, delay: 0.2 },
    );
  }
}

/* ---------- lifecycle with the client router ---------- */

document.addEventListener("astro:page-load", () => {
  cleanup.forEach((fn) => fn());
  cleanup = [];
  initPage();
  setTimeout(() => delete root.dataset.vt, 1000);
});

document.addEventListener("astro:before-swap", (e) => {
  ScrollTrigger.getAll().forEach((t) => t.kill());
  cleanup.forEach((fn) => fn());
  cleanup = [];
  closeMenu = null;
  // the router copies <html> attributes from the incoming document: carry our runtime state across
  const next = (e as any).newDocument.documentElement as HTMLElement;
  for (const c of ["js", "gl-on", "no-gl", "has-cursor"])
    if (root.classList.contains(c)) next.classList.add(c);
  if (root.dataset.vt === "cut") next.dataset.vt = "cut";
});
