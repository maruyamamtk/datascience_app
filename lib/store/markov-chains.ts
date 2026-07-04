import {
  evolve,
  stationaryDistribution,
  totalVariationToStationary,
  type TransitionMatrix,
} from "@/lib/stats/markov";
import { createTopicStore } from "./topicStore";

/** 状態（天気）。 */
export const STATES = ["晴", "曇", "雨"];
/** 初期分布（«晴» から出発）。 */
export const INITIAL_DISTRIBUTION = [1, 0, 0];
/** 収束を見るステップ数。 */
export const EVOLVE_STEPS = 14;

/** rainStick から遷移行列を作る（雨の «続きやすさ» を操作）。 */
export function buildTransition(rainStick: number): TransitionMatrix {
  const leave = 1 - rainStick;
  return [
    [0.7, 0.2, 0.1], // 晴 → 晴/曇/雨
    [0.3, 0.4, 0.3], // 曇 → …
    [leave * 0.6, leave * 0.4, rainStick], // 雨 → 晴/曇/雨（雨が続きやすいほど右が大）
  ];
}

/** マルコフ連鎖ラボの操作値。 */
export type MarkovControls = {
  /** 雨の «続きやすさ» P(雨→雨)（大きいほど雨がちな気候）。 */
  rainStick: number;
};

/** マルコフ連鎖ラボの派生値。 */
export type MarkovDerived = {
  /** 遷移行列。 */
  P: TransitionMatrix;
  /** 定常分布。 */
  stationary: number[];
  /** 初期分布からの分布推移（π_0..π_T）。 */
  evolution: number[][];
  /** 定常分布への総変動距離の列。 */
  tvSeq: number[];
};

/**
 * マルコフ連鎖（L-1）トピックの Zustand ストア（single source of truth）。
 * Control 層（雨の続きやすさ rainStick スライダー）は action を呼び、Render 層（遷移行列・定常分布バー・
 * 分布推移・数式）は controls・derived を購読する。雨が続きやすいほど定常分布の «雨» が増える。
 * frame は分布推移（定常への収束）のステッパーが使う。
 */
export const useMarkovStore = createTopicStore<MarkovControls, MarkovDerived>({
  initialControls: { rainStick: 0.6 },
  derive: ({ rainStick }) => {
    const P = buildTransition(rainStick);
    return {
      P,
      stationary: stationaryDistribution(P),
      evolution: evolve(P, INITIAL_DISTRIBUTION, EVOLVE_STEPS),
      tvSeq: totalVariationToStationary(P, INITIAL_DISTRIBUTION, EVOLVE_STEPS),
    };
  },
});
