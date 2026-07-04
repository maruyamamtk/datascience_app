/**
 * A/Bテスト実務（N-3）の計算層（純関数）。
 * 2群のコンバージョン率（二値アウトカム）を比べる2標本比率の検定を中心に、
 * 効果量（絶対・相対リフト）、検出力（パワー）、必要標本サイズ、逐次的な «覗き見»（peeking）による
 * 第一種の過誤の膨張を扱う。実務での «どれだけ集めれば・どこで見れば» の意思決定を支える。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。標準正規は normal.ts を再利用する。
 */

import { standardNormalCdf, zQuantile } from "./normal";
import type { Rng } from "./random";

/** 2標本比率の検定の入力（各群のコンバージョン数と試行数）。 */
export type TwoPropInput = {
  /** A群（対照）のコンバージョン数。 */
  x1: number;
  /** A群の試行数。 */
  n1: number;
  /** B群（処置）のコンバージョン数。 */
  x2: number;
  /** B群の試行数。 */
  n2: number;
};

/** 2標本比率の検定の結果。 */
export type TwoPropResult = {
  /** A群の比率。 */
  p1: number;
  /** B群の比率。 */
  p2: number;
  /** 差 p2−p1（絶対リフト）。 */
  diff: number;
  /** プールした比率（帰無仮説：両群同一のもとでの共通推定）。 */
  pPool: number;
  /** 帰無仮説のもとでの標準誤差。 */
  se: number;
  /** z 統計量。 */
  z: number;
  /** 両側 p 値。 */
  pValue: number;
};

/**
 * 2標本比率の z 検定（プール分散）。
 * 帰無仮説 H0: p1=p2。共通比率 p̂=(x1+x2)/(n1+n2) で SE=√(p̂(1−p̂)(1/n1+1/n2))、
 * z=(p̂2−p̂1)/SE、両側 p=2(1−Φ(|z|))。
 */
export function twoProportionTest({ x1, n1, x2, n2 }: TwoPropInput): TwoPropResult {
  const p1 = n1 > 0 ? x1 / n1 : Number.NaN;
  const p2 = n2 > 0 ? x2 / n2 : Number.NaN;
  const pPool = n1 + n2 > 0 ? (x1 + x2) / (n1 + n2) : Number.NaN;
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2));
  const z = se > 0 ? (p2 - p1) / se : Number.NaN;
  const pValue = 2 * (1 - standardNormalCdf(Math.abs(z)));
  return { p1, p2, diff: p2 - p1, pPool, se, z, pValue };
}

/** 差の（プールしない）信頼区間。CI=(p2−p1)±z·√(p1q1/n1+p2q2/n2)。 */
export function diffConfidenceInterval(
  { x1, n1, x2, n2 }: TwoPropInput,
  level = 0.95,
): { lower: number; upper: number; halfWidth: number } {
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const seUnpooled = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
  const z = zQuantile((1 + level) / 2);
  const h = z * seUnpooled;
  return { lower: p2 - p1 - h, upper: p2 - p1 + h, halfWidth: h };
}

/**
 * 必要標本サイズ（1群あたり、等配分）。
 * baseline p0、絶対 MDE δ=|p1−p0|、両側有意水準 alpha、検出力 power（=1−β）から
 * n = ( z_{α/2}√(2 p̄ q̄) + z_β √(p0 q0 + p1 q1) )² / δ²、p̄=(p0+p1)/2。
 */
export function requiredSampleSize(params: {
  p0: number;
  mde: number;
  alpha?: number;
  power?: number;
}): number {
  const { p0, mde, alpha = 0.05, power = 0.8 } = params;
  const p1 = p0 + mde;
  if (mde === 0) return Number.POSITIVE_INFINITY;
  const pbar = (p0 + p1) / 2;
  const zA = zQuantile(1 - alpha / 2);
  const zB = zQuantile(power);
  const a = zA * Math.sqrt(2 * pbar * (1 - pbar));
  const b = zB * Math.sqrt(p0 * (1 - p0) + p1 * (1 - p1));
  return Math.ceil(((a + b) * (a + b)) / (mde * mde));
}

/**
 * 検出力（パワー）：baseline p0・絶対効果 mde・1群あたり n・両側 alpha のもとで
 * «真に差があるとき有意になる確率»。
 * power = Φ( (δ − z_{α/2}·SE0) / SE1 )、SE0=√(2 p̄ q̄/n)、SE1=√((p0 q0+p1 q1)/n)。
 */
export function power(params: { p0: number; mde: number; n: number; alpha?: number }): number {
  const { p0, mde, n, alpha = 0.05 } = params;
  const p1 = p0 + mde;
  const pbar = (p0 + p1) / 2;
  const zA = zQuantile(1 - alpha / 2);
  const se0 = Math.sqrt((2 * pbar * (1 - pbar)) / n);
  const se1 = Math.sqrt((p0 * (1 - p0) + p1 * (1 - p1)) / n);
  if (se1 === 0) return Number.NaN;
  return standardNormalCdf((Math.abs(mde) - zA * se0) / se1);
}

/**
 * 逐次的な «覗き見»（peeking）の第一種の過誤シミュレーション。
 * 真に差がない（A/A）データを少しずつ増やしながら looks 回チェックし、
 * «一度でも有意になった» 割合を返す。固定の1回だけ見るより過誤が膨らむことを示す。
 * trials 回の反復平均。乱数は呼び出し側の Rng。
 */
export function peekingFalsePositiveRate(params: {
  looks: number;
  perLook: number;
  p0: number;
  alpha?: number;
  trials: number;
  rng: Rng;
}): number {
  const { looks, perLook, p0, alpha = 0.05, trials, rng } = params;
  const zCrit = zQuantile(1 - alpha / 2);
  let falsePositives = 0;
  for (let t = 0; t < trials; t++) {
    let x1 = 0;
    let x2 = 0;
    let n = 0;
    let flagged = false;
    for (let look = 0; look < looks; look++) {
      for (let i = 0; i < perLook; i++) {
        if (rng() < p0) x1++;
        if (rng() < p0) x2++;
      }
      n += perLook;
      const { z } = twoProportionTest({ x1, n1: n, x2, n2: n });
      if (Number.isFinite(z) && Math.abs(z) > zCrit) {
        flagged = true;
        break;
      }
    }
    if (flagged) falsePositives++;
  }
  return falsePositives / trials;
}
