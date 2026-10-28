"use client";
import { useEffect, useState } from "react";
import type { Ticker } from "../utils/types";
import { getTicker } from "../utils/httpClient";
import { SignalingManager } from "../utils/SignalingManager";
import { AssetIcon } from "./core/AssetIcon";

function display(value?: string) {
    if (value === undefined || value === "") {
        return "—";
    }
    const parsed = Number(value);
    return Number.isFinite(parsed)
        ? parsed.toLocaleString(undefined, { maximumFractionDigits: 8 })
        : value;
}

export const MarketBar = ({ market }: { market: string }) => {
    const [ticker, setTicker] = useState<Ticker | null>(null);
    const [baseAsset, quoteAsset] = market.split("_");

    useEffect(() => {
        let active = true;
        const signalingManager = SignalingManager.getInstance();
        const channel = `ticker@${market}`;

        getTicker(market)
            .then(data => {
                if (active) setTicker(data);
            })
            .catch(err => console.error("Failed to load ticker", err));

        signalingManager.registerCallback("ticker", (data: Partial<Ticker>) => {
            setTicker(previous => ({
                firstPrice: data.firstPrice ?? previous?.firstPrice ?? '',
                high: data.high ?? previous?.high ?? '',
                lastPrice: data.lastPrice ?? previous?.lastPrice ?? '',
                low: data.low ?? previous?.low ?? '',
                priceChange: data.priceChange ?? previous?.priceChange ?? '',
                priceChangePercent: data.priceChangePercent ?? previous?.priceChangePercent ?? '',
                quoteVolume: data.quoteVolume ?? previous?.quoteVolume ?? '',
                symbol: data.symbol ?? previous?.symbol ?? market,
                trades: data.trades ?? previous?.trades ?? '',
                volume: data.volume ?? previous?.volume ?? '',
            }));
        }, channel);

        signalingManager.sendMessage({ method: "SUBSCRIBE", params: [channel] });

        return () => {
            active = false;
            signalingManager.deRegisterCallback("ticker", channel);
            signalingManager.sendMessage({ method: "UNSUBSCRIBE", params: [channel] });
        };
    }, [market]);

    const priceChange = Number(ticker?.priceChange ?? 0);
    const changeClass = priceChange > 0 ? "text-green-400" : priceChange < 0 ? "text-red-400" : "text-slate-300";

    return (
        <div className="flex items-center justify-between gap-6 overflow-x-auto border-b border-slate-800 px-4 py-3">
            <div className="flex shrink-0 items-center gap-3">
                <div className="flex items-center">
                    <AssetIcon symbol={baseAsset} size={30} className="z-10" />
                    <AssetIcon symbol={quoteAsset} size={30} className="-ml-2" />
                </div>
                <div>
                    <p className="text-base font-semibold text-white">{baseAsset} / {quoteAsset}</p>
                    <p className="text-xs text-slate-500">Spot</p>
                </div>
            </div>

            <div className="flex items-end gap-8">
                <div>
                    <p className={`text-lg font-semibold tabular-nums ${changeClass}`}>{display(ticker?.lastPrice)}</p>
                    <p className="text-xs text-slate-500">Last price</p>
                </div>
                <div>
                    <p className={`text-sm font-medium tabular-nums ${changeClass}`}>
                        {priceChange > 0 ? "+" : ""}{display(ticker?.priceChange)} ({Number(ticker?.priceChangePercent ?? 0).toFixed(2)}%)
                    </p>
                    <p className="text-xs text-slate-500">24h change</p>
                </div>
                <div>
                    <p className="text-sm font-medium tabular-nums text-slate-200">{display(ticker?.high)}</p>
                    <p className="text-xs text-slate-500">24h high</p>
                </div>
                <div>
                    <p className="text-sm font-medium tabular-nums text-slate-200">{display(ticker?.low)}</p>
                    <p className="text-xs text-slate-500">24h low</p>
                </div>
                <div>
                    <p className="text-sm font-medium tabular-nums text-slate-200">{display(ticker?.volume)}</p>
                    <p className="text-xs text-slate-500">24h volume ({baseAsset})</p>
                </div>
            </div>
        </div>
    );
}
