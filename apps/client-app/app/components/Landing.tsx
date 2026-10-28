"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getTickers } from "../utils/httpClient";
import type { Ticker } from "../utils/types";
import { AssetIcon } from "./core/AssetIcon";

function formatNumber(value: string | undefined, maximumFractionDigits = 8) {
  if (value === undefined || value === "") {
    return "—";
  }
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed.toLocaleString(undefined, { maximumFractionDigits })
    : value;
}

export function Landing() {
  const [tickers, setTickers] = useState<Ticker[]>([]);

  useEffect(() => {
    let active = true;

    const load = () => {
      getTickers()
        .then(data => {
          if (active) setTickers(data);
        })
        .catch(err => console.error("Failed to load landing markets", err));
    };

    load();
    const interval = setInterval(load, 10000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const primaryMarket = tickers[0];
  const totalVolume = tickers.reduce((sum, ticker) => sum + Number(ticker.quoteVolume || 0), 0);
  const topGainer = tickers.reduce<Ticker | null>((best, ticker) => {
    if (!best) return ticker;
    return Number(ticker.priceChangePercent) > Number(best.priceChangePercent) ? ticker : best;
  }, null);

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-16 px-6 py-14">
      <section className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
         
          <h1 className="max-w-xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
            Trade crypto on a fast, transparent exchange.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-400">
            Real-time order books, live trades and precise matching in one clean interface.
            Explore the market or jump straight into the order book.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/trade/${primaryMarket?.symbol ?? "TATA_INR"}`}
              className="rounded-lg bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-400"
            >
              Start trading
            </Link>
            <Link
              href="/markets"
              className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
            >
              View markets
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">Featured market</p>
            <span className="text-xs text-slate-500">Live</span>
          </div>
          {primaryMarket ? (
            <>
              <div className="mt-5 flex items-center gap-3">
                <AssetIcon symbol={primaryMarket.symbol.split("_")[0]} size={48} />
                <div>
                  <p className="text-xl font-semibold text-white">{primaryMarket.symbol.replace("_", " / ")}</p>
                  <p className="text-xs text-slate-500">
                    {formatNumber(primaryMarket.volume, 4)} traded in 24h
                  </p>
                </div>
              </div>
              <div className="mt-6 flex items-end justify-between">
                <div>
                  <p className="text-3xl font-semibold tabular-nums text-white">{formatNumber(primaryMarket.lastPrice)}</p>
                  <p className="mt-1 text-sm text-slate-500">Last price</p>
                </div>
                <p className={`text-sm font-medium tabular-nums ${Number(primaryMarket.priceChangePercent) >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {Number(primaryMarket.priceChangePercent) > 0 ? "+" : ""}
                  {Number(primaryMarket.priceChangePercent ?? 0).toFixed(2)}%
                </p>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-800 pt-5 text-sm">
                <div>
                  <p className="text-xs text-slate-500">24h high</p>
                  <p className="mt-1 tabular-nums text-slate-200">{formatNumber(primaryMarket.high)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">24h low</p>
                  <p className="mt-1 tabular-nums text-slate-200">{formatNumber(primaryMarket.low)}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="mt-8 text-sm text-slate-500">Waiting for live market data...</p>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Listed markets" value={String(tickers.length)} />
        <Stat label="24h quote volume" value={totalVolume.toLocaleString(undefined, { maximumFractionDigits: 2 })} />
        <Stat
          label="Top gainer"
          value={topGainer ? `${topGainer.symbol.replace("_", " / ")} · ${Number(topGainer.priceChangePercent).toFixed(2)}%` : "—"}
        />
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">Live markets</h2>
            <p className="mt-1 text-sm text-slate-400">The latest prices from the exchange.</p>
          </div>
          <Link href="/markets" className="text-sm text-blue-400 transition hover:text-blue-300">
            All markets
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tickers.slice(0, 3).map(ticker => {
            const change = Number(ticker.priceChangePercent);
            return (
              <Link
                key={ticker.symbol}
                href={`/trade/${ticker.symbol}`}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-slate-600 hover:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AssetIcon symbol={ticker.symbol.split("_")[0]} size={36} />
                    <p className="font-medium text-white">{ticker.symbol.replace("_", " / ")}</p>
                  </div>
                  <p className={`text-sm font-medium tabular-nums ${change > 0 ? "text-green-400" : change < 0 ? "text-red-400" : "text-slate-400"}`}>
                    {change > 0 ? "+" : ""}{change.toFixed(2)}%
                  </p>
                </div>
                <div className="mt-5 flex items-end justify-between">
                  <p className="text-2xl font-semibold tabular-nums text-white">{formatNumber(ticker.lastPrice)}</p>
                  <p className="text-xs text-slate-500">Vol {formatNumber(ticker.volume, 4)}</p>
                </div>
              </Link>
            );
          })}
          {tickers.length === 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-500">
              Waiting for live market data...
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Feature title="Precise matching" description="Orders are matched using fixed-precision arithmetic so fractional quantities settle correctly." />
        <Feature title="Live depth and trades" description="Watch the order book and tape update in real time over WebSockets." />
        <Feature title="Self-trade protection" description="The engine prevents an order from matching against another order from the same account." />
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold tabular-nums text-white">{value}</p>
    </div>
  );
}

function Feature({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
      <p className="font-medium text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}
