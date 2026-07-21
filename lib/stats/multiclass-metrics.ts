/**
 * 多クラス分類の評価指標(J-4)の計算層(純関数・副作用なし・Vitest対象)。
 *
 * 題材:「ニュース記事の自動分類」(3クラス: スポーツ/政治/エンタメ、
 * 詳細_第4章_多クラス分類の評価指標 §4.1 応用例)を、クラスごとの件数が偏った
 * (エンタメが少数派で誤分類も多い)固定N×N混同行列で表現し、
 * 各クラスをOne-vs-Restの2値問題として切り出しながらMacro/Micro/Weighted平均を計算する
 * (詳細_第4章 §4.3〜4.7)。
 *
 * 役割分担(重複回避、CLAUDE.md「前提関係を明示」):
 * - precision・recall・F1の**定義そのもの**(TP/FP/FNからの計算式)は
 *   [二値分類の評価指標](binary-classification-metrics.ts)と完全に同じなので、
 *   precisionOf/recallOf/f1Ofをそのまま再利用する。
 * - 本ファイルは「N×N混同行列 → クラスごとの2×2One-vs-Restカウント」の切り出しと、
 *   Macro(単純平均)・Micro(全クラス合算後に計算)・Weighted(サンプル数重み付き平均)
 *   という3通りの平均化に専念する。
 */

import { type ConfusionCounts, f1Of, precisionOf, recallOf } from "./binary-classification-metrics";

// ────────────────────────────────────────────────────────────
// 固定のN×N混同行列(題材:「ニュース記事の自動分類」3クラス)
// ────────────────────────────────────────────────────────────

/** 行=実際のクラス、列=予測したクラス、のN×N混同行列。 */
export type ConfusionMatrixNxN = readonly (readonly number[])[];

export const CLASS_LABELS = ["スポーツ", "政治", "エンタメ"] as const;

/**
 * 固定の3×3混同行列。「スポーツ」が多数派で分類しやすく、「エンタメ」は少数派で
 * 誤分類(政治と混同されやすい)も多い——クラス不均衡があるとMacro平均とMicro/Weighted平均が
 * どれだけ乖離するかを体感できるよう意図的に設計した(全100件、内訳60/30/10)。
 */
export const CONFUSION_MATRIX: ConfusionMatrixNxN = [
  [54, 4, 2],
  [5, 20, 5],
  [3, 4, 3],
];

/** 混同行列の全サンプル数。 */
export function totalCount(matrix: ConfusionMatrixNxN): number {
  return matrix.reduce((sum, row) => sum + row.reduce((a, b) => a + b, 0), 0);
}

/** クラスkの行合計(実際にクラスkであるサンプル数=support)。 */
export function rowTotal(matrix: ConfusionMatrixNxN, k: number): number {
  return matrix[k].reduce((a, b) => a + b, 0);
}

/** クラスkの列合計(クラスkと予測されたサンプル数)。 */
export function colTotal(matrix: ConfusionMatrixNxN, k: number): number {
  let sum = 0;
  for (let i = 0; i < matrix.length; i++) sum += matrix[i][k];
  return sum;
}

// ────────────────────────────────────────────────────────────
// One-vs-Rest分解: クラスkを「陽性」・それ以外を「陰性」とみなす2×2カウント
// ────────────────────────────────────────────────────────────

/**
 * クラスkを「陽性」、それ以外の全クラスを「陰性」とみなしたときの2×2混同カウント
 * (One-vs-Rest、詳細_第4章 §4.3〜4.5の考え方)。
 * TP=対角成分、FP=クラスkと予測したが実際は違う(列合計-TP)、
 * FN=実際はクラスkだが違うと予測した(行合計-TP)、TN=残り。
 */
export function oneVsRestCounts(matrix: ConfusionMatrixNxN, k: number): ConfusionCounts {
  const tp = matrix[k][k];
  const col = colTotal(matrix, k);
  const row = rowTotal(matrix, k);
  const n = totalCount(matrix);
  const fp = col - tp;
  const fn = row - tp;
  const tn = n - tp - fp - fn;
  return { tp, fp, fn, tn };
}

