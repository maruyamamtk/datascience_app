import {
  accuracyOf,
  argmaxIndex,
  businessValueOf,
  confusionAt,
  type ConfusionCounts,
  generateCustomers,
  sweepThresholds,
  type ThresholdPoint,
} from "@/lib/stats/metrics-and-kpi";
import { createTopicStore } from "./topicStore";

// ────────────────────────────────────────────────────────────
// 固定データ（決定的LCG）
// ────────────────────────────────────────────────────────────

const CUSTOMER_SEED = 20260719;
export const CUSTOMERS = generateCustomers(CUSTOMER_SEED);

export const THRESHOLD_MIN = 0;
export const THRESHOLD_MAX = 1;
export const THRESHOLD_STEP = 0.025;

export const REVENUE_TP_MIN = 1000;
export const REVENUE_TP_MAX = 10000;
export const COST_FP_MIN = 100;
export const COST_FP_MAX = 3000;
export const COST_FN_MIN = 500;
export const COST_FN_MAX = 8000;

// ────────────────────────────────────────────────────────────
// メインストア（BusinessImpactLab + KpiDecompositionStepper）
// ────────────────────────────────────────────────────────────

export type MainControls = {
  /** 現在の分類しきい値（0〜1）。 */
  threshold: number;
  /** TP（送って買った）の純利益。 */
  revenueTP: number;
  /** FP（送ったが買わなかった）の無駄コスト。 */
  costFP: number;
  /** FN（送らなかったが本当は買った）の機会損失。 */
  costFN: number;
};

export type MainDerived = {
  threshold: number;
  revenueTP: number;
  costFP: number;
  costFN: number;
  /** 現在のしきい値での混同行列。 */
  confusion: ConfusionCounts;
  /** 現在のしきい値での正解率。 */
  accuracy: number;
  /** 現在のしきい値での期待ビジネスインパクト。 */
  businessValue: number;
  /** しきい値を0..1でスイープした正解率・期待ビジネスインパクトの曲線。 */
  curve: ThresholdPoint[];
  /** 正解率を最大化するしきい値。 */
  bestAccuracyThreshold: number;
  bestAccuracy: number;
  /** 期待ビジネスインパクトを最大化するしきい値。 */
  bestBusinessThreshold: number;
  bestBusinessValue: number;
  /** 2つの最適しきい値がずれているか（表示閾値の解像度で判定）。 */
  thresholdsDiverge: boolean;
};

/**
 * 技術指標（正解率）とビジネスKPI（期待ビジネスインパクト）の乖離ラボが購読するメインストア。
 * `curve` は controls（revenueTP/costFP/costFN）だけから毎回ゼロから再計算する純関数
 * （imbalanced-anomaly.ts の smoteSteps と同じ設計）。KpiDecompositionStepper は
 * このストアの `frame`（1つだけのステッパー, tasks/lessons.md #76 の判断目安）を共用する。
 */
export const useMetricsKpiStore = createTopicStore<MainControls, MainDerived>({
  initialControls: { threshold: 0.5, revenueTP: 6000, costFP: 800, costFN: 4500 },
  initialFrameCount: 4,
  derive: ({ threshold, revenueTP, costFP, costFN }) => {
    const confusion = confusionAt(CUSTOMERS, threshold);
    const accuracy = accuracyOf(confusion);
    const businessValue = businessValueOf(confusion, revenueTP, costFP, costFN);
    const curve = sweepThresholds(CUSTOMERS, revenueTP, costFP, costFN);

    const bestAccIdx = argmaxIndex(curve, (p) => p.accuracy);
    const bestBizIdx = argmaxIndex(curve, (p) => p.businessValue);
    const bestAccuracyThreshold = curve[bestAccIdx].threshold;
    const bestBusinessThreshold = curve[bestBizIdx].threshold;

    return {
      threshold,
      revenueTP,
      costFP,
      costFN,
      confusion,
      accuracy,
      businessValue,
      curve,
      bestAccuracyThreshold,
      bestAccuracy: curve[bestAccIdx].accuracy,
      bestBusinessThreshold,
      bestBusinessValue: curve[bestBizIdx].businessValue,
      thresholdsDiverge: Math.abs(bestAccuracyThreshold - bestBusinessThreshold) > 1e-6,
    };
  },
});
