import {
  adasynWeights,
  buildIsolationForest,
  type ClassCounts,
  classCounts,
  computeMoments,
  confusionAt,
  type ConfusionCounts,
  costOptimalThreshold,
  expectedCost,
  generateAdasynSequence,
  generateAnomalyData,
  generateImbalancedData,
  generateSmoteSequence,
  imbalanceRatio,
  isolationScore,
  localReachabilityDensity,
  lofAll,
  lofAt,
  mahalanobisT2,
  majorityBaselineAccuracy,
  meanOf,
  type Moments2D,
  pcaResidualQ,
  percentileCutoffCount,
  type Point2D,
  projectionScore,
  rankByScoreDescending,
  type SmoteStep,
} from "@/lib/stats/imbalanced-anomaly";
import { createTopicStore } from "./topicStore";

// ────────────────────────────────────────────────────────────
// 固定データ（決定的LCG）・事前計算テーブル
// ────────────────────────────────────────────────────────────

const IMBALANCED_SEED = 20260719;
export const IMBALANCED_DATA = generateImbalancedData(IMBALANCED_SEED);
export const MAJORITY_POINTS: Point2D[] = IMBALANCED_DATA.filter((p) => p.label === 0).map((p) => ({ x1: p.x1, x2: p.x2 }));
export const MINORITY_POINTS: Point2D[] = IMBALANCED_DATA.filter((p) => p.label === 1).map((p) => ({ x1: p.x1, x2: p.x2 }));

export const IMBALANCE_COUNTS: ClassCounts = classCounts(IMBALANCED_DATA);
export const IMBALANCE_RATIO: number = imbalanceRatio(IMBALANCE_COUNTS);
export const MAJORITY_BASELINE_ACCURACY: number = majorityBaselineAccuracy(IMBALANCE_COUNTS);

const MAJORITY_MEAN = meanOf(MAJORITY_POINTS);
const MINORITY_MEAN = meanOf(MINORITY_POINTS);
/** 全データ点の疑似スコア（0〜1, projectionScore）。コスト考慮型ラボの混同行列計算に使う。 */
export const PROJECTION_SCORES: number[] = IMBALANCED_DATA.map((p) => projectionScore(p, MAJORITY_MEAN, MINORITY_MEAN));
export const TRUE_LABELS: (0 | 1)[] = IMBALANCED_DATA.map((p) => p.label);

export const SMOTE_K_MIN = 1;
export const SMOTE_K_MAX = 5;
export const NUM_SYNTHETIC_MIN = 0;
export const NUM_SYNTHETIC_MAX = 16;
const SMOTE_SEQ_SEED = 424242;

export const COST_MIN = 1;
export const COST_MAX = 10;

// ────────────────────────────────────────────────────────────
// メインストア（Level0 SmoteLab, Level1 CostSensitiveLab）
// ────────────────────────────────────────────────────────────

export type MainControls = {
  /** SMOTE/ADASYNの少数派内近傍数。 */
  smoteK: number;
  /** «これまでに生成した» 合成サンプル数（Labの時計の針。frame count と一致させる）。 */
  numSynthetic: number;
  /** false=SMOTE（一様巡回）, true=ADASYN（困難度で重み付け）。 */
  adaptive: boolean;
  /** 偽陽性（正常を異常と誤報）のコスト。 */
  costFP: number;
  /** 偽陰性（陽性の見逃し）のコスト。 */
  costFN: number;
};

export type MainDerived = {
  smoteK: number;
  numSynthetic: number;
  adaptive: boolean;
  costFP: number;
  costFN: number;
  /** 合成サンプルの生成列（先頭 numSynthetic 件だけが «今まで生成済み»）。 */
  smoteSteps: SmoteStep[];
  /** ADASYNの適応重み（現在の smoteK に対する各少数派点の重み、0〜1）。 */
  weights: number[];
  /** コスト最適しきい値 p*=C_FP/(C_FP+C_FN)。 */
  optimalThreshold: number;
  /** しきい値0.5（コストを考えない既定）での混同行列。 */
  confusionAtHalf: ConfusionCounts;
  /** コスト最適しきい値での混同行列。 */
  confusionAtOptimal: ConfusionCounts;
  /** しきい値0.5での期待コスト。 */
  costAtHalf: number;
  /** コスト最適しきい値での期待コスト。 */
  costAtOptimal: number;
};