export type PerClassMetrics = {
  label: string;
  index: number;
  counts: ConfusionCounts;
  /** このクラスの実際のサンプル数(行合計、Weighted平均の重みになる)。 */
  support: number;
  precision: number | null;
  recall: number | null;
  f1: number | null;
};

/** 全クラスについてOne-vs-Rest分解し、precision/recall/f1をまとめて計算する。 */
export function perClassMetricsOf(
  matrix: ConfusionMatrixNxN,
  labels: readonly string[],
): PerClassMetrics[] {
  return labels.map((label, index) => {
    const counts = oneVsRestCounts(matrix, index);
    return {
      label,
      index,
      counts,
      support: rowTotal(matrix, index),
      precision: precisionOf(counts),
      recall: recallOf(counts),
      f1: f1Of(counts),
    };
  });
}

/** 全体の正解率 = 対角成分の和 / 全サンプル数。 */
export function accuracyOf(matrix: ConfusionMatrixNxN): number {
  const n = totalCount(matrix);
  if (n === 0) return Number.NaN;
  let diag = 0;
  for (let i = 0; i < matrix.length; i++) diag += matrix[i][i];
  return diag / n;
}

// ────────────────────────────────────────────────────────────
// Macro / Micro / Weighted平均(詳細_第4章 §4.5〜4.7)
// ────────────────────────────────────────────────────────────

export type AverageMetrics = { precision: number | null; recall: number | null; f1: number | null };
export type AveragingMethod = "macro" | "micro" | "weighted";

function mean(values: readonly (number | null)[]): number | null {
  const finite = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (finite.length === 0) return null;
  return finite.reduce((a, b) => a + b, 0) / finite.length;
}

function weightedMean(values: readonly (number | null)[], weights: readonly number[]): number | null {
  let sumW = 0;
  let sumWV = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v === null || !Number.isFinite(v)) continue;
    sumW += weights[i];
    sumWV += v * weights[i];
  }
  return sumW > 0 ? sumWV / sumW : null;
}

/** Macro平均: 各クラスのprecision/recall/f1を単純平均(クラスの大きさを無視して均等に扱う)。 */
export function macroAverageOf(perClass: readonly PerClassMetrics[]): AverageMetrics {
  return {
    precision: mean(perClass.map((c) => c.precision)),
    recall: mean(perClass.map((c) => c.recall)),
    f1: mean(perClass.map((c) => c.f1)),
  };
}

/** Weighted平均: 各クラスのprecision/recall/f1を、そのクラスのサンプル数(support)で重み付け平均。 */
export function weightedAverageOf(perClass: readonly PerClassMetrics[]): AverageMetrics {
  const weights = perClass.map((c) => c.support);
  return {
    precision: weightedMean(
      perClass.map((c) => c.precision),
      weights,
    ),
    recall: weightedMean(
      perClass.map((c) => c.recall),
      weights,
    ),
    f1: weightedMean(
      perClass.map((c) => c.f1),
      weights,
    ),
  };
}

/**
 * Micro平均: 全クラスのTP・FP・FNをそれぞれ合算してから、まとめて1回precision/recall/f1を計算する
 * (クラスごとの指標を平均するのではない点がMacro/Weightedと異なる)。
 */
export function microAverageOf(perClass: readonly PerClassMetrics[]): AverageMetrics {
  const sumTp = perClass.reduce((a, c) => a + c.counts.tp, 0);
  const sumFp = perClass.reduce((a, c) => a + c.counts.fp, 0);
  const sumFn = perClass.reduce((a, c) => a + c.counts.fn, 0);
  const aggregated: ConfusionCounts = { tp: sumTp, fp: sumFp, fn: sumFn, tn: 0 };
  return {
    precision: precisionOf(aggregated),
    recall: recallOf(aggregated),
    f1: f1Of(aggregated),
  };
}

/** 平均化方式を指定して計算する(Lab/Stepperが購読する統一入口)。 */
export function averageOf(perClass: readonly PerClassMetrics[], method: AveragingMethod): AverageMetrics {
  if (method === "macro") return macroAverageOf(perClass);
  if (method === "weighted") return weightedAverageOf(perClass);
  return microAverageOf(perClass);
}
