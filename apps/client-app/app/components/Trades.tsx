"use client";

import { useEffect, useState } from "react";
import { getTrades } from "../utils/httpClient";
import { SignalingManager } from "../utils/SignalingManager";
import type { Trade } from "../utils/types";

function formatTime(timestamp: number) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
        return "--:--:--";
    }
    return date.toLocaleTimeString("en-US", { hour12: false });
}

function formatAmount(value: string) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed.toFixed(6).replace(/0+$/, "").replace(/\.$/, "") : value;
}

export function Trades({ market }: { market: string }) {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let active = true;
        const signalingManager = SignalingManager.getInstance();
        const channel = `trade@${market}`;

        signalingManager.registerCallback("trade", (trade: Trade) => {
            setTrades(previous => {
                const withoutDuplicate = previous.filter(item => item.id !== trade.id);
                return [trade, ...withoutDuplicate].slice(0, 50);
            });
        }, channel);

        signalingManager.sendMessage({ method: "SUBSCRIBE", params: [channel] });

        getTrades(market)
            .then(initialTrades => {
                if (!active) return;
                setTrades(initialTrades.slice(0, 50));
                setLoaded(true);
            })
            .catch(err => {
                console.error("Failed to load trades", err);
                if (active) setLoaded(true);
            });

        return () => {
            active = false;
            signalingManager.sendMessage({ method: "UNSUBSCRIBE", params: [channel] });
            signalingManager.deRegisterCallback("trade", channel);
        };
    }, [market]);

    return (
        <div className="flex h-full flex-col overflow-hidden border-t border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
                <span className="text-sm font-medium text-white">Recent trades</span>
                <span className="text-xs text-slate-500">{market.replace("_", " / ")}</span>
            </div>
            <div className="flex justify-between px-3 py-2 text-xs text-slate-500">
                <div>Price</div>
                <div>Amount</div>
                <div>Time</div>
            </div>
            <div className="flex-1 overflow-y-auto">
                {!loaded && trades.length === 0 && (
                    <div className="px-3 py-4 text-xs text-slate-500">Loading trades...</div>
                )}
                {loaded && trades.length === 0 && (
                    <div className="px-3 py-4 text-xs text-slate-500">No trades yet</div>
                )}
                {trades.map(trade => (
                    <div key={`${trade.id}-${trade.timestamp}`} className="flex justify-between px-3 py-1 text-xs tabular-nums">
                        <div className={trade.isBuyerMaker ? "text-red-400" : "text-green-400"}>
                            {trade.price}
                        </div>
                        <div className="text-slate-300">{formatAmount(trade.quantity)}</div>
                        <div className="text-slate-500">{formatTime(trade.timestamp)}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
