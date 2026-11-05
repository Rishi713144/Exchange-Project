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
  const chartManagerRef = useRef<ChartManager | null>(null);

  useEffect(() => {
    let active = true;

    const init = async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneHour = 60 * 60;
      let klineData: KLine[] = [];

      try {
        let history = await getKlines(market, "1m", now - 2 * oneHour, now);

        if (history.length < 2) {
          history = await getKlines(market, "1m", now - 7 * 24 * oneHour, now);
        }

        klineData = history;
      } catch (error) {
        console.error(`Failed to load chart data for ${market}`, error);
      }

      if (active && chartRef.current) {
        if (chartManagerRef.current) {
          chartManagerRef.current.destroy();
        }
        const chartManager = new ChartManager(
          chartRef.current,
          [
            ...klineData.map((x) => ({
              close: parseFloat(x.close),
              high: parseFloat(x.high),
              low: parseFloat(x.low),
              open: parseFloat(x.open),
              timestamp: Math.floor(new Date(x.end).getTime() / 1000),
            })),
          ].sort((x, y) => (x.timestamp < y.timestamp ? -1 : 1)) || [],
          {
            background: "#0e0f14",
            color: "white",
          }
        );
        chartManagerRef.current = chartManager;
      }
    };

    init();

    return () => {
      active = false;
      chartManagerRef.current?.destroy();
      chartManagerRef.current = null;
    };
  }, [market]);

  return (
    <>
      <div ref={chartRef} style={{ height: "100%", minHeight: "360px", width: "100%", marginTop: 4 }}></div>
    </>
  );
}
