import {
  completeCaseEstimate,
  fullDataEstimate,
  generateMissing,
  meanImputationEstimate,
  observedFraction,
  regressionImputationEstimate,
  stochasticRegressionEstimate,
  type Estimate,
  type Mechanism,
  type MissUnit,
} from "@/lib/stats/missing";
import { mulberry32 } from "@/lib/stats/random";
import { createTopicStore } from "./topicStore";

export const N = 2000;

/** 欠測値ラボの操作値。 */
export type MissControls = {
  /** 欠測メカニズム。 */
  mechanism: Mechanism;
  /** 欠測率（0〜1）。 */
  missRate: number;
  /** メカニズムの依存の強さ。 */
  strength: number;
};

/** 欠測値ラボの派生値。 */
export type MissDerived = {
  units: MissUnit[];
  observedFrac: number;
  /** 真値・完全ケース・平均代入・回帰代入・確率的回帰代入。 */
  estimates: Estimate[];
  /** 真の平均。 */
  trueMean: number;
  /** 真の SD。 */
  trueSd: number;
};

/**
 * 欠測値の処理（O-1）トピックの Zustand ストア（single source of truth）。
 * Control 層（メカニズム・欠測率・依存の強さ）は action を呼び、Render 層（MissingLab の
 * 散布図・推定平均バー・SDバー・強連動数式）は controls・derived を購読する。
 * MCAR では完全ケースが不偏、MAR では回帰代入で回復、MNAR では観測変数だけでは戻せない、を体感する。
 * frame は補完法ステッパーが使う。
 */
export const useMissingStore = createTopicStore<MissControls, MissDerived>({
  initialControls: { mechanism: "MAR", missRate: 0.4, strength: 0.28 },
  derive: ({ mechanism, missRate, strength }) => {
    const units = generateMissing({
      n: N,
      beta0: 10,
      beta1: 3,
      noise: 2,
      mechanism,
      missRate,
      strength,
      rng: mulberry32(20250067),
    });
    const full = fullDataEstimate(units);
    return {
      units,
      observedFrac: observedFraction(units),
      trueMean: full.mean,
      trueSd: full.sd,
      estimates: [
        full,
        completeCaseEstimate(units),
        meanImputationEstimate(units),
        regressionImputationEstimate(units),
        stochasticRegressionEstimate(units, mulberry32(777)),
      ],
    };
  },
});