/**
 * SMOTE/ADASYN合成（Level0 SmoteLab）とコスト考慮型学習（Level1 CostSensitiveLab）が
 * 購読するメインストア。`smoteSteps` は controls（smoteK/numSynthetic/adaptive）だけから
 * 毎回ゼロから再計算する純関数（reinforcement-learning.ts の trainEpisodes と同じ設計）。
 */
export const useImbalancedAnomalyStore = createTopicStore<MainControls, MainDerived>({
  initialControls: { smoteK: 3, numSynthetic: 6, adaptive: false, costFP: 1, costFN: 1 },
  derive: ({ smoteK, numSynthetic, adaptive, costFP, costFN }) => {
    const smoteSteps = adaptive
      ? generateAdasynSequence(MINORITY_POINTS, IMBALANCED_DATA, smoteK, numSynthetic, SMOTE_SEQ_SEED)
      : generateSmoteSequence(MINORITY_POINTS, smoteK, numSynthetic, SMOTE_SEQ_SEED);
    const weights = adasynWeights(MINORITY_POINTS, IMBALANCED_DATA, smoteK);

    const optimalThreshold = costOptimalThreshold(costFP, costFN);
    const confusionAtHalf = confusionAt(TRUE_LABELS, PROJECTION_SCORES, 0.5);
    const confusionAtOptimal = confusionAt(TRUE_LABELS, PROJECTION_SCORES, optimalThreshold);

    return {
      smoteK,
      numSynthetic,
      adaptive,
      costFP,
      costFN,
      smoteSteps,
      weights,
      optimalThreshold,
      confusionAtHalf,
      confusionAtOptimal,
      costAtHalf: expectedCost(confusionAtHalf, costFP, costFN),
      costAtOptimal: expectedCost(confusionAtOptimal, costFP, costFN),
    };
  },
});

// ────────────────────────────────────────────────────────────
// SMOTE公式ステッパー専用の «空 controls» ストア（Level1）
// ────────────────────────────────────────────────────────────

export type EmptyControls = Record<string, never>;
export type EmptyDerived = Record<string, never>;

/**
 * 「SMOTE補間式」ステッパー（Level1）専用の空ストア。フレーム «中身» は
 * smote-formula-frames.ts が固定の小さな例から純関数で作る——Level0のSmoteLabは自身の
 * frame（合成サンプル生成の進行）を持つため、2つ目のStepPlayerは専用の空ストアに分離する
 * （tasks/lessons.md #76 の教訓）。
 */
export const useSmoteFormulaStepperStore = createTopicStore<EmptyControls, EmptyDerived>({
  initialControls: {},
  derive: () => ({}),
});

// ────────────────────────────────────────────────────────────
// 異常検知ストア（Level2 AnomalyLab）
// ────────────────────────────────────────────────────────────

const ANOMALY_SEED = 555;
export const ANOMALY_DATA = generateAnomalyData(ANOMALY_SEED);
export const ANOMALY_POINTS: Point2D[] = ANOMALY_DATA.map((p) => ({ x1: p.x1, x2: p.x2 }));

export const LOF_K_MIN = 2;
export const LOF_K_MAX = 10;
const IFOREST_NUM_TREES = 60;
const IFOREST_SUBSAMPLE = 16;
const IFOREST_SEED = 20260719;
export const ANOMALY_GRID_RESOLUTION = 22;
export const RANK_STEPPER_COUNT = 10;

/** LOFスコアは k(2..10) だけに依存するので起動時に一度だけ全kについて事前計算する。 */
const LOF_SCORES_BY_K = new Map<number, number[]>();
const LOF_LRD_BY_K = new Map<number, number[]>();
for (let k = LOF_K_MIN; k <= LOF_K_MAX; k++) {
  LOF_SCORES_BY_K.set(k, lofAll(ANOMALY_POINTS, k));
  LOF_LRD_BY_K.set(
    k,
    ANOMALY_POINTS.map((_, i) => localReachabilityDensity(ANOMALY_POINTS, i, k)),
  );
}

export const IFOREST = buildIsolationForest(ANOMALY_POINTS, IFOREST_NUM_TREES, IFOREST_SUBSAMPLE, IFOREST_SEED);
export const IFOREST_SUBSAMPLE_SIZE = IFOREST_SUBSAMPLE;
const IFOREST_SCORES: number[] = ANOMALY_POINTS.map((p) => isolationScore(IFOREST, IFOREST_SUBSAMPLE, p));

