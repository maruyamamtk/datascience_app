import { bernoulliMle, bernoulliSuccesses } from "@/lib/stats/sufficiency";
import { createTopicStore } from "./topicStore";

/** 十分性ラボの操作値（ベルヌーイ列のビット）。 */
export type SufficiencyControls = {
  /** 0/1 のベルヌーイ標本（コインのトグル）。 */
  bits: number[];
};

/** 十分性ラボの派生値。 */
export type SufficiencyDerived = {
  /** 十分統計量＝成功数 T。 */
  successes: number;
  /** 標本サイズ n。 */
  n: number;
  /** 最尤推定量 p̂=T/n。 */
  mle: number;
};

const INITIAL_BITS = [1, 0, 1, 1, 0, 0, 1, 0, 1, 1];

/**
 * 統計量と十分性（D-1）トピックの Zustand ストア（single source of truth）。
 * Control 層（コインのトグル）は action を呼び、Render 層（成功数 T・尤度曲線・MLE の数式）は
 * controls・derived を購読する。frame は順序統計量の整列ステッパーが使う。
 */
export const useSufficiencyStore = createTopicStore<SufficiencyControls, SufficiencyDerived>({
  initialControls: { bits: INITIAL_BITS },
  derive: ({ bits }) => {
    const successes = bernoulliSuccesses(bits);
    return { successes, n: bits.length, mle: bernoulliMle(successes, bits.length) };
  },
});
