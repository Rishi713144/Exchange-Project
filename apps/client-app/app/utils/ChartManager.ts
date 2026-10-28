import {
  ColorType,
  createChart as createLightWeightChart,
  CrosshairMode,
  ISeriesApi,
  UTCTimestamp,
} from "lightweight-charts";

export class ChartManager {
  private candleSeries: ISeriesApi<"Candlestick">;
  private lastUpdateTime: number = 0;
  private chart: any;
  private currentBar: {
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
  } = {
    open: null,
    high: null,
    low: null,
    close: null,
  };

  constructor(
    ref: any,
    initialData: any[],
    layout: { background: string; color: string }
  ) {
    const chart = createLightWeightChart(ref, {
      autoSize: true,
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(148, 163, 184, 0.45)",
          labelBackgroundColor: "#1f2937",
        },
        horzLine: {
          color: "rgba(148, 163, 184, 0.45)",
          labelBackgroundColor: "#1f2937",
        },
      },
      rightPriceScale: {
        visible: true,
        borderColor: "rgba(148, 163, 184, 0.2)",
        scaleMargins: {
          top: 0.1,
          bottom: 0.15,
        },
        entireTextOnly: true,
      },
      timeScale: {
        visible: true,
        timeVisible: true,
        secondsVisible: false,
        borderColor: "rgba(148, 163, 184, 0.2)",
        rightOffset: 4,
      },
      grid: {
        horzLines: {
          color: "rgba(148, 163, 184, 0.08)",
        },
        vertLines: {
          color: "rgba(148, 163, 184, 0.08)",
        },
      },
      layout: {
        background: {
          type: ColorType.Solid,
          color: layout.background,
        },
        textColor: "#9ca3af",
      },
      localization: {
        priceFormatter: (price: number) => price.toFixed(2),
      },
    });
    this.chart = chart;
    this.candleSeries = chart.addCandlestickSeries({
      upColor: "#16c784",
      downColor: "#ea3943",
      borderVisible: false,
      wickUpColor: "#16c784",
      wickDownColor: "#ea3943",
      priceFormat: {
        type: "price",
        precision: 2,
        minMove: 0.01,
      },
    });

    this.candleSeries.setData(
      initialData.map((data) => ({
        ...data,
        time: (data.timestamp / 1000) as UTCTimestamp,
      }))
    );
    this.chart.timeScale().fitContent();
  }
  public update(updatedPrice: any) {
    if (!this.lastUpdateTime) {
      this.lastUpdateTime = new Date().getTime();
    }

    this.candleSeries.update({
      time: (this.lastUpdateTime / 1000) as UTCTimestamp,
      close: updatedPrice.close,
      low: updatedPrice.low,
      high: updatedPrice.high,
      open: updatedPrice.open,
    });

    if (updatedPrice.newCandleInitiated) {
      this.lastUpdateTime = updatedPrice.time;
    }
  }
  public destroy() {
    this.chart.remove();
  }
}
