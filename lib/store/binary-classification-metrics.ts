import {
  aucOf,
  classificationMetricsAt,
  type ClassificationMetrics,
  DATA_SEED,
  generateSamples,
  rocPointsOf,
  type RocPoint,
  type Sample,
} from "@/lib/stats/binary-classification-metrics";
import { createTopicStore } from "./topicStore";

// ────────────────────────────────────────────────────────────
// 固定データ(決定的LCG)・静的なROC曲線とAUC
// ────────────────────────────────────────────────────────────

export const SAMPLES: Sample[] = generateSamples(DATA_SEED);
/** ROC曲線の点列(しきい値スイープの全体像。しきい値に依存しない静的な曲線)。 */
export const ROC_POINTS: RocPoint[] = rocPointsOf(SAMPLES);
export const AUC_VALUE: number = aucOf(ROC_POINTS);

export const THRESHOLD_MIN = 0;
export const THRESHOLD_MAX = 1;
export const THRESHOLD_STEP = 0.01;
/** 初期しきい値(0.5、標準的な既定値)。 */
export const INITIAL_THRESHOLD = 0.5;

// ────────────────────────────────────────────────────────────
// メインストア(ScoreLab + RocStepperが共用, 1トピック1ステッパーなので
// tasks/lessons.md #76 の判断目安どおりmainストアのframeを共用してよい)
// ────────────────────────────────────────────────────────────

export type MainControls = {
  /** 分類しきい値(0〜1)。single source of truth。 */
  threshold: number;
};

export type MainDerived = ClassificationMetrics;

/**
 * 二値分類の評価指標トピックのZustandストア(single source of truth)。
 * Control層(しきい値スライダー)はsetControlを呼び、Render層(ヒストグラム/混同行列/
 * accuracy・precision・recall・F1の数式・ROC曲線上の現在点)はこのストアの
 * `controls`・`derived`を購読する。RocStepperは同じストアの`frame`を共用する
 * (ステッパーは1つだけなので#76の判断目安どおり)。
 */
export const useBinaryClassificationMetricsStore = createTopicStore<MainControls, MainDerived>({
  initialControls: { threshold: INITIAL_THRESHOLD },
  initialFrameCount: SAMPLES.length + 2, // overview(1) + 各サンプル(N) + summary(1)
  derive: ({ threshold }) => classificationMetricsAt(SAMPLES, threshold),
});
