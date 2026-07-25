import {
  calibrationBins,
  costLossOptimalThreshold,
  evaluateCostLoss,
  FORECAST_BASE,
  brierScore as brierScoreOf,
  murphyDecomposition,
  outcomesOf,
  predictedProbabilities,
  sharpness,
  type CalibrationBin,
  type CostLossEvaluation,
  type MurphyDecomposition,
} from "@/lib/stats/probabilistic-forecasting";
import { createTopicStore } from "./topicStore";

// ────────────────────────────────────────────────────────────
// 確率予測の評価(P-5)トピックのストア(single source of truth)。
// - 操作値は「確信度スケールconfidenceScale(信頼度曲線ラボ)」「コストcostL/ロスlossL
//   (コスト/ロスラボ)」の3つ。合成データセット(FORECAST_BASE)自体は操作に依存しない
//   固定データなので、controlsには含めずderiveの中で参照する。
// - ステッパー(BrierScoreStepper)はトピック内に1つだけなので、tasks/lessons.md #76の
//   判断の目安どおりメインストアのframeをそのまま共用する(専用の空ストアは作らない)。
// ────────────────────────────────────────────────────────────

export type MainControls = {
  /** 信頼度曲線ラボ: 予測確率の歪め方(1=歪みなし、>1=過信、<1=自信不足)。 */
  confidenceScale: number;
  /** コスト/ロスラボ: 対策コストC。 */
  costC: number;
  /** コスト/ロスラボ: 対策しなかったときのロスL。 */
  lossL: number;
};

export type MainDerived = {
  predicted: number[];
  outcomes: number[];
  brierScore: number;
  decomposition: MurphyDecomposition;
  bins: CalibrationBin[];
  sharpnessValue: number;
  costLossThreshold: number;
  costLoss: CostLossEvaluation;
};

export const N_BINS = 10;

export const INITIAL_CONTROLS: MainControls = {
  confidenceScale: 1,
  costC: 3,
  lossL: 10,
};

/**
 * 確率予測の評価(P-5)トピックのZustandストア。
 * Control層(スライダー)はsetControlを呼び、Render層(CalibrationLab・CostLossLab等)は
 * このストアのcontrols・derivedを購読するだけ(3層疎結合、CLAUDE.md §2)。
 */
export const useProbabilisticForecastingStore = createTopicStore<MainControls, MainDerived>({
  initialControls: INITIAL_CONTROLS,
  derive: (controls) => {
    const predicted = predictedProbabilities(FORECAST_BASE, controls.confidenceScale, N_BINS);
    const outcomes = outcomesOf(FORECAST_BASE);
    const decomposition = murphyDecomposition(predicted, outcomes, N_BINS);
    const bins = calibrationBins(predicted, outcomes, N_BINS);
    const sharpnessValue = sharpness(predicted);
    const costLossThreshold = costLossOptimalThreshold(controls.costC, controls.lossL);
    const costLoss = evaluateCostLoss(predicted, outcomes, controls.costC, controls.lossL);

    return {
      predicted,
      outcomes,
      brierScore: brierScoreOf(predicted, outcomes),
      decomposition,
      bins,
      sharpnessValue,
      costLossThreshold,
      costLoss,
    };
  },
});
