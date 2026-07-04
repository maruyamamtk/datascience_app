import {
  autocovariance,
  generateSeries,
  movingAverage,
  type SeriesParts,
} from "@/lib/stats/time-series";
import { mulberry32 } from "@/lib/stats/random";
import { createTopicStore } from "./topicStore";

/** 系列長・季節周期は固定。 */
export const N = 120;
export const PERIOD = 12;

/** 時系列基礎ラボの操作値。 */
export type TimeSeriesControls = {
  /** トレンドの傾き。 */
  slope: number;
  /** 季節成分の振幅。 */
  amp: number;
  /** ノイズの標準偏差。 */
  noiseSd: number;
  /** 移動平均の窓幅（奇数）。 */
  window: number;
};

/** 時系列基礎ラボの派生値。 */
export type TimeSeriesDerived = {
  /** 成分分解つきの合成系列。 */
  parts: SeriesParts;
  /** 移動平均で平滑化した系列。 */
  smoothed: number[];
  /** 元系列の分散 γ(0)。 */
  rawVar: number;
  /** 平滑化系列の分散 γ(0)（平滑化でどれだけ均されたか）。 */
  smoothedVar: number;
};

/**
 * 時系列解析の基礎（M-1）トピックの Zustand ストア（single source of truth）。
 * Control 層（傾き・振幅・ノイズ・窓幅スライダー）は action を呼び、Render 層（系列プロット・成分・
 * 移動平均線・分散・数式）は controls・derived を購読する。窓幅を広げるとギザギザが均される。
 * データは固定シードで再現可能。frame は自己相関（ACF）のステッパーが使う。
 */
export const useTimeSeriesStore = createTopicStore<TimeSeriesControls, TimeSeriesDerived>({
  initialControls: { slope: 0.15, amp: 3, noiseSd: 1, window: 7 },
  derive: ({ slope, amp, noiseSd, window }) => {
    const parts = generateSeries({
      n: N,
      slope,
      amp,
      period: PERIOD,
      noiseSd,
      base: 10,
      rng: mulberry32(20250058),
    });
    const win = Math.max(1, Math.round(window) | 1); // 奇数に丸める
    const smoothed = movingAverage(parts.value, win);
    return {
      parts,
      smoothed,
      rawVar: autocovariance(parts.value, 0),
      smoothedVar: autocovariance(smoothed, 0),
    };
  },
});
