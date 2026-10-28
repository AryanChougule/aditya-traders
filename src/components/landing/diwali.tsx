"use client";

import "./diwali.css";
import Link from "next/link";
import { Yatra_One } from "next/font/google";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { useT } from "@/components/i18n";
import type { Key } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { OrderButtons } from "./announcement";

/*
 * The Diwali landing scene: a new-moon night over the shop, with a marigold-and-mango-leaf toran, two akash
 * kandils, a rangoli that draws itself behind "शुभ दीपावली", diyas that light one by one, fireworks (tap the
 * sky for your own) and a ribbon of the six days. Everything is SVG + CSS transforms so it stays smooth on
 * a cheap phone; it pauses when scrolled away and sits still for people who ask for reduced motion.
 */

const festive = Yatra_One({
  weight: "400",
  subsets: ["devanagari", "latin"],
  display: "swap",
});

/** Same "random" layout on the server and in the browser, so hydration matches. */
function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}
const r2 = (n: number) => Math.round(n * 100) / 100;
type Vars = CSSProperties & Record<`--${string}`, string | number>;

const COLORS = ["#ffd23f", "#ff5d8f", "#5ee1ff", "#9cff6e", "#ff9a3c", "#c58cff", "#fff3c4"];

const STARS = (() => {
  const rnd = seeded(7);
  return Array.from({ length: 46 }, () => ({
    left: r2(rnd() * 100),
    top: r2(rnd() * 62),
    size: r2(1 + rnd() * 1.8),
    delay: r2(rnd() * 4),
    dur: r2(2.5 + rnd() * 3),
  }));
})();

const EMBERS = (() => {
  const rnd = seeded(11);
  return Array.from({ length: 18 }, () => ({
    left: r2(4 + rnd() * 92),
    size: r2(2 + rnd() * 3),
    delay: r2(rnd() * 9),
    dur: r2(7 + rnd() * 6),
    dx: Math.round(-40 + rnd() * 80),
  }));
})();

/** Unit directions for a burst: an inner ring and an outer ring, slightly jittered so it looks hand-lit. */
function ring(n: number, reach: number, rnd: () => number) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + rnd() * 0.2;
    return { ux: r2(Math.cos(a) * reach), uy: r2(Math.sin(a) * reach) };
  });
}
const SPARKS = (() => {
  const rnd = seeded(23);
  return [...ring(10, 0.55, rnd), ...ring(18, 1, rnd)];
})();

const SHOWS = [
  { x: 16, y: 20, d: 78, c: 0, delay: 0.6 },
  { x: 82, y: 16, d: 92, c: 1, delay: 2.1 },
  { x: 50, y: 9, d: 70, c: 2, delay: 3.4 },
  { x: 28, y: 34, d: 64, c: 3, delay: 4.6 },
  { x: 72, y: 30, d: 84, c: 4, delay: 5.7 },
  { x: 90, y: 40, d: 60, c: 5, delay: 6.6 },
];

const DAYS = ["वसुबारस", "धनत्रयोदशी", "नरक चतुर्दशी", "लक्ष्मीपूजन", "दिवाळी पाडवा", "भाऊबीज"];

type Tap = { id: number; x: number; y: number; c: string; d: number };
let tapSeq = 0;

