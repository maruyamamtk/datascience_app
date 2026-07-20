/**
 * 二値分類の評価指標(J-3)の計算層(純関数・副作用なし・Vitest対象)。
 *
 * 題材:「陽性らしさスコア(0〜1)を出す、既に学習済みの固定分類器」に対して、
 * 混同行列・accuracy・precision・recall・F1・ROC曲線・AUCを計算する
 * (詳細_第3章_二値分類における評価指標 §3.3〜3.10)。
 *
 * 役割分担(重複回避、CLAUDE.md「前提関係を明示」):
 * - [評価指標とKPI設計](metrics-and-kpi.ts)がコスト行列・期待ビジネスインパクト・
 *   正解率が最大になるしきい値の話を、[不均衡データ](imbalanced-anomaly.ts)がコスト考慮型学習の
 *   最適しきい値 p*=C_FP/(C_FP+C_FN) を、それぞれ既に扱っている。
 * - 本トピックはそれらと同じ「しきい値で混同行列が決まる」土台の上で、
 *   **precision・recall・F1のトレードオフ、ROC曲線(TPR-FPR空間のしきい値スイープ)、AUC**
 *   という「新しい読み方」に専念する(コスト考慮型学習そのものの再実装はしない)。
 *
 * 乱数は決定的な整数演算LCG(tasks/lessons.md #74の教訓。regression-metrics.tsと同じ方式で
 * SSRとブラウザで結果がぶれない)。
 */

// ────────────────────────────────────────────────────────────
// 決定的乱数(整数演算だけのLCG。SSRとブラウザで結果がぶれない)
// ────────────────────────────────────────────────────────────

