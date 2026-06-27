/**
 * 単回帰（最小二乗法 OLS）トピックの計算層（純関数）。
 * 散布図データ点から最小二乗解 β̂1=Σ(x−x̄)(y−ȳ)/Σ(x−x̄)²・切片・決定係数 R²・残差・残差平方和(RSS)を
 * 閉形式で求め、任意の直線（手動操作）に対する RSS も返す（「OLS が RSS を最小化する」比較用）。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2「計算層は純関数」）。乱数の状態は呼び出し側が
 * 渡す Rng に閉じる。描画・状態保持は持たない（ストア／描画層がこれを呼ぶだけ）。誤差項の分布は
 * 正規分布トピックと同じ `normalSample` を再利用する。
 */

import { normalSample } from "./normal";
import type { Rng } from "./random";

/** 散布図のデータ点。 */
export type Point = { x: number; y: number };

/** 直線 y = slope·x + intercept のパラメータ。 */
export type Line = { slope: number; intercept: number };

/** 最小二乗フィットの結果。 */
export type OlsFit = {
  /** 回帰係数（傾き）β̂1=Σ(x−x̄)(y−ȳ)/Σ(x−x̄)²。 */
  slope: number;
  /** 切片 β̂0=ȳ−β̂1·x̄。 */
  intercept: number;
  /** 決定係数 R²=1−RSS/SST（SST=Σ(y−ȳ)²）。 */
  r2: number;
  /** 各点の残差 e_i=y_i−(β̂1·x_i+β̂0)。 */
  residuals: number[];
  /** 残差平方和 RSS=Σe_i²（最小二乗解での最小値）。 */
  rss: number;
  /** Σ(x−x̄)(y−ȳ)（公式の分子）。 */
  sxy: number;
  /** Σ(x−x̄)²（公式の分母）。 */
  sxx: number;
  /** 標本平均 x̄。 */
  meanX: number;
  /** 標本平均 ȳ。 */
  meanY: number;
};

/** 配列の算術平均（空配列は NaN）。 */
function mean(values: readonly number[]): number {
  if (values.length === 0) return Number.NaN;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * 任意の直線に対する残差平方和 RSS=Σ(y_i−(slope·x_i+intercept))²。
 * 手動操作した直線と最小二乗解の RSS を比べ「OLS が最小」を体感させるのに使う純関数。
 */
export function residualSumOfSquares(points: readonly Point[], line: Line): number {
  return points.reduce((acc, p) => {
    const e = p.y - (line.slope * p.x + line.intercept);
    return acc + e * e;
  }, 0);
}

/**
 * 最小二乗法（OLS）で単回帰直線をフィットする純関数（唯一の計算入口）。
 * 正規方程式の閉形式 β̂1=Σ(x−x̄)(y−ȳ)/Σ(x−x̄)², β̂0=ȳ−β̂1·x̄ を解く。
 * 点が 2 未満、または x が一点に縮退（Σ(x−x̄)²=0）すると傾きは定まらず NaN を返す。
 */
export function olsFit(points: readonly Point[]): OlsFit {
  const n = points.length;
  const meanX = mean(points.map((p) => p.x));
  const meanY = mean(points.map((p) => p.y));
  let sxy = 0;
  let sxx = 0;
  let sst = 0;
  for (const p of points) {
    const dx = p.x - meanX;
    const dy = p.y - meanY;
    sxy += dx * dy;
    sxx += dx * dx;
    sst += dy * dy;
  }
  const slope = sxx === 0 ? Number.NaN : sxy / sxx;
  const intercept = meanY - slope * meanX;
  const residuals = points.map((p) => p.y - (slope * p.x + intercept));
  const rss = residuals.reduce((acc, e) => acc + e * e, 0);
  // SST=0（y が一定）や n<2 のときは R² を定義できない（NaN で "—" 表示）。
  const r2 = sst === 0 || n < 2 ? Number.NaN : 1 - rss / sst;
  return { slope, intercept, r2, residuals, rss, sxy, sxx, meanX, meanY };
}

/** サンプル点生成の入力。 */
export type SampleInput = {
  /** 真の傾き a。 */
  a: number;
  /** 真の切片 b。 */
  b: number;
  /** 誤差項の標準偏差（ノイズの大きさ）。 */
  noise: number;
  /** 生成する点の数。 */
  n: number;
  /** x の下端。 */
  xMin: number;
  /** x の上端。 */
  xMax: number;
  /** 決定的 PRNG（同じシードなら再現可能）。 */
  rng: Rng;
};

/**
 * y=a·x+b+誤差（誤差〜N(0,noise²)）でサンプル点を生成する純関数。
 * x は [xMin,xMax] を等間隔に並べ、各点に正規ノイズを足す。Rng が決定的なので再現可能
 * （描画層は Date.now をシードに渡して「新しいデータ」を引く）。
 */
export function makeSamplePoints({ a, b, noise, n, xMin, xMax, rng }: SampleInput): Point[] {
  const out: Point[] = [];
  const count = Math.max(0, Math.floor(n));
  for (let i = 0; i < count; i++) {
    const x = count === 1 ? xMin : xMin + ((xMax - xMin) * i) / (count - 1);
    const y = a * x + b + normalSample(0, noise, rng);
    out.push({ x, y });
  }
  return out;
}

/** 単回帰トピックの操作値（データ点群＋手動で動かす直線）。 */
export type RegressionControls = {
  /** 散布図のデータ点（ドラッグで動かせる single source of truth）。 */
  points: Point[];
  /** 手動直線の傾き（スライダー操作）。 */
  slope: number;
  /** 手動直線の切片（スライダー操作）。 */
  intercept: number;
};

/** 単回帰トピックの派生値（controls から純関数で再計算。直接書き換えない）。 */
export type RegressionDerived = {
  /** 最小二乗解の傾き β̂1。 */
  olsSlope: number;
  /** 最小二乗解の切片 β̂0。 */
  olsIntercept: number;
  /** 最小二乗解での残差平方和（最小値）。 */
  olsRss: number;
  /** 決定係数 R²。 */
  r2: number;
  /** Σ(x−x̄)(y−ȳ)（公式の分子）。 */
  sxy: number;
  /** Σ(x−x̄)²（公式の分母）。 */
  sxx: number;
  /** 標本平均 x̄。 */
  meanX: number;
  /** 標本平均 ȳ。 */
  meanY: number;
  /** 手動直線の残差平方和（olsRss 以上になる）。 */
  manualRss: number;
  /** 手動直線の各点の残差（残差縦線の描画用）。 */
  manualResiduals: number[];
};

/**
 * 操作値から派生値を導出する純関数。ストアの `derive` に渡す唯一の計算入口。
 * 点群から OLS 解・R²・公式の分子分母を求め、手動直線の RSS と残差も併せて返す
 * （手動 vs 最小二乗の比較・残差縦線の描画に使う）。
 */
export function deriveRegression({
  points,
  slope,
  intercept,
}: RegressionControls): RegressionDerived {
  const fit = olsFit(points);
  const manualResiduals = points.map((p) => p.y - (slope * p.x + intercept));
  return {
    olsSlope: fit.slope,
    olsIntercept: fit.intercept,
    olsRss: fit.rss,
    r2: fit.r2,
    sxy: fit.sxy,
    sxx: fit.sxx,
    meanX: fit.meanX,
    meanY: fit.meanY,
    manualRss: residualSumOfSquares(points, { slope, intercept }),
    manualResiduals,
  };
}
