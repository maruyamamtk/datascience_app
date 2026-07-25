import {
  PRIMARY_PAYOFF_MATRIX,
  expectedValueCriterion,
  type CriterionResult,
} from "@/lib/stats/decision-analysis";
import {
  evpi,
  perfectInfoBestActionPerState,
  perfectInformationEsv,
  priorPosteriorAnalysis,
  symmetricForecast,
  type PriorPosteriorAnalysisResult,
} from "@/lib/stats/value-of-information";
import { createTopicStore } from "./topicStore";

// ────────────────────────────────────────────────────────────
// 情報の価値(P-3)トピックのストア(single source of truth)。
// - 利得行列は決定分析(P-1)のPRIMARY_PAYOFF_MATRIX(工場稼働台数×景気)をそのまま再利用する
//   (このトピックの主題は"利得行列の編集"ではなく"確率・情報の質を動かしたときのEVPI/VOIの変化")。
// - 操作値は「好況になる事前確率probGood」「予報の的中率forecastAccuracy」の2つだけ
//   (EvpiStepper・EvpiLab・PriorPosteriorLabがこのストアのcontrols・derivedを共有して読む)。
// - ステッパー(EvpiStepper)は1トピックに1つだけなので、tasks/lessons.md #76の基準どおり
//   メインストアのframeをそのまま共用する(専用の空ストアに分離するのはオーバーエンジニアリング)。
// ────────────────────────────────────────────────────────────

export type MainControls = {
  /** 好況になる事前確率(不況は1-probGoodとする。決定分析(P-1)のprobGoodと同じ役割)。 */
  probGood: number;
  /** 予報(シグナル)の的中率q(0.5=無情報〜1=完全情報)。 */
  forecastAccuracy: number;
};

export type MainDerived = {
  actions: string[];
  states: string[];
  /** 事前確率のみでのESV(全行動のスコアと最善の行動)。 */
  esv: CriterionResult;
  /** 完全情報があった場合の期待利得 Σ_θ P(θ)max_a c(a,θ)。 */
  perfectInfoEsv: number;
  /** 状態ごとの最善行動のindex(完全情報のもとでの選択、states と同じ順)。 */
  perfectInfoBestAction: number[];
  /** EVPI = perfectInfoEsv - max_a ESV(a)。 */
  evpi: number;
  /** 事前/事後分析の結果(現在のforecastAccuracyに基づく)。 */
  posteriorAnalysis: PriorPosteriorAnalysisResult;
};

export const INITIAL_CONTROLS: MainControls = {
  probGood: 0.5,
  forecastAccuracy: 0.8,
};

/**
 * 情報の価値(P-3)トピックのZustandストア。
 * Control層(probGood・forecastAccuracyのスライダー)はsetControlを呼び、
 * Render層(EvpiStepper・EvpiLab・PriorPosteriorLab)はこのストアのcontrols・derivedを
 * 購読するだけ(3層疎結合、CLAUDE.md §2)。
 */
export const useValueOfInformationStore = createTopicStore<MainControls, MainDerived>({
  initialControls: INITIAL_CONTROLS,
  derive: (controls) => {
    const matrix = PRIMARY_PAYOFF_MATRIX;
    const probabilities = [controls.probGood, 1 - controls.probGood];

    const esv = expectedValueCriterion(matrix, probabilities);
    const forecast = symmetricForecast(controls.forecastAccuracy);
    const posteriorAnalysis = priorPosteriorAnalysis(matrix, probabilities, forecast);

    return {
      actions: [...matrix.actions],
      states: [...matrix.states],
      esv,
      perfectInfoEsv: perfectInformationEsv(matrix, probabilities),
      perfectInfoBestAction: perfectInfoBestActionPerState(matrix),
      evpi: evpi(matrix, probabilities),
      posteriorAnalysis,
    };
  },
});