/** 決定的な線形合同法(整数演算だけなのでSSRとブラウザで結果がぶれない)。 */
export function makeLcg(seed: number): () => number {
  let state = (Math.floor(seed) >>> 0) || 1;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** 一様乱数3個の和−1.5で近似ガウス(Irwin–Hall、超越関数を使わず決定的、標準偏差≈0.5)。 */
export function pseudoGaussian(rng: () => number): number {
  return rng() + rng() + rng() - 1.5;
}

/** 平均mean・標準偏差std(近似)の疑似ガウス値を作る(pseudoGaussianの標準偏差≈0.5をstdへスケール)。 */
function scaledGaussian(rng: () => number, mean: number, std: number): number {
  return mean + pseudoGaussian(rng) * (std / 0.5);
}

function clampRound2(v: number, min: number, max: number): number {
  return Math.round(Math.max(min, Math.min(max, v)) * 100) / 100;
}

// ────────────────────────────────────────────────────────────
// 「陽性らしさスコア」を出す、既に学習済みの固定分類器のサンプル集合
// ────────────────────────────────────────────────────────────

/** 1サンプル: 実際のラベル(1=陽性,0=陰性)と、分類器が出した陽性らしさスコア(0〜1)。 */
export type Sample = { id: number; label: 0 | 1; score: number };

export const N_POSITIVE = 9;
export const N_NEGATIVE = 9;
export const DATA_SEED = 820823;

const POSITIVE_MEAN = 0.68;
const NEGATIVE_MEAN = 0.32;
const SCORE_STD = 0.17;
const SCORE_MIN = 0.02;
const SCORE_MAX = 0.98;

/**
 * 「陽性らしさスコアを出す、既に学習済みの固定分類器」の予測結果を決定的に生成する。
 * 陽性群・陰性群のスコア分布はわざと重なりを持たせる(閾値を動かすとFP/FNが生じ、
 * precision/recall/F1のトレードオフが体感できるようにするため)。
 */
export function generateSamples(
  seed: number = DATA_SEED,
  nPositive: number = N_POSITIVE,
  nNegative: number = N_NEGATIVE,
): Sample[] {
  const rng = makeLcg(seed);
  const samples: Sample[] = [];
  for (let i = 0; i < nPositive; i++) {
    const score = clampRound2(scaledGaussian(rng, POSITIVE_MEAN, SCORE_STD), SCORE_MIN, SCORE_MAX);
    samples.push({ id: i, label: 1, score });
  }
  for (let i = 0; i < nNegative; i++) {
    const score = clampRound2(scaledGaussian(rng, NEGATIVE_MEAN, SCORE_STD), SCORE_MIN, SCORE_MAX);
    samples.push({ id: nPositive + i, label: 0, score });
  }
  return samples;
}

// ────────────────────────────────────────────────────────────
// しきい値 → 混同行列 → accuracy・precision・recall・F1
// ────────────────────────────────────────────────────────────

export type ConfusionCounts = { tp: number; fp: number; tn: number; fn: number };

/** スコアがしきい値以上なら陽性(1)と予測する(境界はしきい値側を含む)。 */
export function classifyByThreshold(score: number, threshold: number): 0 | 1 {
  return score >= threshold ? 1 : 0;
}

/** 全サンプルをしきい値で分類し、混同行列(TP/FP/FN/TN)を集計する。 */
export function confusionAt(samples: readonly Sample[], threshold: number): ConfusionCounts {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  for (const s of samples) {
    const pred = classifyByThreshold(s.score, threshold);
    if (s.label === 1 && pred === 1) tp++;
    else if (s.label === 0 && pred === 1) fp++;
    else if (s.label === 0 && pred === 0) tn++;
    else fn++;
  }
  return { tp, fp, tn, fn };
}

/** Accuracy(正解率) = (TP+TN)/全体。全体が0件なら定義できずNaN。 */
export function accuracyOf(c: ConfusionCounts): number {
  const total = c.tp + c.fp + c.tn + c.fn;
  return total > 0 ? (c.tp + c.tn) / total : Number.NaN;
}

/** Precision(適合率) = TP/(TP+FP)。陽性と予測したものが1件もなければ定義できずnull。 */
export function precisionOf(c: ConfusionCounts): number | null {
  const denom = c.tp + c.fp;
  return denom > 0 ? c.tp / denom : null;
}

/** Recall(再現率, TPR) = TP/(TP+FN)。実際の陽性が1件もなければ定義できずnull。 */
export function recallOf(c: ConfusionCounts): number | null {
  const denom = c.tp + c.fn;
  return denom > 0 ? c.tp / denom : null;
}

/** F1 = precisionとrecallの調和平均。どちらかがnull、または両方0ならnull。 */
export function f1Of(c: ConfusionCounts): number | null {
  const p = precisionOf(c);
  const r = recallOf(c);
  if (p === null || r === null) return null;
  if (p + r === 0) return null;
  return (2 * p * r) / (p + r);
}

/** FPR(偽陽性率) = FP/(FP+TN)。実際の陰性が1件もなければ0扱い(ROC曲線の定義域を保つ)。 */
export function fprOf(c: ConfusionCounts): number {
  const denom = c.fp + c.tn;
  return denom > 0 ? c.fp / denom : 0;
}

/** TPR(真陽性率) = recallと同じ値(ROC曲線の縦軸)。 */
export function tprOf(c: ConfusionCounts): number {
  return recallOf(c) ?? 0;
}

export type ClassificationMetrics = {
  counts: ConfusionCounts;
  accuracy: number;
  precision: number | null;
  recall: number | null;
  f1: number | null;
  fpr: number;
  tpr: number;
};

/** あるしきい値における全指標をまとめて計算する(Lab/Stepperが購読する唯一の集約入口)。 */
export function classificationMetricsAt(samples: readonly Sample[], threshold: number): ClassificationMetrics {
  const counts = confusionAt(samples, threshold);
  return {
    counts,
    accuracy: accuracyOf(counts),
    precision: precisionOf(counts),
    recall: recallOf(counts),
    f1: f1Of(counts),
    fpr: fprOf(counts),
    tpr: tprOf(counts),
  };
}

// ────────────────────────────────────────────────────────────
// ROC曲線(しきい値スイープ)とAUC(台形則)
// ────────────────────────────────────────────────────────────

/** ROC曲線上の1点。thresholdはこの点で新たに陽性側に加わったサンプルのスコア。 */
export type RocPoint = { fpr: number; tpr: number; threshold: number; sampleId?: number };

/**
 * スコア降順に1件ずつ「陽性と予測する側」へ繰り込みながらROC曲線の点列を作る、
 * 標準的な構成法(SPEC §3 J-3「ROC曲線とAUC」)。
 * しきい値を1(何も陽性と予測しない)から少しずつ下げていくのと同義——
 * スコアが高い順に並べ、1件処理するごとに (FPR,TPR) が右または上へ1段動く階段状の曲線になる。
 * 先頭に (0,0) を必ず含み、全件処理後は必ず (1,1) に到達する。
 */
export function rocPointsOf(samples: readonly Sample[]): RocPoint[] {
  const positives = samples.filter((s) => s.label === 1).length;
  const negatives = samples.filter((s) => s.label === 0).length;
  const sorted = [...samples].sort((a, b) => b.score - a.score || a.id - b.id);

  const points: RocPoint[] = [{ fpr: 0, tpr: 0, threshold: 1 }];
  let tp = 0;
  let fp = 0;
  for (const s of sorted) {
    if (s.label === 1) tp++;
    else fp++;
    points.push({
      fpr: negatives > 0 ? fp / negatives : 0,
      tpr: positives > 0 ? tp / positives : 0,
      threshold: s.score,
      sampleId: s.id,
    });
  }
  return points;
}

/**
 * ROC曲線の下側の面積(AUC)を台形則で計算する。
 * 点列は fpr について単調非減少(rocPointsOfの構成法より保証される)前提。
 */
export function aucOf(points: readonly RocPoint[]): number {
  let area = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].fpr - points[i - 1].fpr;
    const avgY = (points[i].tpr + points[i - 1].tpr) / 2;
    area += dx * avgY;
  }
  return area;
}

