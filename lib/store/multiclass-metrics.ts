import {
  accuracyOf,
  averageOf,
  type AverageMetrics,
  type AveragingMethod,
  CLASS_LABELS,
  CONFUSION_MATRIX,
  type PerClassMetrics,
  perClassMetricsOf,
} from "@/lib/stats/multiclass-metrics";
import { createTopicStore } from "./topicStore";

// ────────────────────────────────────────────────────────────
// 固定データ(静的な混同行列)・クラスごとの指標(controlsに依存しない)
// ────────────────────────────────────────────────────────────

export const PER_CLASS: PerClassMetrics[] = perClassMetricsOf(CONFUSION_MATRIX, CLASS_LABELS);
export const ACCURACY_VALUE: number = accuracyOf(CONFUSION_MATRIX);

export const INITIAL_CLASS_INDEX = 0;
export const INITIAL_METHOD: AveragingMethod = "macro";

// ────────────────────────────────────────────────────────────
// メインストア(ConfusionMatrixLab + OvrStepper + AveragingLabが共用。
// ステッパーは1つだけなのでtasks/lessons.md #76の判断目安どおりmainストアのframeを共用してよい)
// ────────────────────────────────────────────────────────────

export type MainControls = {
  /** ConfusionMatrixLabで選択中のクラス(One-vs-Rest分解の対象)。single source of truth。 */
  selectedClass: number;
  /** AveragingLabで選択中の平均化方式。single source of truth。 */
  method: AveragingMethod;
};

export type MainDerived = {
  perClass: PerClassMetrics[];
  selected: PerClassMetrics;
  macro: AverageMetrics;
  micro: AverageMetrics;
  weighted: AverageMetrics;
  accuracy: number;
};

/**
 * 多クラス分類の評価指標トピックのZustandストア(single source of truth)。
 * Control層(クラス選択・平均化方式選択)はsetControlを呼び、Render層(混同行列ヒートマップ/
 * One-vs-Rest内訳/precision・recall・f1の数式/Macro・Micro・Weightedの比較)はこのストアの
 * `controls`・`derived`を購読する。OvrStepperは同じストアの`frame`を共用する
 * (ステッパーは1つだけなので#76の判断目安どおり)。
 */
export const useMulticlassMetricsStore = createTopicStore<MainControls, MainDerived>({
  initialControls: { selectedClass: INITIAL_CLASS_INDEX, method: INITIAL_METHOD },
  initialFrameCount: CLASS_LABELS.length + 2, // overview(1) + 各クラス(N) + summary(1)
  derive: ({ selectedClass }) => ({
    perClass: PER_CLASS,
    selected: PER_CLASS[selectedClass],
    macro: averageOf(PER_CLASS, "macro"),
    micro: averageOf(PER_CLASS, "micro"),
    weighted: averageOf(PER_CLASS, "weighted"),
    accuracy: ACCURACY_VALUE,
  }),
});
