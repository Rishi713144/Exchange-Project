"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { ReactNode } from "react";

/* ---------- styles ---------- */

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='.55'/></svg>\")";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
@font-face{font-family:'Nebula Mirthful';src:url('/fonts/NebulaMirthful.woff2') format('woff2'),url('/fonts/NebulaMirthful.otf') format('opentype'),url('/fonts/NebulaMirthful.ttf') format('truetype');font-weight:400;font-style:normal;font-display:swap}
.ab-display{font-family:'Poppins',ui-sans-serif,system-ui,sans-serif;font-weight:500;letter-spacing:-.01em}
.ab{font-family:'Poppins',ui-sans-serif,system-ui,sans-serif}
.ab-ns{scrollbar-width:none;-ms-overflow-style:none}
.ab-ns::-webkit-scrollbar{display:none}
.lb{-webkit-mask-image:linear-gradient(to right,transparent,#000 10%,#000 90%,transparent);mask-image:linear-gradient(to right,transparent,#000 10%,#000 90%,transparent)}
.lb-track{animation:lb-loop 32s linear infinite;will-change:transform}
.lb:hover .lb-track{animation-play-state:paused}
@keyframes lb-loop{to{transform:translateX(-50%)}}
@media (prefers-reduced-motion:reduce){.lb-track{animation:none}}
`;

/* ---------- bottom coin row (simple line-art marks) ---------- */

const ICONS: ReactNode[] = [
  <svg key="candles" viewBox="0 0 48 48" fill="currentColor"><g stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v38M24 9v30M36 4v36" /></g><rect x="7" y="14" width="10" height="16" rx="2" /><rect x="19" y="18" width="10" height="14" rx="2" /><rect x="31" y="10" width="10" height="20" rx="2" /></svg>,
  <svg key="bars" viewBox="0 0 48 48" fill="currentColor"><rect x="5" y="28" width="8" height="15" rx="2" /><rect x="17" y="20" width="8" height="23" rx="2" /><rect x="29" y="11" width="8" height="32" rx="2" /><rect x="41" y="4" width="4" height="39" rx="2" /></svg>,
  <svg key="book" viewBox="0 0 48 48" fill="currentColor">{[[6, 36], [10, 30], [14, 22], [20, 16]].map(([y, w], i) => <rect key={i} x="4" y={y - 2} width={w} height="5" rx="2.5" />)}{[[26, 18], [32, 28], [38, 34], [44, 40]].map(([y, w], i) => <rect key={i} x={46 - w} y={y - 2} width={w} height="5" rx="2.5" opacity=".6" />)}</svg>,
  <svg key="trend" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 36 17 22l9 8L43 11M32 11h11v11" /></svg>,
  <svg key="pie" viewBox="0 0 48 48" fill="currentColor"><path d="M22 4a20 20 0 1 0 22 22H22V4Z" /><path d="M27 3v18h18A18 18 0 0 0 27 3Z" opacity=".6" /></svg>,
  <svg key="bank" viewBox="0 0 48 48" fill="currentColor"><path d="M24 3 3 14v4h42v-4L24 3Z" /><rect x="7" y="22" width="6" height="16" rx="1.5" /><rect x="21" y="22" width="6" height="16" rx="1.5" /><rect x="35" y="22" width="6" height="16" rx="1.5" /><rect x="3" y="41" width="42" height="5" rx="2" /></svg>,
  <svg key="rupee" viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="currentColor" /><text x="24" y="33" textAnchor="middle" fontSize="26" fontWeight="700" fill="#02030a">₹</text></svg>,
  <svg key="bolt" viewBox="0 0 48 48" fill="currentColor"><path d="M27 2 8 27h13l-3 19 22-27H26l1-17Z" /></svg>,
  <svg key="shield" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"><path d="M24 4 7 10v12c0 11 7 18 17 22 10-4 17-11 17-22V10L24 4Z" /><path d="m16 24 6 6 11-12" /></svg>,
];

/* ---------- phone mockups (sized in em so they scale with the window) ---------- */

function Dot({ c, s = "1.4em" }: { c: string; s?: string }) {
  return <span className="inline-block rounded-full" style={{ background: c, width: s, height: s }} />;
}

function Spark({ up, w = "3.6em" }: { up?: boolean; w?: string }) {
  return (
    <svg viewBox="0 0 40 14" style={{ width: w }} fill="none" stroke={up ? "#34d399" : "#64748b"} strokeWidth="1.2">
      <path d={up ? "M0 11 6 8 11 9 17 4 23 6 29 2 40 5" : "M0 3 7 5 12 4 19 9 26 7 33 11 40 9"} />
    </svg>
  );
}

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-[0.6em] text-[0.85em] font-medium text-white">
      <span>9:41</span>
      <span className="flex items-center gap-[0.3em]">
        <span className="h-[0.6em] w-[1.1em] rounded-sm bg-white/90" />
        <span className="h-[0.7em] w-[1.5em] rounded-sm border border-white/80" />
      </span>
    </div>
  );
}

const PHONE_FRAME =
  "absolute rounded-[3em] border-[0.2em] border-[#32576a]/70 bg-gradient-to-b from-[#0e1530] to-[#070a18] p-[1.2em] shadow-[0_3em_8em_-2em_rgba(30,50,200,.6)]";

function Island() {
  return <span className="absolute left-1/2 top-[0.9em] h-[1.7em] w-[6em] -translate-x-1/2 rounded-full bg-black" />;
}

function PhoneMain() {
  return (
    <div className={`${PHONE_FRAME} left-0 top-0 z-20 h-[48em] w-[22em]`}>
      <Island />
      <StatusBar />
      <div className="mt-[1.9em] flex items-center justify-between text-[0.9em] text-slate-200">
        <span className="flex items-center gap-[0.6em]"><Dot c="#3b6cf6" s="2em" />Richard Cooper</span>
        <span className="h-[1.3em] w-[1.3em] rounded border border-orange-400/80" />
      </div>
      <p className="mt-[1.7em] text-[0.75em] text-slate-400">Portfolio Value</p>
      <div className="flex items-end justify-between">
        <p className="text-[2.35em] font-medium leading-none tracking-tight text-white">₹1,72,581.30</p>
        <p className="pb-[0.4em] text-right text-[0.62em] leading-tight text-emerald-400">+₹4,972.2 · 2.9%<br /><span className="text-slate-500">all time</span></p>
      </div>

      <div className="absolute -left-[1.2em] top-[15.5em] z-30 flex gap-[0.6em]">
        <div className="h-[8.4em] w-[10.6em] rounded-[1.1em] border border-white/10 bg-gradient-to-br from-[#2a3d9a] to-[#16205a] p-[1em] shadow-xl">
          <div className="flex items-center justify-between text-[0.9em] text-white">Cash <span className="flex"><Dot c="#3b82f6" s="1.3em" /><span className="-ml-[0.4em]"><Dot c="#8b5cf6" s="1.3em" /></span></span></div>
          <p className="mt-[1.1em] text-[1.05em] font-medium text-white">₹52,121.70</p>
          <p className="text-[0.62em] text-emerald-400">+₹1,546.8 · 3.0%</p>
          <p className="text-[0.62em] text-slate-400">for month</p>
        </div>
        <div className="h-[6.8em] w-[8.6em] rounded-[1.1em] border border-white/10 bg-gradient-to-br from-[#1f2f80] to-[#121a48] p-[0.9em] shadow-xl">
          <div className="flex items-center justify-between text-[0.8em] text-white">Profit <Dot c="#3b82f6" s="1.2em" /></div>
          <p className="mt-[0.9em] text-[0.95em] font-medium text-white">₹12,045.96</p>
          <p className="text-[0.58em] text-emerald-400">+₹1,934.6 · 1.1%</p>
          <p className="text-[0.58em] text-slate-400">for month</p>
        </div>
      </div>

      <div className="absolute inset-x-[0.8em] top-[26em] rounded-[1.4em] border border-white/10 bg-[#0f1631]/95 p-[1em]">
        <div className="flex items-center justify-between text-[0.8em]">
          <span className="flex gap-[1.2em]"><b className="font-medium text-white">Watchlist</b><span className="text-slate-500">All Stocks</span></span>
          <span className="h-[1em] w-[1em] rounded-full border border-slate-500" />
        </div>
        <div className="mt-[0.8em] flex gap-[0.4em] text-[0.55em] text-slate-400">
          {["Date Added", "Price", "Change", "Volume"].map((t, i) => (
            <span key={t} className={`rounded-full px-[0.8em] py-[0.4em] ${i === 0 ? "bg-white/15 text-white" : "bg-white/5"}`}>{t}</span>
          ))}
        </div>
        {[["TATA", "#3b82f6", "₹928.45", "+1.12%", true], ["INFY", "#6366f1", "₹1,514.20", "-0.34%", false], ["HDFC", "#e11d48", "₹1,612.75", "-0.80%", false]].map(([n, c, p, ch, up]) => (
          <div key={n as string} className="mt-[1em] flex items-center justify-between text-[0.72em] text-slate-200">
            <span className="flex items-center gap-[0.6em]"><Dot c={c as string} s="1.7em" />{n}</span>
            <Spark up={up as boolean} />
            <span className="text-right">{p}<br /><span className={`text-[0.75em] ${up ? "text-emerald-400" : "text-rose-400"}`}>{ch}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PhoneChart() {
  return (
    <div className={`${PHONE_FRAME} left-[20em] top-[7em] z-10 h-[46em] w-[19em]`}>
      <Island />
      <StatusBar />
      <div className="mt-[1.9em] flex items-center justify-between text-[0.85em] text-white">
        <span className="flex items-center gap-[0.6em]"><Dot c="#3b82f6" s="1.8em" />TATA / INR</span>
        <span className="text-slate-500">▢ ☆ ⋯</span>
      </div>
      <div className="mt-[1.2em] flex gap-[1em] text-[0.6em] text-slate-400"><b className="font-medium text-white">Overview</b><span>Order Book</span><span>Trades</span><span>Info</span></div>
      <div className="mt-[1.4em] flex items-end justify-between">
        <p className="text-[1.9em] font-medium leading-none text-white">₹928.45</p>
        <span className="rounded bg-emerald-500/15 px-[0.5em] py-[0.2em] text-[0.6em] text-emerald-400">+6.77%</span>
      </div>
      <svg viewBox="0 0 160 110" className="mt-[1.2em] w-full" fill="none">
        <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#34d399" stopOpacity=".35" /><stop offset="1" stopColor="#34d399" stopOpacity="0" /></linearGradient></defs>
        <path d="M0 95 12 88 20 92 30 70 40 74 52 52 62 58 72 30 82 36 92 12 102 20 112 6 124 30 134 22 146 64 160 72V110H0Z" fill="url(#g)" />
        <path d="M0 95 12 88 20 92 30 70 40 74 52 52 62 58 72 30 82 36 92 12 102 20 112 6 124 30 134 22 146 64 160 72" stroke="#34d399" strokeWidth="1.4" />
      </svg>
      <div className="mt-[0.6em] flex justify-between text-[0.5em] text-slate-500"><span>1H</span><span>1D</span><span>1W</span><span>1M</span><span>1Y</span></div>
      <div className="mt-[2.2em] flex justify-between text-[0.65em] text-slate-300"><span>24h Volume</span><span>₹5.52Cr</span></div>
      <span className="mt-[1.4em] block rounded-[0.9em] bg-blue-600 py-[0.8em] text-center text-[0.8em] font-medium text-white">Place order</span>
    </div>
  );
}

/* ---------- page ---------- */

export function Landing() {
  // hide the page-level scrollbar while the landing page is shown
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = [html.style.overflow, body.style.overflow];
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev[0];
      body.style.overflow = prev[1];
    };
  }, []);

  return (
    <div className="ab w-full">
      <style>{CSS}</style>

      <section className="ab-ns fixed inset-0 z-[100] overflow-y-auto overflow-x-hidden bg-[#02030a] text-white">
        <div className="relative flex h-full min-h-[640px] flex-col overflow-hidden">
        {/* background glow + grain */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 52% 62% at 70% 14%, rgba(96,128,255,.95) 0%, rgba(48,70,214,.65) 38%, transparent 72%), radial-gradient(ellipse 42% 48% at 38% 20%, rgba(30,48,190,.6) 0%, transparent 70%), linear-gradient(to right, #02030a 0%, rgba(2,3,10,.6) 22%, transparent 48%)",
          }}
        />
        <div className="pointer-events-none absolute inset-0 opacity-[.22] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />

        {/* phones */}
        <div className="pointer-events-none absolute right-[3.5vw] top-[9vh] z-10 hidden lg:block" style={{ fontSize: "min(1.45vh, 0.95vw)", width: "40em", height: "56em" }}>
          <PhoneChart />
          <PhoneMain />
        </div>

        {/* fade to black at the bottom */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[42vh] bg-gradient-to-t from-[#02030a] via-[#02030a]/85 to-transparent" />

        {/* copy */}
        <main className="hero-copy relative z-30 flex min-h-0 flex-1 flex-col justify-between px-[3.5vw] pb-[17vh] pt-[11vh]">
          <div className="max-w-[560px]">
            <h1 className="ab-display text-[clamp(2.175rem,calc(min(4.8vw,8vh)-2px),4.475rem)] leading-[1.04] text-[#c5cad8]">
              Practice Trading
              <br />
              on a Real-Time
              <br />
              Stock Exchange
            </h1>
            <p className="mt-[2.4vh] max-w-[300px] text-[clamp(11px,1.5vh,13px)] leading-[1.55] text-slate-500">
              Place orders, watch the order book move and see trades match instantly, all in a simulated exchange built for learning.
            </p>
            <div className="mt-[3.4vh] flex items-center gap-3">
              <Link href="/markets" className="rounded-full bg-[#1747f5] px-[22px] py-[10px] text-[10px] font-semibold tracking-wider text-white shadow-[0_10px_30px_-8px_rgba(23,71,245,.9)] transition hover:brightness-110">
                START TRADING
              </Link>
            </div>
            <p className="mt-[1.6vh] text-[clamp(9px,1.2vh,11px)] text-slate-600">Simulation only. No real money involved.</p>
          </div>

          <div className="flex max-w-[620px] gap-0 text-[#b8bfce]">
            {[
              ["REAL-TIME", "Order book, trades and prices streamed live over WebSockets."],
              ["EXACT", "Fixed-precision matching so fractional quantities settle correctly."],
              ["FAIR", "Self-trade protection stops an account matching its own orders."],
            ].map(([n, l], i) => (
              <div key={n} className={`flex-1 ${i ? "border-l border-white/15 pl-[1.1vw]" : "pr-[1.1vw]"}`}>
                <p className="ab-display text-[clamp(1rem,calc(min(2.1vw,3.7vh)-2px),1.775rem)] leading-none">{n}</p>
                <p className="mt-[1.4vh] max-w-[150px] text-[clamp(9px,1.3vh,11px)] leading-snug text-slate-500">{l}</p>
              </div>
            ))}
          </div>
        </main>

        {/* coin row: seamless looping marquee, pauses on hover */}
        <div className="lb absolute inset-x-0 bottom-[3vh] z-30 overflow-hidden py-2 text-white/55">
          <div className="lb-track flex w-max">
            {[0, 1].map(copy => (
              <ul key={copy} aria-hidden={copy === 1} className="flex shrink-0 items-center gap-[min(7vw,96px)] pr-[min(7vw,96px)]">
                {ICONS.map((icon, i) => (
                  <li key={i} className="block h-[min(6vh,44px)] w-[min(6vh,44px)] transition duration-200 hover:scale-110 hover:text-white">{icon}</li>
                ))}
              </ul>
            ))}
          </div>
        </div>
        </div>
      </section>
    </div>
  );
}