// ────────────────────────────────────────────────────────────
// コスト考慮(J-1「評価指標とKPI」・I-6「不均衡データ」と同じ式。参照用の軽量な再掲)
// ────────────────────────────────────────────────────────────

/**
 * 期待コストを最小にする最適しきい値 p*=C_FP/(C_FP+C_FN)。
 * [評価指標とKPI設計](/topics/metrics-and-kpi)・[不均衡データ](/topics/imbalanced-anomaly)で
 * 導出済みの式をそのまま再掲(本トピックのLevel2「コスト考慮」の数値例に使うのみで、
 * コスト考慮型学習そのものの再実装はしない)。
 */
export function costOptimalThreshold(costFP: number, costFN: number): number {
  const denom = costFP + costFN;
  return denom > 0 ? costFP / denom : 0.5;
}

// ────────────────────────────────────────────────────────────
// 表示用ヒストグラムの集計(純粋なデータ変換)
// ────────────────────────────────────────────────────────────

export type HistogramBin = { x0: number; x1: number; posCount: number; negCount: number };

/** スコアを[0,1]上のnBins個の等幅ビンに振り分け、陽性/陰性それぞれの件数を数える。 */
export function histogramBins(samples: readonly Sample[], nBins = 10): HistogramBin[] {
  const width = 1 / nBins;
  const bins: HistogramBin[] = Array.from({ length: nBins }, (_, i) => ({
    x0: i * width,
    x1: (i + 1) * width,
    posCount: 0,
    negCount: 0,
  }));
  for (const s of samples) {
    const idx = Math.max(0, Math.min(nBins - 1, Math.floor(s.score / width)));
    if (s.label === 1) bins[idx].posCount++;
    else bins[idx].negCount++;
  }
  return bins;
}
