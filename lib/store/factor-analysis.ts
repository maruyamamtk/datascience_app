import {
  communality,
  impliedCorrelation,
  meanCommunality,
  residualSumOfSquares,
  uniqueness,
} from "@/lib/stats/factor-analysis";
import { createTopicStore } from "./topicStore";

/** 観測変数名（4つのテスト項目を1つの «学力» 因子で説明する例）。 */
export const VARIABLE_NAMES = ["国語", "英語", "数学", "理科"];
/** 真の因子負荷パターン（loadingScale=1 でこの値）。観測相関はこれから生成。 */
const TRUE_LOADINGS = [0.85, 0.75, 0.65, 0.55];
/** 観測相関行列（真の1因子モデルの含意相関＝当てはめの目標）。 */
export const OBSERVED_CORR = impliedCorrelation(TRUE_LOADINGS);

/** 因子分析ラボの操作値。 */
export type FactorControls = {
  /** 因子負荷の倍率 loadingScale（1で真値、ずれると残差増）。 */
  loadingScale: number;
};

/** 因子分析ラボの派生値。 */
export type FactorDerived = {
  /** 現在の因子負荷。 */
  loadings: number[];
  /** 含意相関行列。 */
  impliedCorr: number[][];
  /** 観測相関との非対角残差平方和。 */
  residualSS: number;
  /** 各変数の共通性 h²。 */
  communalities: number[];
  /** 各変数の独自性 ψ。 */
  uniquenesses: number[];
  /** 平均共通性。 */
  meanCommunality: number;
};

/**
 * 共分散構造分析・因子分析（H-4）トピックの Zustand ストア（single source of truth）。
 * Control 層（負荷倍率 loadingScale スライダー）は action を呼び、Render 層（含意相関ヒートマップ・観測との残差・
 * 共通性/独自性バー・数式）は controls・derived を購読する。倍率を真値1に合わせると残差が0に近づく。
 * 観測相関は固定。frame は共通性分解のステッパーが使う。
 */
export const useFactorStore = createTopicStore<FactorControls, FactorDerived>({
  initialControls: { loadingScale: 0.6 },
  derive: ({ loadingScale }) => {
    const loadings = TRUE_LOADINGS.map((l) => Math.min(0.99, l * loadingScale));
    return {
      loadings,
      impliedCorr: impliedCorrelation(loadings),
      residualSS: residualSumOfSquares(OBSERVED_CORR, loadings),
      communalities: loadings.map(communality),
      uniquenesses: loadings.map(uniqueness),
      meanCommunality: meanCommunality(loadings),
    };
  },
});
