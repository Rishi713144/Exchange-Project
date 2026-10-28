"use client";
import { MarketBar } from "@/app/components/MarketBar";
import { SwapUI } from "@/app/components/SwapUI";
import { TradeView } from "@/app/components/TradeView";
import { Trades } from "@/app/components/Trades";
import { Depth } from "@/app/components/depth/Depth";
import { useParams } from "next/navigation";

export default function Page() {
    const { market } = useParams();
    const currentMarket = market as string;

    return <div className="flex flex-row flex-1">
        <div className="flex flex-col flex-1 min-w-0">
            <MarketBar key={currentMarket} market={currentMarket} />
            <div className="flex flex-row border-y border-slate-800" style={{ height: "920px" }}>
                <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex-1 min-h-0">
                        <TradeView market={currentMarket} />
                    </div>
                    <div className="h-[280px] shrink-0">
                        <Trades key={currentMarket} market={currentMarket} />
                    </div>
                </div>
                <div className="flex flex-col w-[250px] overflow-hidden">
                    <Depth key={currentMarket} market={currentMarket} />
                </div>
            </div>
        </div>
        <div className="w-[10px] flex-col border-slate-800 border-l"></div>
        <div>
            <div className="flex flex-col w-[280px]">
                <SwapUI key={currentMarket} market={currentMarket} />
            </div>
        </div>
    </div>
}
