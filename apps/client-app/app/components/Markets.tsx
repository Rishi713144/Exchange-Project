"use client";

import { useEffect, useState } from "react";
import type { Ticker } from "../utils/types";
import { getTickers } from "../utils/httpClient";
import { useRouter } from "next/navigation";
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

export const Markets = () => {
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = () => {
      getTickers()
        .then(data => {
          if (!active) return;
          setTickers(data);
          setError(null);
        })
        .catch(err => {
          console.error("Failed to load markets", err);
          if (active) setError("Unable to load markets right now.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };

    load();
    const interval = setInterval(load, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex w-full max-w-[1280px] flex-1 flex-col">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Markets</h1>
          <p className="mt-1 text-sm text-slate-400">Live prices and 24 hour trading activity.</p>
        </div>
        <span className="text-xs text-slate-500">Updates every 5s</span>
      </div>

      <div className="flex w-full flex-1 flex-col overflow-x-auto rounded-lg bg-baseBackgroundL1 px-5 py-3">
        <table className="w-full min-w-[720px] table-auto">
          <MarketHeader />
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-2 py-8 text-center text-sm text-slate-500">Loading markets...</td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={6} className="px-2 py-8 text-center text-sm text-red-400">{error}</td>
              </tr>
            )}
            {!loading && !error && tickers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-2 py-8 text-center text-sm text-slate-500">No markets available.</td>
              </tr>
            )}
            {!loading && !error && tickers.map(m => <MarketRow key={m.symbol} market={m} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
};

function MarketRow({ market }: { market: Ticker }) {
  const router = useRouter();
  const [baseAsset, quoteAsset] = market.symbol.split("_");
  const change = Number(market.priceChangePercent);
  const changeClass = change > 0 ? "text-green-400" : change < 0 ? "text-red-400" : "text-slate-300";

  return (
    <tr
      className="w-full cursor-pointer border-t border-baseBorderLight hover:bg-white/5"
      onClick={() => router.push(`/trade/${market.symbol}`)}
    >
      <td className="px-1 py-3">
        <div className="flex items-center">
          <AssetIcon symbol={baseAsset} size={40} />
          <div className="ml-4 flex flex-col">
            <p className="whitespace-nowrap text-base font-medium text-baseTextHighEmphasis">
              {baseAsset} / {quoteAsset}
            </p>
            <p className="text-xs leading-5 text-baseTextMedEmphasis">{market.symbol}</p>
          </div>
        </div>
      </td>
      <td className="px-1 py-3 text-base font-medium tabular-nums">{formatNumber(market.lastPrice)}</td>
      <td className="px-1 py-3 text-sm tabular-nums text-slate-300">{formatNumber(market.high)}</td>
      <td className="px-1 py-3 text-sm tabular-nums text-slate-300">{formatNumber(market.low)}</td>
      <td className="px-1 py-3 text-sm tabular-nums text-slate-300">{formatNumber(market.volume, 4)}</td>
      <td className={`px-1 py-3 text-sm font-medium tabular-nums ${changeClass}`}>
        {Number.isFinite(change) ? `${change > 0 ? "+" : ""}${change.toFixed(2)}%` : "—"}
      </td>
    </tr>
  );
}

function MarketHeader() {
  const columns = ["Name", "Price", "24h High", "24h Low", "24h Volume", "24h Change"];
  return (
    <thead>
      <tr>
        {columns.map(column => (
          <th key={column} className="px-2 py-3 text-left text-sm font-normal text-baseTextMedEmphasis">
            {column}
          </th>
        ))}
      </tr>
    </thead>
  );
}
