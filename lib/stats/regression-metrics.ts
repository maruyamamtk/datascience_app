/**
 * 回帰の評価指標（J-2）の計算層(純関数・副作用なし・Vitest 対象)。
 *
 * 題材:「予約件数から来店者数を予測する、既に学習済みの固定モデル」に対して、
 * MAE・MSE・RMSE・MAPE・RMSLE の5つの評価指標を計算する(詳細_第2章_回帰の評価指標 §2.3〜2.9)。
 * 前提トピック単回帰(lib/stats/regression.ts)と同じ `Point` 型 {x,y} を再利用し、
 * y は「実測の来店者数」、予測値は固定モデル slope・x+intercept(既に学習済みとして与える)——
 * 単回帰トピックが「直線をどう当てはめるか」を扱うのに対し、本トピックは
 * 「当てはめた後の誤差をどう測るか」を扱う(前提関係, CLAUDE.md「前提関係を明示」)。
 *
 * 中核可視化のねらい(Issue #81): 1点を大きく外れ値化すると、二乗を使う MSE/RMSE は
 * 跳ね上がる一方、絶対値を使う MAE はあまり動かない——«外れ値への感度の違い» を体感させる。
 *
 * 乱数は決定的な整数演算 LCG(tasks/lessons.md #74 の教訓。metrics-and-kpi.ts と同じ方式で
 * SSR とブラウザで結果がぶれない)。
 */

import type { Point } from "./regression";

export type { Point };

// ────────────────────────────────────────────────────────────
// 決定的乱数(整数演算だけの LCG。SSR とブラウザで結果がぶれない)
// ────────────────────────────────────────────────────────────