export function DiwaliHero({ title, message, ends }: { title: string; message: string; ends: string | null }) {
  const t = useT();
  const ref = useRef<HTMLElement>(null);
  const [taps, setTaps] = useState<Tap[]>([]);
  const [tapped, setTapped] = useState(false);

  // stop painting the night sky while it's scrolled out of view
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => el.toggleAttribute("data-paused", !e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  function launch(e: React.PointerEvent<HTMLElement>) {
    if ((e.target as Element).closest("a,button") || !ref.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = ref.current.getBoundingClientRect();
    const id = ++tapSeq;
    const tap = {
      id,
      x: e.clientX - box.left,
      y: e.clientY - box.top,
      c: COLORS[id % COLORS.length],
      d: 70 + Math.round(Math.random() * 40),
    };
    setTaps((list) => [...list.slice(-5), tap]);
    setTapped(true);
    setTimeout(() => setTaps((list) => list.filter((x) => x.id !== id)), 1500);
  }

  return (
    <section ref={ref} onPointerDown={launch} aria-label={title} className="dw relative isolate overflow-hidden text-[#fff6e5]">
      <Defs />
      <div className="dw-sky absolute inset-0 -z-10" aria-hidden />

      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {STARS.map((s, i) => (
          <span
            key={i}
            className="dw-star"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.dur}s`,
            }}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {SHOWS.map((f, i) => (
          <div
            key={i}
            className="dw-show"
            style={
              {
                left: `${f.x}%`,
                top: `${f.y}%`,
                "--delay": `${f.delay}s`,
                "--c": COLORS[f.c],
                "--d": `${f.d}px`,
              } as Vars
            }
          >
            <span className="dw-rocket" />
            <span className="dw-flash" />
            {SPARKS.map((p, j) => (
              <span
                key={j}
                className="dw-spark"
                style={
                  {
                    "--ux": p.ux,
                    "--uy": p.uy,
                    "--c2": COLORS[(f.c + (j % 3 === 0 ? 3 : 0)) % COLORS.length],
                  } as Vars
                }
              />
            ))}
          </div>
        ))}
        {taps.map((f) => (
          <div key={f.id} className="dw-tap" style={{ left: f.x, top: f.y, "--c": f.c, "--d": `${f.d}px` } as Vars}>
            <span className="dw-flash" />
            {SPARKS.map((p, j) => (
              <span
                key={j}
                className="dw-spark"
                style={
                  {
                    "--ux": p.ux,
                    "--uy": p.uy,
                    "--c2": j % 2 ? f.c : "#fff3c4",
                  } as Vars
                }
              />
            ))}
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-full" aria-hidden>
        {EMBERS.map((m, i) => (
          <span
            key={i}
            className="dw-ember"
            style={
              {
                left: `${m.left}%`,
                width: m.size,
                height: m.size,
                animationDelay: `${m.delay}s`,
                animationDuration: `${m.dur}s`,
                "--dx": `${m.dx}px`,
              } as Vars
            }
          />
        ))}
      </div>

      <Toran />
      <Kandil className="left-[2%] w-[58px] sm:left-[5%] sm:w-[104px]" delay={0} />
      <Kandil className="right-[2%] w-[58px] sm:right-[5%] sm:w-[104px]" delay={-2.3} hue="blue" />

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-5 pt-24 text-center sm:pt-28">
        <div className="relative grid place-items-center">
          <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[min(108vw,540px)] -translate-x-1/2 -translate-y-1/2" aria-hidden>
            <Rangoli className="dw-rangoli size-full" />
          </div>
          <h1 lang="mr" className={cn(festive.className, "dw-title grid leading-[1.05]")}>
            <span className="dw-word dw-shubh" style={{ "--i": 0 } as Vars}>
              शुभ
            </span>
            <span className="dw-word dw-deep" style={{ "--i": 1 } as Vars}>
              दीपावली
            </span>
          </h1>
        </div>

        <p className="dw-rise mt-4 text-xl font-bold [text-shadow:0_2px_12px_rgb(0_0_0/0.5)] sm:text-2xl" style={{ "--i": 2 } as Vars}>
          {title}
        </p>
        {message ? (
          <p className="dw-rise mt-2 max-w-xl text-base opacity-90 [text-shadow:0_1px_8px_rgb(0_0_0/0.6)] sm:text-lg" style={{ "--i": 3 } as Vars}>
            {message}
          </p>
        ) : null}
        <div className="dw-rise mt-3" style={{ "--i": 4 } as Vars}>
          <OrderButtons variant="festive" className="justify-center" />
        </div>
        {ends ? <p className="mt-2 text-sm font-semibold opacity-80">{t("landing.endsOn", { date: ends })}</p> : null}
        <p className="dw-hint mt-3 text-sm font-semibold text-[#ffd76a]" data-gone={tapped || undefined} aria-hidden>
          ✦ {t("diwali.tapHint")} ✦
        </p>
      </div>

      <Diyas />
      <DaysRibbon label={t("diwali.days")} />
    </section>
  );
}

/** Gradients shared by every diya and kandil (one scene per page, so fixed ids are safe). */
function Defs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden>
      <defs>
        <linearGradient id="dw-flame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3c4" />
          <stop offset="0.35" stopColor="#ffd23f" />
          <stop offset="0.75" stopColor="#ff8a1f" />
          <stop offset="1" stopColor="#e2463c" />
        </linearGradient>
        <radialGradient id="dw-halo">
          <stop offset="0" stopColor="#ffcf5a" stopOpacity="0.85" />
          <stop offset="0.45" stopColor="#ff9a3c" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ff9a3c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="dw-clay" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d2693a" />
          <stop offset="1" stopColor="#8f3417" />
        </linearGradient>
        <radialGradient id="dw-kandil-red" cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#fff3c4" />
          <stop offset="0.35" stopColor="#ffb340" />
          <stop offset="0.8" stopColor="#e5432f" />
          <stop offset="1" stopColor="#a61b2b" />
        </radialGradient>
        <radialGradient id="dw-kandil-blue" cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#fff3c4" />
          <stop offset="0.35" stopColor="#ffd23f" />
          <stop offset="0.8" stopColor="#d6337a" />
          <stop offset="1" stopColor="#7b1fa2" />
        </radialGradient>
      </defs>
    </svg>
  );
}

function Marigold({ x, y, r, c = "#f6a609" }: { x: number; y: number; r: number; c?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={c} />
      <circle cx={x} cy={y} r={r * 0.68} fill="none" stroke="#c2410c" strokeOpacity="0.45" strokeWidth={r * 0.35} strokeDasharray="1.6 1.4" />
      <circle cx={x} cy={y} r={r * 0.28} fill="#9a3412" />
    </g>
  );
}

/** Toran across the top: a sagging string of marigolds with mango leaves and flower chains hanging from it. */
function Toran() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center overflow-hidden" aria-hidden>
      {Array.from({ length: 26 }, (_, i) => (
        <svg key={i} viewBox="0 0 80 84" className="h-[62px] w-[60px] shrink-0 sm:h-[84px] sm:w-[80px]">
          <path d="M0 4 Q40 24 80 4" stroke="#8a5a1c" strokeWidth="2" fill="none" />
          <Marigold x={14} y={9.5} r={5} c="#f97316" />
          <Marigold x={66} y={9.5} r={5} c="#f97316" />
          <g className="dw-sway" style={{ animationDelay: `${-(i % 5) * 0.7}s` }}>
            {i % 2 ? (
              <>
                <path d="M40 14 C51 25 51 44 40 56 C29 44 29 25 40 14Z" fill="#2f8f3a" />
                <path d="M40 16 L40 54" stroke="#1d6b2a" strokeWidth="1.4" />
                <Marigold x={40} y={14} r={6.5} />
              </>
            ) : (
              <>
                <path d="M40 14 L40 64" stroke="#8a5a1c" strokeWidth="1.2" />
                <Marigold x={40} y={14} r={6.5} />
                <Marigold x={40} y={29} r={6} c="#f97316" />
                <Marigold x={40} y={43} r={5.5} />
                <Marigold x={40} y={56} r={5} c="#facc15" />
                <path d="M36 62 L40 74 L44 62Z" fill="#dc2626" />
              </>
            )}
          </g>
        </svg>
      ))}
    </div>
  );
}

function starPoints(cx: number, cy: number, outer: number, inner: number) {
  return Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? inner : outer;
    return `${r2(cx + Math.cos(a) * rr)},${r2(cy + Math.sin(a) * rr)}`;
  }).join(" ");
}

/** A star-shaped akash kandil, the lantern every Maharashtrian balcony hangs for Diwali. */
function Kandil({ className, delay, hue = "red" }: { className: string; delay: number; hue?: "red" | "blue" }) {
  const tails = hue === "red" ? ["#e5432f", "#ffd23f", "#2bb673"] : ["#d6337a", "#ffd23f", "#5ee1ff"];
  return (
    <div className={cn("pointer-events-none absolute top-0 z-10", className)} aria-hidden>
      <svg viewBox="0 0 100 250" className="dw-swing w-full overflow-visible" style={{ animationDelay: `${delay}s` }}>
        <path d="M50 0 L50 48" stroke="#d6b26e" strokeWidth="1.5" />
        <circle cx="50" cy="96" r="58" fill="url(#dw-halo)" className="dw-kglow" />
        <polygon points={starPoints(50, 96, 46, 22)} fill={`url(#dw-kandil-${hue})`} stroke="#fff3c4" strokeWidth="1.5" strokeLinejoin="round" />
        <polygon points={starPoints(50, 96, 26, 12)} fill="#fff3c4" opacity="0.55" />
        <circle cx="50" cy="96" r="7" fill="#fff" opacity="0.9" />
        {tails.map((c, i) => (
          <path
            key={i}
            className="dw-tail"
            style={{ animationDelay: `${i * 0.35}s` }}
            d={`M${42 + i * 8} 128 q-6 30 0 58 q5 22 -1 46`}
            stroke={c}
            strokeWidth="4.5"
            strokeLinecap="round"
            fill="none"
          />
        ))}
        <circle cx="50" cy="236" r="4" fill="#ffd23f" />
      </svg>
    </div>
  );
}

/** Sanskar-bharati-style rangoli: petals, a dotted ring and a flower at the centre, drawn in stroke by stroke. */
function Rangoli({ className }: { className?: string }) {
  const outer = Array.from({ length: 16 }, (_, i) => i * 22.5);
  const mid = Array.from({ length: 8 }, (_, i) => i * 45);
  const dots = Array.from({ length: 32 }, (_, i) => (i / 32) * Math.PI * 2);
  return (
    <svg viewBox="-100 -100 200 200" className={className} aria-hidden>
      <g className="dw-spin">
        {dots.map((a, i) => (
          <circle key={i} cx={r2(Math.cos(a) * 94)} cy={r2(Math.sin(a) * 94)} r="1.8" fill="#fff3c4" className="dw-dot" style={{ animationDelay: `${0.2 + i * 0.03}s` }} />
        ))}
        {outer.map((deg, i) => (
          <path
            key={deg}
            pathLength={1}
            transform={`rotate(${deg})`}
            d="M0 -88 C11 -72 11 -58 0 -48 C-11 -58 -11 -72 0 -88Z"
            fill={i % 2 ? "#ff9a3c" : "#ff5d8f"}
            stroke="#fff3c4"
            strokeWidth="1.2"
            className="dw-draw"
            style={{ animationDelay: `${i * 0.06}s, ${1.3 + i * 0.04}s` }}
          />
        ))}
        <circle r="46" fill="none" stroke="#ffd23f" strokeWidth="2.2" strokeDasharray="3 4" className="dw-dot" style={{ animationDelay: "0.7s" }} />
        {mid.map((deg, i) => (
          <path
            key={deg}
            pathLength={1}
            transform={`rotate(${deg + 22.5})`}
            d="M0 -44 C15 -32 15 -18 0 -10 C-15 -18 -15 -32 0 -44Z"
            fill={i % 2 ? "#3b82f6" : "#22c55e"}
            stroke="#fff3c4"
            strokeWidth="1.2"
            className="dw-draw"
            style={{ animationDelay: `${0.8 + i * 0.08}s, ${1.8 + i * 0.05}s` }}
          />
        ))}
        {mid.map((deg) => (
          <ellipse key={deg} transform={`rotate(${deg})`} cx="0" cy="-12" rx="4" ry="7" fill="#ffd23f" className="dw-dot" style={{ animationDelay: "2.2s" }} />
        ))}
        <circle r="7" fill="#e11d48" stroke="#fff3c4" strokeWidth="1.4" className="dw-dot" style={{ animationDelay: "2.4s" }} />
      </g>
    </svg>
  );
}

/** Clay diyas along the bottom, lit one after another, then flickering for as long as you watch. */
function Diyas() {
  return (
    <div className="relative z-10 mt-8 flex items-end justify-center gap-1 px-2 sm:gap-5" aria-hidden>
      <div className="dw-pool absolute inset-x-0 bottom-0 h-24" />
      {Array.from({ length: 7 }, (_, i) => (
        <svg
          key={i}
          viewBox="0 0 120 110"
          className={cn("relative w-[18vw] max-w-[96px] overflow-visible", (i === 0 || i === 6) && "hidden sm:block")}
          style={{ "--i": i } as Vars}
        >
          <ellipse cx="60" cy="36" rx="34" ry="40" fill="url(#dw-halo)" className="dw-glow" />
          <g className="dw-flame">
            <path d="M60 6 C70 24 75 35 73 45 C71 54 65 58 60 58 C55 58 49 54 47 45 C45 35 50 24 60 6Z" fill="url(#dw-flame)" />
            <path d="M60 28 C64 37 66 43 64.5 49 C63 53 57 53 55.5 49 C54 43 56 37 60 28Z" fill="#fffbe8" />
          </g>
          <path d="M8 62 Q60 50 112 62 Q102 100 60 102 Q18 100 8 62Z" fill="url(#dw-clay)" />
          <ellipse cx="60" cy="62" rx="52" ry="9" fill="#6b2410" />
          <ellipse cx="60" cy="62" rx="42" ry="6" fill="#3b1606" />
          <rect x="58.5" y="52" width="3" height="10" rx="1.5" fill="#f5e6c8" />
          <path d="M20 74 L30 82 L40 74 L50 82 L60 74 L70 82 L80 74 L90 82 L100 74" stroke="#fde68a" strokeWidth="2" fill="none" strokeLinejoin="round" />
          {[30, 50, 70, 90].map((x) => (
            <circle key={x} cx={x} cy="91" r="2.4" fill="#fff3c4" />
          ))}
        </svg>
      ))}
    </div>
  );
}

function DaysRibbon({ label }: { label: string }) {
  const row = (hidden?: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {DAYS.map((d) => (
        <li key={d} className="flex items-center gap-4 px-4 font-semibold whitespace-nowrap">
          <span className="text-[#ffd76a]" aria-hidden>
            ✦
          </span>
          {d}
        </li>
      ))}
    </ul>
  );
  return (
    <div className="relative z-10 overflow-hidden border-t border-[#ffd76a]/25 bg-black/30 py-2.5 text-sm sm:text-base" lang="mr">
      <span className="sr-only">{label}: </span>
      <div className="dw-marquee flex w-max">
        {row()}
        {row(true)}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- faral */

const FARAL: {
  k: "chakli" | "karanji" | "ladoo" | "shankarpali" | "chivda";
  art: () => React.ReactNode;
}[] = [
  { k: "chakli", art: Chakli },
  { k: "karanji", art: Karanji },
  { k: "ladoo", art: Ladoo },
  { k: "shankarpali", art: Shankarpali },
  { k: "chivda", art: Chivda },
];

/** The faral plates under the banner: what Diwali tastes like in a Marathi home, and a way to order for it. */
export function FaralSection() {
  const t = useT();
  return (
    <section aria-labelledby="faral" className="grid gap-4 rounded-3xl bg-festive-soft p-5 sm:p-8">
      <div className="grid gap-1">
        <h2 id="faral" className="text-2xl font-bold sm:text-3xl">
          {t("diwali.faralTitle")}
        </h2>
        <p className="max-w-2xl text-muted">{t("diwali.faralBody")}</p>
      </div>
      <ul className="no-scrollbar -mx-5 flex snap-x gap-3 overflow-x-auto px-5 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0">
        {FARAL.map(({ k, art: Art }) => (
          <li key={k} className="group grid w-40 shrink-0 snap-start justify-items-center gap-1 rounded-2xl bg-surface p-4 text-center ring-1 ring-border sm:w-auto">
            <div className="dw-plate size-24 transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-6">
              <Plate>
                <Art />
              </Plate>
            </div>
            <span className="font-display text-lg font-bold">{t(`faral.${k}` as Key)}</span>
            <span className="text-sm text-muted">{t(`faral.${k}In` as Key)}</span>
          </li>
        ))}
      </ul>
      <Link href="/shop" className="inline-flex h-12 w-fit items-center gap-2 rounded-xl bg-festive px-5 font-bold text-festive-fg transition-transform active:scale-[0.97]">
        {t("diwali.faralCta")} <ArrowRight className="size-5" aria-hidden />
      </Link>
    </section>
  );
}

/** A brass thali, seen from above. */
function Plate({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 100 100" className="size-full" aria-hidden>
      <circle cx="50" cy="50" r="48" fill="#c8961e" />
      <circle cx="50" cy="50" r="44" fill="#e9bd44" />
      <circle cx="50" cy="50" r="37" fill="#f4d36b" />
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return <circle key={i} cx={r2(50 + Math.cos(a) * 41)} cy={r2(50 + Math.sin(a) * 41)} r="1.1" fill="#a87512" />;
      })}
      {children}
    </svg>
  );
}

function Chakli() {
  const pts: string[] = [];
  for (let a = 0; a < Math.PI * 7; a += 0.25) {
    const rr = 3 + a * 1.32;
    pts.push(`${r2(50 + Math.cos(a) * rr)},${r2(50 + Math.sin(a) * rr)}`);
  }
  const d = `M${pts.join(" L")}`;
  return (
    <g>
      <path d={d} fill="none" stroke="#9a4f1c" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke="#c97a3a" strokeWidth="3" strokeDasharray="2 2.5" strokeLinecap="round" />
    </g>
  );
}

function crescent(cx: number, cy: number, r: number, rot: number) {
  // a half-moon with a crimped (scalloped) curved edge, like a hand-folded karanji
  const n = 11;
  let d = `M${cx - r} ${cy}`;
  for (let i = 1; i <= n; i++) {
    const a = Math.PI - (i / n) * Math.PI;
    const mid = Math.PI - ((i - 0.5) / n) * Math.PI;
    d += ` Q${r2(cx + Math.cos(mid) * (r + 4.5))} ${r2(cy - Math.sin(mid) * (r + 4.5))} ${r2(cx + Math.cos(a) * r)} ${r2(cy - Math.sin(a) * r)}`;
  }
  return <path d={`${d} Z`} transform={`rotate(${rot} ${cx} ${cy})`} fill="#f1d29a" stroke="#cf9a4c" strokeWidth="1.6" />;
}

function Karanji() {
  return (
    <g>
      {crescent(42, 46, 19, -18)}
      {crescent(58, 62, 17, 160)}
    </g>
  );
}

function Ladoo() {
  const rnd = seeded(5);
  const balls = [
    [38, 42],
    [62, 44],
    [50, 63],
  ];
  return (
    <g>
      <defs>
        <radialGradient id="dw-ladoo" cx="0.38" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#ffd77a" />
          <stop offset="0.6" stopColor="#f0a530" />
          <stop offset="1" stopColor="#c47a12" />
        </radialGradient>
      </defs>
      {balls.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="14" fill="url(#dw-ladoo)" />
          {Array.from({ length: 9 }, (_, j) => (
            <circle key={j} cx={r2(x - 9 + rnd() * 18)} cy={r2(y - 9 + rnd() * 18)} r="0.9" fill="#a8640c" opacity="0.7" />
          ))}
          <circle cx={x - 2} cy={y - 3} r="1.6" fill="#7c3aed" opacity="0.5" />
        </g>
      ))}
    </g>
  );
}

function Shankarpali() {
  const rnd = seeded(9);
  return (
    <g>
      {Array.from({ length: 13 }, (_, i) => {
        const a = rnd() * Math.PI * 2;
        const rr = rnd() * 22;
        const x = r2(50 + Math.cos(a) * rr);
        const y = r2(50 + Math.sin(a) * rr);
        return (
          <rect
            key={i}
            x={x - 5}
            y={y - 5}
            width="10"
            height="10"
            rx="1"
            transform={`rotate(${45 + Math.round(rnd() * 20 - 10)} ${x} ${y})`}
            fill={i % 3 ? "#ecc685" : "#e0b26a"}
            stroke="#c08a43"
            strokeWidth="0.8"
          />
        );
      })}
    </g>
  );
}

function Chivda() {
  const rnd = seeded(13);
  const at = () => {
    const a = rnd() * Math.PI * 2;
    const rr = Math.sqrt(rnd()) * 30;
    return [r2(50 + Math.cos(a) * rr), r2(50 + Math.sin(a) * rr), Math.round(rnd() * 180)] as const;
  };
  return (
    <g>
      {Array.from({ length: 34 }, (_, i) => {
        const [x, y, rot] = at();
        return <ellipse key={`p${i}`} cx={x} cy={y} rx="4.2" ry="2.2" transform={`rotate(${rot} ${x} ${y})`} fill={i % 2 ? "#f7d54a" : "#efc22e"} />;
      })}
      {Array.from({ length: 8 }, (_, i) => {
        const [x, y, rot] = at();
        return <ellipse key={`n${i}`} cx={x} cy={y} rx="3.4" ry="2.4" transform={`rotate(${rot} ${x} ${y})`} fill="#b86b35" />;
      })}
      {Array.from({ length: 5 }, (_, i) => {
        const [x, y, rot] = at();
        return <path key={`l${i}`} d={`M${x - 5} ${y} Q${x} ${y - 4} ${x + 5} ${y} Q${x} ${y + 4} ${x - 5} ${y}Z`} transform={`rotate(${rot} ${x} ${y})`} fill="#2f7d32" />;
      })}
      <path d="M60 36 q6 2 9 8" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" fill="none" />
    </g>
  );
}
