"use client";

import { useEffect, useState } from "react";
import { getDepth, getTicker, getTrades } from "../../utils/httpClient";
import { BidTable } from "./BidTable";
import { AskTable } from "./AskTable";
import { SignalingManager } from "../../utils/SignalingManager";

type Level = [string, string];

export function Depth({ market }: { market: string }) {
    const [bids, setBids] = useState<Level[]>();
    const [asks, setAsks] = useState<Level[]>();
    const [price, setPrice] = useState<string>();

    useEffect(() => {
        const signalingManager = SignalingManager.getInstance();
        const channel = `depth@${market}`;

        signalingManager.registerCallback("depth", (data: { bids: Level[]; asks: Level[] }) => {
            setBids((originalBids) => {
                const bidsAfterUpdate = [...(originalBids || [])];

                for (let i = 0; i < bidsAfterUpdate.length; i++) {
                    for (let j = 0; j < data.bids.length; j++) {
                        if (bidsAfterUpdate[i][0] === data.bids[j][0]) {
                            bidsAfterUpdate[i][1] = data.bids[j][1];
                            if (Number(bidsAfterUpdate[i][1]) === 0) {
                                bidsAfterUpdate.splice(i, 1);
                            }
                            break;
                        }
                    }
                }

                const knownBidPrices = new Set(bidsAfterUpdate.map(x => x[0]));
                for (let j = 0; j < data.bids.length; j++) {
                    if (Number(data.bids[j][1]) !== 0 && !knownBidPrices.has(data.bids[j][0])) {
                        bidsAfterUpdate.push(data.bids[j]);
                        knownBidPrices.add(data.bids[j][0]);
                    }
                }
                bidsAfterUpdate.sort((x, y) => Number(y[0]) > Number(x[0]) ? -1 : 1);
                return bidsAfterUpdate;
            });

            setAsks((originalAsks) => {
                const asksAfterUpdate = [...(originalAsks || [])];

                for (let i = 0; i < asksAfterUpdate.length; i++) {
                    for (let j = 0; j < data.asks.length; j++) {
                        if (asksAfterUpdate[i][0] === data.asks[j][0]) {
                            asksAfterUpdate[i][1] = data.asks[j][1];
                            if (Number(asksAfterUpdate[i][1]) === 0) {
                                asksAfterUpdate.splice(i, 1);
                            }
                            break;
                        }
                    }
                }

                const knownAskPrices = new Set(asksAfterUpdate.map(x => x[0]));
                for (let j = 0; j < data.asks.length; j++) {
                    if (Number(data.asks[j][1]) !== 0 && !knownAskPrices.has(data.asks[j][0])) {
                        asksAfterUpdate.push(data.asks[j]);
                        knownAskPrices.add(data.asks[j][0]);
                    }
                }
                asksAfterUpdate.sort((x, y) => Number(y[0]) > Number(x[0]) ? 1 : -1);
                return asksAfterUpdate;
            });
        }, channel);

        signalingManager.sendMessage({ method: "SUBSCRIBE", params: [channel] });

        const loadDepth = () => {
            getDepth(market).then(d => {
                setBids(d.bids ?? []);
                setAsks(d.asks ?? []);
            }).catch(() => undefined);
        };

        loadDepth();
        const depthRefresh = setInterval(loadDepth, 3000);

        getTicker(market).then(t => setPrice(t.lastPrice));
        getTrades(market).then(t => {
            if (t.length > 0) setPrice(t[0].price);
        });

        return () => {
            clearInterval(depthRefresh);
            signalingManager.sendMessage({ method: "UNSUBSCRIBE", params: [channel] });
            signalingManager.deRegisterCallback("depth", channel);
        };
    }, [market]);

    return <div>
        <TableHeader />
        {asks && <AskTable asks={asks} />}
        {price && <div>{price}</div>}
        {bids && <BidTable bids={bids} />}
    </div>;
}

function TableHeader() {
    return <div className="flex justify-between text-xs">
        <div className="text-white">Price</div>
        <div className="text-slate-500">Size</div>
        <div className="text-slate-500">Total</div>
    </div>;
}