/** 決定的な線形合同法(整数演算だけなので SSR とブラウザで結果がぶれない)。 */
export function makeLcg(seed: number): () => number {
  let state = (Math.floor(seed) >>> 0) || 1;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** 一様乱数3個の和−1.5 で近似ガウス(Irwin–Hall、超越関数を使わず決定的)。 */
export function pseudoGaussian(rng: () => number): number {
  return rng() + rng() + rng() - 1.5;
}

// ────────────────────────────────────────────────────────────
// 「予約件数 → 来店者数」既に学習済みの固定モデル
// ────────────────────────────────────────────────────────────

export type Model = { slope: number; intercept: number };

/** 「既に学習済み」として与える固定モデル。本トピックはこれをどう評価するかを扱う。 */
export const FIXED_MODEL: Model = { slope: 1.8, intercept: 8 };

export const N_POINTS = 7;
export const X_MIN = 5;
export const X_MAX = 38;

/** モデルの予測値 ŷ = slope・x + intercept。 */
export function predictedOf(x: number, model: Model = FIXED_MODEL): number {
  return model.slope * x + model.intercept;
}

/**
 * 「予約件数(x) → 来店者数(y)」の観測点を決定的に生成する。
 * y は正の値(来店者数)にとどめる(floor=1)——MAPE・RMSLE が有効な定義域を保つため。
 */
export function generateMetricPoints(seed: number, model: Model = FIXED_MODEL, n: number = N_POINTS): Point[] {
  const rng = makeLcg(seed);
  const points: Point[] = [];
  const count = Math.max(1, Math.floor(n));
  for (let i = 0; i < count; i++) {
    const x = Math.round(X_MIN + ((X_MAX - X_MIN) * i) / Math.max(1, count - 1));
    const noise = 6 * pseudoGaussian(rng);
    const y = Math.max(1, Math.round((predictedOf(x, model) + noise) * 10) / 10);
    points.push({ x, y });
  }
  return points;
}

// ────────────────────────────────────────────────────────────
// 各点の誤差 → 5つの評価指標
// ────────────────────────────────────────────────────────────

export type PointError = {
  x: number;
  actual: number;
  predicted: number;
  /** 残差 e_i = y_i − ŷ_i。 */
  residual: number;
  /** |残差|(MAE の元)。 */
  absError: number;
  /** 残差²(MSE/RMSE の元)。 */
  sqError: number;
  /** |残差|/|実測値|×100(%, MAPE の元)。実測がほぼ0のときは定義できず null。 */
  pctError: number | null;
  /** (log(1+ŷ)−log(1+y))²(RMSLE の元)。ŷ,y が −1 以下だと定義できず null。 */
  logSqError: number | null;
};

const MAPE_MIN_ACTUAL = 1e-6;
const LOG_DOMAIN_MIN = -0.999999;

/** 1点の誤差内訳を計算する純関数(5指標すべての元になる唯一の計算入口)。 */
export function pointErrorOf(p: Point, model: Model = FIXED_MODEL): PointError {
  const predicted = predictedOf(p.x, model);
  const residual = p.y - predicted;
  const absError = Math.abs(residual);
  const sqError = residual * residual;
  const pctError = Math.abs(p.y) > MAPE_MIN_ACTUAL ? (absError / Math.abs(p.y)) * 100 : null;
  const validLog = p.y > LOG_DOMAIN_MIN && predicted > LOG_DOMAIN_MIN;
  const logSqError = validLog ? (Math.log1p(predicted) - Math.log1p(p.y)) ** 2 : null;
  return { x: p.x, actual: p.y, predicted, residual, absError, sqError, pctError, logSqError };
}

export function pointErrorsOf(points: readonly Point[], model: Model = FIXED_MODEL): PointError[] {
  return points.map((p) => pointErrorOf(p, model));
}

/** 配列の算術平均(空配列は NaN)。 */
function mean(values: readonly number[]): number {
  if (values.length === 0) return Number.NaN;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** null を除いた平均(MAPE/RMSLE のように定義域外の点を除外して集計する)。 */
function meanDefined(values: readonly (number | null)[]): number {
  const defined = values.filter((v): v is number => v !== null);
  return mean(defined);
}

/** MAE = (1/n)Σ|y_i−ŷ_i|。誤差の「大きさ」を絶対値の平均で測る(外れ値の影響は線形)。 */
export function maeOf(points: readonly Point[], model: Model = FIXED_MODEL): number {
  return mean(pointErrorsOf(points, model).map((e) => e.absError));
}

/** MSE = (1/n)Σ(y_i−ŷ_i)²。誤差を二乗するため、大きな誤差ほど寄与が二次で効く。 */
export function mseOf(points: readonly Point[], model: Model = FIXED_MODEL): number {
  return mean(pointErrorsOf(points, model).map((e) => e.sqError));
}

/** RMSE = √MSE。MSE と単位(来店者数)を揃えて解釈しやすくしたもの。常に RMSE≥MAE。 */
export function rmseOf(points: readonly Point[], model: Model = FIXED_MODEL): number {
  return Math.sqrt(mseOf(points, model));
}

/** MAPE = (100/n)Σ|(y_i−ŷ_i)/y_i|(%)。誤差を実測値に対する相対値で測る。 */
export function mapeOf(points: readonly Point[], model: Model = FIXED_MODEL): number {
  return meanDefined(pointErrorsOf(points, model).map((e) => e.pctError));
}

/** RMSLE = √((1/n)Σ(log(1+ŷ_i)−log(1+y_i))²)。過小/過大予測を非対称に評価する対数誤差。 */
export function rmsleOf(points: readonly Point[], model: Model = FIXED_MODEL): number {
  return Math.sqrt(meanDefined(pointErrorsOf(points, model).map((e) => e.logSqError)));
}

export type MetricSet = { mae: number; mse: number; rmse: number; mape: number; rmsle: number };

/** 5指標をまとめて計算する(Lab/Stepper が購読する唯一の集約入口)。 */
export function allMetricsOf(points: readonly Point[], model: Model = FIXED_MODEL): MetricSet {
  return {
    mae: maeOf(points, model),
    mse: mseOf(points, model),
    rmse: rmseOf(points, model),
    mape: mapeOf(points, model),
    rmsle: rmsleOf(points, model),
  };
}

/**
 * baseline(外れ値化する前)に対する現在の比率(外れ値への感度比較用)。
 * MSE/RMSE の比率が MAE の比率より大きく育つほど「二乗系指標は外れ値に敏感」が際立つ。
 * baseline がほぼ0(定義できない)なら null。
 */
export function metricRatios(current: MetricSet, baseline: MetricSet): Record<keyof MetricSet, number | null> {
  const keys = Object.keys(current) as (keyof MetricSet)[];
  const out = {} as Record<keyof MetricSet, number | null>;
  for (const k of keys) {
    out[k] = baseline[k] > 1e-9 ? current[k] / baseline[k] : null;
  }
  return out;
}

/**
 * ある点の y を deltaY だけ動かした新しい点配列を返す純関数(元の配列は変更しない)。
 * 「1点を大きく外れ値化する」操作の計算部分(描画層のボタンから呼ぶ)。
 */
export function makeOutlier(points: readonly Point[], index: number, deltaY: number): Point[] {
  return points.map((p, i) => (i === index ? { ...p, y: p.y + deltaY } : p));
}
