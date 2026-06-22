/**
 * 中心極限定理(CLT)トピックの計算層（純関数）。
 * 操作値（元分布 distKind・標本サイズ n）から派生値（母平均 μ・母標準偏差 σ・標準誤差 SE）を
 * 導出し、標本平均のサンプリングも純関数として提供する。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2「計算層は純関数」）。乱数の状態は
 * 呼び出し側が渡す Rng に閉じる。描画・状態保持は持たない（ストア／描画層がこれを呼ぶだけ）。
 */

import { getDistribution, type DistKind } from "./distributions";
import type { Rng } from "./random";
import { mean } from "./sample";

// 標本平均は計算層で一元化した `mean`（lib/stats/sample.ts）を CLT 文脈の別名で公開する。
export { mean as sampleMean };

/** CLT トピックの操作値（ユーザーが直接いじる single source of truth）。 */
export type CltControls = {
  /** 元分布の種別（一様 / 指数 / 二項）。 */
  distKind: DistKind;
  /** 標本サイズ n（>=1 を想定）。 */
  n: number;
};

/** CLT トピックの派生値（controls から純関数で再計算。直接書き換えない）。 */
export type CltDerived = {
  /** 母平均 μ（標本平均分布の中心）。 */
  mu: number;
  /** 母標準偏差 σ（元分布のばらつき）。 */
  sigma: number;
  /** 標準誤差 SE = σ/√n（標本平均分布のばらつき）。 */
  standardError: number;
};

/** 標準誤差 SE = σ/√n。n<=0 は NaN（呼び出し側で formatNumber により "—" 表示）。 */
export function standardError(sigma: number, n: number): number {
  if (n <= 0) return Number.NaN;
  return sigma / Math.sqrt(n);
}

/**
 * 操作値から派生値を導出する純関数。ストアの `derive` に渡す唯一の計算入口。
 * 元分布が μ・σ を与え、n から SE=σ/√n を計算する。Graph/Math/数値表示はストア経由で受け取る。
 */
export function deriveClt(controls: CltControls): CltDerived {
  const dist = getDistribution(controls.distKind);
  return {
    mu: dist.mean,
    sigma: dist.sd,
    standardError: standardError(dist.sd, controls.n),
  };
}

/**
 * 元分布から n 個の観測を引いて 1 標本を作る純関数。
 * StepPlayer の「1 観測ずつ引く」コマ送りは、この観測列を 1 つずつ提示する。
 */
export function drawSample(distKind: DistKind, n: number, rng: Rng): number[] {
  const dist = getDistribution(distKind);
  const out: number[] = [];
  for (let i = 0; i < Math.max(0, Math.floor(n)); i++) {
    out.push(dist.sample(rng));
  }
  return out;
}

/**
 * 標本平均を `count` 回ぶん蓄積して返す純関数（「サンプリング」ボタンの 1 回分）。
 * 各回ごとに n 個引いてその平均を記録する。ヒストグラムはこの戻り値を既存の蓄積に連結する。
 */
export function drawSampleMeans(distKind: DistKind, n: number, count: number, rng: Rng): number[] {
  const means: number[] = [];
  for (let c = 0; c < Math.max(0, Math.floor(count)); c++) {
    means.push(mean(drawSample(distKind, n, rng)));
  }
  return means;
}