export const MSPC_MOMENTS: Moments2D = computeMoments(ANOMALY_POINTS);
const MSPC_T2: number[] = ANOMALY_POINTS.map((p) => mahalanobisT2(p, MSPC_MOMENTS));
const MSPC_Q: number[] = ANOMALY_POINTS.map((p) => pcaResidualQ(p, MSPC_MOMENTS));
export const MSPC_T2_SCORES = MSPC_T2;
export const MSPC_Q_SCORES = MSPC_Q;
const MSPC_SCORES: number[] = MSPC_T2.map((t2, i) => t2 + MSPC_Q[i]);
export const LOF_LRD_TABLE = LOF_LRD_BY_K;

export type GridCellScore = { x1: number; x2: number; score: number };

function buildGrid(scoreFn: (q: Point2D) => number): GridCellScore[] {
  const res = ANOMALY_GRID_RESOLUTION;
  const cells: GridCellScore[] = [];
  for (let i = 0; i < res; i++) {
    for (let j = 0; j < res; j++) {
      const x1 = (i + 0.5) / res;
      const x2 = (j + 0.5) / res;
      cells.push({ x1, x2, score: scoreFn({ x1, x2 }) });
    }
  }
  return cells;
}

const LOF_GRID_BY_K = new Map<number, GridCellScore[]>();
for (let k = LOF_K_MIN; k <= LOF_K_MAX; k++) {
  const trainLrd = LOF_LRD_BY_K.get(k)!;
  LOF_GRID_BY_K.set(
    k,
    buildGrid((q) => lofAt(ANOMALY_POINTS, trainLrd, q, k)),
  );
}
const IFOREST_GRID: GridCellScore[] = buildGrid((q) => isolationScore(IFOREST, IFOREST_SUBSAMPLE, q));
const MSPC_GRID: GridCellScore[] = buildGrid((q) => mahalanobisT2(q, MSPC_MOMENTS) + pcaResidualQ(q, MSPC_MOMENTS));

export type AnomalyMethod = "lof" | "iforest" | "mspc";

export type AnomalyControls = {
  method: AnomalyMethod;
  lofK: number;
  /** 上位何%を «異常» とみなすか（0〜100）。 */
  thresholdPercentile: number;
};

export type AnomalyDerived = {
  method: AnomalyMethod;
  lofK: number;
  thresholdPercentile: number;
  /** 現在の手法でのスコア（点の並び順は ANOMALY_POINTS と一致）。 */
  scores: number[];
  /** スコア降順の添字列。 */
  ranking: number[];
  /** 上位何件を異常フラグとするか。 */
  cutoffCount: number;
  /** 各点が異常フラグされているか（添字は ANOMALY_POINTS と一致）。 */
  flagged: boolean[];
  /** 現在の手法での粗いヒートマップグリッド。 */
  grid: GridCellScore[];
};

/**
 * 異常検知（Level2 AnomalyLab）専用ストア。LOF/IsolationForest/MSPCの3手法はいずれも
 * «スコアが高いほど異常» という共通の意味に揃えてあるため、しきい値は共通の
 * «上位◯%» パーセンタイルで統一する（スケールが違う3手法を1つのスライダーで扱える）。
 * frame は «スコア上位10件を1件ずつ見る» ステッパーに使う（メインストアの frame とは独立、#76）。
 */
export const useAnomalyStore = createTopicStore<AnomalyControls, AnomalyDerived>({
  initialControls: { method: "lof", lofK: 5, thresholdPercentile: 15 },
  initialFrameCount: RANK_STEPPER_COUNT,
  derive: ({ method, lofK, thresholdPercentile }) => {
    const scores =
      method === "lof" ? (LOF_SCORES_BY_K.get(lofK) ?? []) : method === "iforest" ? IFOREST_SCORES : MSPC_SCORES;
    const grid = method === "lof" ? (LOF_GRID_BY_K.get(lofK) ?? []) : method === "iforest" ? IFOREST_GRID : MSPC_GRID;
    const ranking = rankByScoreDescending(scores);
    const cutoffCount = percentileCutoffCount(scores.length, thresholdPercentile);
    const flaggedSet = new Set(ranking.slice(0, cutoffCount));
    const flagged = ANOMALY_POINTS.map((_, i) => flaggedSet.has(i));
    return { method, lofK, thresholdPercentile, scores, ranking, cutoffCount, flagged, grid };
  },
});
