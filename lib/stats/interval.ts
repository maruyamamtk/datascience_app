/**
 * 区間推定（信頼区間）トピックの計算層（純関数）。
 * 操作値（標本サイズ n・信頼係数 level・母標準偏差 σ）から信頼区間 x̄ ± z·σ/√n を導出し、
 * 「母集団から繰り返し標本抽出 → 各標本の信頼区間 → 母平均を含む割合（被覆確率）」の
 * シミュレーションも純関数として提供する。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2「計算層は純関数」）。乱数の状態は
 * 呼び出し側が渡す Rng に閉じる。描画・状態保持は持たない（ストア／描画層がこれを呼ぶだけ）。
 * z は標準正規分位点 `zQuantile`、SE = σ/√n は正規分布／CLT と同じ標準誤差を再利用する。
 */

import { normalSample, zQuantile } from "./normal";
import type { Rng } from "./random";
import { mean as sampleMean } from "./sample";

/**
 * ラボでは標本平均 x̄ = 0 を基準に「区間幅が n・信頼係数でどう変わるか」を見せる
 * （母平均 μ = 0 を想定）。被覆シミュレーションでは各標本ごとに x̄ を計算して使う。
 */
export const CI_MEAN = 0;

/** 区間推定トピックの操作値（ユーザーが直接いじる single source of truth）。 */
export type IntervalControls = {
  /** 標本サイズ n（>=1 を想定。大きいほど区間は狭くなる）。 */
  n: number;
  /** 信頼係数 level（0<level<1。例 0.95）。 */
  level: number;
  /** 母標準偏差 σ（σ既知の z 区間を扱う）。 */
  sigma: number;
};

/** 区間推定トピックの派生値（controls から純関数で再計算。直接書き換えない）。 */
export type IntervalDerived = {
  /** 臨界値 z = Φ⁻¹((1+level)/2)（両側）。 */
  z: number;
  /** 標準誤差 SE = σ/√n。 */
  se: number;
  /** 区間の下限 x̄ − z·SE（x̄=CI_MEAN）。 */
  lower: number;
  /** 区間の上限 x̄ + z·SE（x̄=CI_MEAN）。 */
  upper: number;
  /** 区間の半幅 h = z·SE。 */
  halfWidth: number;
};

/** 標準誤差 SE = σ/√n。n<=0 は NaN（呼び出し側で formatNumber により "—" 表示）。 */
export function standardError(sigma: number, n: number): number {
  if (n <= 0) return Number.NaN;
  return sigma / Math.sqrt(n);
}

/**
 * 両側信頼係数 level に対する臨界値 z_{(1+level)/2}。
 * 例 level=0.95 → 片側裾 0.025 → z = Φ⁻¹(0.975) ≈ 1.96。level∉(0,1) は NaN。
 */
export function zCritical(level: number): number {
  if (level <= 0 || level >= 1) return Number.NaN;
  return zQuantile((1 + level) / 2);
}

/** 信頼区間の計算入力（x̄・σ・n・level）。 */
export type ConfidenceIntervalInput = {
  /** 標本平均 x̄（区間の中心）。 */
  mean: number;
  /** 母標準偏差 σ（既知）。 */
  sigma: number;
  /** 標本サイズ n。 */
  n: number;
  /** 信頼係数 level（0<level<1）。 */
  level: number;
};

/** 信頼区間 x̄ ± z·σ/√n。 */
export type ConfidenceInterval = {
  /** 下限 x̄ − z·SE。 */
  lower: number;
  /** 上限 x̄ + z·SE。 */
  upper: number;
  /** 臨界値 z。 */
  z: number;
  /** 標準誤差 SE = σ/√n。 */
  se: number;
};

/**
 * σ既知の母平均の信頼区間 x̄ ± z·σ/√n を計算する純関数（唯一の計算入口）。
 * ピボット量 (x̄−μ)/(σ/√n) ~ N(0,1) から導かれる古典的な z 区間。
 */
export function confidenceInterval({
  mean,
  sigma,
  n,
  level,
}: ConfidenceIntervalInput): ConfidenceInterval {
  const se = standardError(sigma, n);
  const z = zCritical(level);
  const half = z * se;
  return { lower: mean - half, upper: mean + half, z, se };
}

/**
 * 操作値から派生値を導出する純関数。ストアの `derive` に渡す唯一の計算入口。
 * ラボは x̄ = CI_MEAN（=0）を中心に、z・SE・区間幅が n/level/σ にどう連動するかを見せる。
 */
export function deriveInterval({ n, level, sigma }: IntervalControls): IntervalDerived {
  const { lower, upper, z, se } = confidenceInterval({ mean: CI_MEAN, sigma, n, level });
  return { z, se, lower, upper, halfWidth: z * se };
}

/** 区間が母平均 mu を含むか（lower ≤ mu ≤ upper）。 */
export function containsMean(interval: { lower: number; upper: number }, mu: number): boolean {
  return interval.lower <= mu && mu <= interval.upper;
}

/**
 * 区間群のうち母平均 mu を含む割合（被覆確率の推定値）。
 * 信頼係数の頻度論的意味「区間の約 level が母平均を含む」を数値で確かめる。空配列は NaN。
 */
export function coverageRate(
  intervals: readonly { lower: number; upper: number }[],
  mu: number,
): number {
  if (intervals.length === 0) return Number.NaN;
  const hits = intervals.reduce((acc, iv) => acc + (containsMean(iv, mu) ? 1 : 0), 0);
  return hits / intervals.length;
}

/** 被覆シミュレーションの 1 試行ぶんの結果（1 標本 → 1 信頼区間）。 */
export type SimInterval = {
  /** 区間の下限。 */
  lower: number;
  /** 区間の上限。 */
  upper: number;
  /** この標本の標本平均 x̄。 */
  mean: number;
  /** 母平均 mu を含むか。 */
  contains: boolean;
};

/** 被覆シミュレーションの入力。 */
export type SimulateInput = {
  /** 母平均 μ（真の値）。 */
  mu: number;
  /** 母標準偏差 σ（既知）。 */
  sigma: number;
  /** 各標本のサイズ n。 */
  n: number;
  /** 信頼係数 level。 */
  level: number;
  /** 標本抽出を繰り返す回数（= 描画する区間の本数）。 */
  trials: number;
  /** 決定的 PRNG（同じシードなら再現可能）。 */
  rng: Rng;
};

/**
 * 母集団 N(μ,σ²) から n 個の標本を `trials` 回引き、各標本ごとに信頼区間を作る純関数。
 * 各区間が母平均 μ を含むかを記録し、「約 level の区間が μ を含む」頻度論的意味を体感させる。
 * 描画層（CoverageSimulator）はこの戻り値をコマ送りで 1 本ずつ提示する。
 */
export function simulateIntervals({
  mu,
  sigma,
  n,
  level,
  trials,
  rng,
}: SimulateInput): SimInterval[] {
  const out: SimInterval[] = [];
  for (let t = 0; t < Math.max(0, Math.floor(trials)); t++) {
    const obs: number[] = [];
    for (let i = 0; i < Math.max(0, Math.floor(n)); i++) obs.push(normalSample(mu, sigma, rng));
    const xbar = sampleMean(obs);
    const { lower, upper } = confidenceInterval({ mean: xbar, sigma, n, level });
    out.push({ lower, upper, mean: xbar, contains: containsMean({ lower, upper }, mu) });
  }
  return out;
}
