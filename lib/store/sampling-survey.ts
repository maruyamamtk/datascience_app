import {
  neymanAllocation,
  populationMean,
  proportionalAllocation,
  srsVariance,
  stratifiedVariance,
  type Stratum,
} from "@/lib/stats/sampling-survey";
import { createTopicStore } from "./topicStore";

/** 母集団の層（固定）。サイズ・平均・ばらつきの異なる3層。 */
export const STRATA: Stratum[] = [
  { name: "都市部", size: 600, mean: 10, sd: 2 },
  { name: "郊外", size: 300, mean: 20, sd: 3 },
  { name: "地方", size: 100, mean: 50, sd: 6 },
];

/** 抽出法。 */
export type SurveyMethod = "srs" | "proportional" | "neyman";

/** 標本調査ラボの操作値。 */
export type SurveyControls = {
  /** 標本サイズ n。 */
  n: number;
  /** 抽出法。 */
  method: SurveyMethod;
};

/** 標本調査ラボの派生値。 */
export type SurveyDerived = {
  /** 母平均（真値）。 */
  popMean: number;
  /** 選んだ抽出法の標本平均の標準誤差。 */
  se: number;
  /** 単純無作為抽出の標準誤差（比較用）。 */
  seSrs: number;
  /** 比例配分の標準誤差。 */
  seProp: number;
  /** ネイマン配分の標準誤差。 */
  seNeyman: number;
  /** 各層の配分（選んだ法）。 */
  allocation: number[];
};

const sqrt = (v: number) => Math.sqrt(Math.max(0, v));

/**
 * 標本調査法（G-2）トピックの Zustand ストア（single source of truth）。
 * Control 層（n スライダー・抽出法トグル）は action を呼び、Render 層（層の棒・各法の標準誤差・配分・数式）は
 * controls・derived を購読する。層化が SRS より SE を下げる（層間変動を除ける）様子を比べる。
 * frame は分散低減のステッパーが使う。
 */
export const useSurveyStore = createTopicStore<SurveyControls, SurveyDerived>({
  initialControls: { n: 100, method: "srs" },
  derive: ({ n, method }) => {
    const seSrs = sqrt(srsVariance(STRATA, n));
    const propAlloc = proportionalAllocation(STRATA, n);
    const neyAlloc = neymanAllocation(STRATA, n);
    const seProp = sqrt(stratifiedVariance(STRATA, propAlloc));
    const seNeyman = sqrt(stratifiedVariance(STRATA, neyAlloc));
    const se = method === "srs" ? seSrs : method === "proportional" ? seProp : seNeyman;
    const allocation =
      method === "srs"
        ? proportionalAllocation(STRATA, n) // SRS は層を区別しない（参考表示）
        : method === "proportional"
          ? propAlloc
          : neyAlloc;
    return { popMean: populationMean(STRATA), se, seSrs, seProp, seNeyman, allocation };
  },
});
