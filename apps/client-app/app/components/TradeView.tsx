import { useEffect, useRef } from "react";
import { ChartManager } from "../utils/ChartManager";
import { getKlines } from "../utils/httpClient";
import type { KLine } from "../utils/types";

export function TradeView({
  market,
}: {
  market: string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartManagerRef = useRef<ChartManager>(null);

  useEffect(() => {
    const init = async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneHour = 60 * 60;
      let klineData: KLine[] = [];

      try {
        let history = await getKlines(market, "1m", now - 2 * oneHour, now);

        if (history.length < 2) {
          history = await getKlines(market, "1m", now - 7 * 24 * oneHour, now);
        }

        const latest = history.reduce(
          (max, kline) => Math.max(max, Math.floor(new Date(kline.end).getTime() / 1000)),
          0
        );
        klineData = history.filter(
          (kline) => Math.floor(new Date(kline.end).getTime() / 1000) > latest - oneHour
        );
      } catch (e) {}

      if (chartRef) {
        if (chartManagerRef.current) {
          chartManagerRef.current.destroy();
        }
        const chartManager = new ChartManager(
          chartRef.current,
          [
            ...klineData?.map((x) => ({
              close: parseFloat(x.close),
              high: parseFloat(x.high),
              low: parseFloat(x.low),
              open: parseFloat(x.open),
              timestamp: new Date(x.end), 
            })),
          ].sort((x, y) => (x.timestamp < y.timestamp ? -1 : 1)) || [],
          {
            background: "#0e0f14",
            color: "white",
          }
        );
        //@ts-ignore
        chartManagerRef.current = chartManager;
      }
    };
    init();
  }, [market, chartRef]);

  return (
    <>
      <div ref={chartRef} style={{ height: "100%", minHeight: "360px", width: "100%", marginTop: 4 }}></div>
    </>
  );
}
