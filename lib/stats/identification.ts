/**
 * 識別戦略（N-2）の計算層（純関数）。
 * 無作為化できない観察データで因果効果を «識別» する3つの代表的戦略を扱う：
 *  - DID（差の差分法）：処置群・対照群 × 前・後 の2×2から «平行トレンド» を仮定して効果を抜く。
 *  - IV（操作変数法）：処置に効くが結果に直接効かない操作変数 Z を使い、未観測交絡を迂回（Wald 推定）。
 *  - RDD（回帰不連続デザイン）：連続な割り当て変数の «閾値» での結果のジャンプを効果とみなす。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。乱数は呼び出し側の Rng に閉じる。
 * RDD の局所線形回帰は regression.ts の olsFit を再利用する。
 */

import { olsFit, type Point } from "./regression";
import type { Rng } from "./random";

/** ボックス–ミュラー法で標準正規。 */
function gauss(rng: Rng): number {
  const u1 = Math.max(1e-12, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function mean(xs: readonly number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

// ─────────────────────────────────────────────────────────────
// DID（差の差分法）
// ─────────────────────────────────────────────────────────────

/** 2×2 の群平均（処置群/対照群 × 前/後）。 */
export type DidCells = {
  /** 処置群・介入前。 */
  treatedBefore: number;
  /** 処置群・介入後。 */
  treatedAfter: number;
  /** 対照群・介入前。 */
  controlBefore: number;
  /** 対照群・介入後。 */
  controlAfter: number;
};

/**
 * DID 推定量 =（処置群の変化）−（対照群の変化）。
 * 対照群の変化を «処置群にも共通して起きたはずの時間変化» の代理とみなし、差し引いて効果を抜く。
 */
export function didEstimate(c: DidCells): number {
  return c.treatedAfter - c.treatedBefore - (c.controlAfter - c.controlBefore);
}

/**
 * 処置群の «反事実後»（もし介入がなければ）＝ 前の値 + 対照群と同じ変化（平行トレンド）。
 * 実際の処置群後との差が DID。
 */
export function didCounterfactual(c: DidCells): number {
  return c.treatedBefore + (c.controlAfter - c.controlBefore);
}

/**
 * DID の2×2群平均を生成。
 * - 対照群：前 controlBefore → 後 controlBefore + commonTrend（共通の時間トレンド）。
 * - 処置群：前 treatedBefore → 後 treatedBefore + commonTrend + trueEffect + parallelViolation。
 *   parallelViolation≠0 は «平行トレンド仮定» の破れ（処置群だけ別の時間変化）＝ DID のバイアス源。
 */
export function generateDidCells(params: {
  trueEffect: number;
  commonTrend: number;
  treatedBefore: number;
  controlBefore: number;
  parallelViolation?: number;
}): DidCells {
  const { trueEffect, commonTrend, treatedBefore, controlBefore, parallelViolation = 0 } = params;
  return {
    treatedBefore,
    controlBefore,
    controlAfter: controlBefore + commonTrend,
    treatedAfter: treatedBefore + commonTrend + trueEffect + parallelViolation,
  };
}

// ─────────────────────────────────────────────────────────────
// IV（操作変数法, 二値 Z の Wald 推定）
// ─────────────────────────────────────────────────────────────

/** 1個体：操作変数 Z、処置 T、結果 Y。 */
export type IvUnit = { z: number; t: number; y: number };

/**
 * IV データ生成（二値操作変数）。
 * - 未観測交絡 U〜N(0,1) が T と Y の両方に効く（→ 素朴な OLS は偏る）。
 * - Z〜Bern(0.5) は «処置の受けやすさ» だけに効く（強さ strength）。結果 Y には直接効かない（除外制約）。
 * - T = 1[ base + strength·Z + U + 雑音 > 0 ]。
 * - Y = tau·T + confounder·U + 雑音。← 真の効果は tau。
 */
export function generateIvUnits(params: {
  n: number;
  tau: number;
  strength: number;
  confounder: number;
  rng: Rng;
}): IvUnit[] {
  const { n, tau, strength, confounder, rng } = params;
  const units: IvUnit[] = [];
  for (let i = 0; i < n; i++) {
    const z = rng() < 0.5 ? 0 : 1;
    const u = gauss(rng);
    const t = 0.0 + strength * z + u + 0.5 * gauss(rng) > 0 ? 1 : 0;
    const y = tau * t + confounder * u + gauss(rng);
    units.push({ z, t, y });
  }
  return units;
}

/**
 * Wald 推定量 = （Y の Z による差）/（T の Z による差）
 *  = (E[Y|Z=1]−E[Y|Z=0]) / (E[T|Z=1]−E[T|Z=0])。
 * 「Z が Y を動かす分」は «Z→T→Y» を経由するだけなので、T の動き分で割ると処置効果が復元される。
 */
export function ivWaldEstimate(units: readonly IvUnit[]): number {
  const z1 = units.filter((u) => u.z === 1);
  const z0 = units.filter((u) => u.z === 0);
  const num = mean(z1.map((u) => u.y)) - mean(z0.map((u) => u.y));
  const den = mean(z1.map((u) => u.t)) - mean(z0.map((u) => u.t));
  return den === 0 ? Number.NaN : num / den;
}

/** 素朴な処置効果（E[Y|T=1]−E[Y|T=0]）。未観測交絡で偏る比較の基準。 */
export function ivNaiveEstimate(units: readonly IvUnit[]): number {
  const t1 = units.filter((u) => u.t === 1).map((u) => u.y);
  const t0 = units.filter((u) => u.t === 0).map((u) => u.y);
  return mean(t1) - mean(t0);
}

// ─────────────────────────────────────────────────────────────
// RDD（回帰不連続デザイン）
// ─────────────────────────────────────────────────────────────

/** 1個体：割り当て変数 x、結果 y、処置（x≥cutoff）。 */
export type RddPoint = Point & { treated: boolean };

/**
 * RDD データ生成。
 * - 割り当て変数 x〜一様[cutoff−h, cutoff+h]。x≥cutoff で処置。
 * - Y = baseline + slope·(x−cutoff) + tau·1[x≥cutoff] + 雑音。
 *   閾値で «連続な関数 f» に tau の段差が乗る。境界の左右で f 以外は連続なので、段差＝効果。
 */
export function generateRddPoints(params: {
  n: number;
  tau: number;
  slope: number;
  cutoff: number;
  halfWidth: number;
  noise: number;
  rng: Rng;
}): RddPoint[] {
  const { n, tau, slope, cutoff, halfWidth, noise, rng } = params;
  const pts: RddPoint[] = [];
  for (let i = 0; i < n; i++) {
    const x = cutoff - halfWidth + 2 * halfWidth * rng();
    const treated = x >= cutoff;
    const y = 10 + slope * (x - cutoff) + (treated ? tau : 0) + noise * gauss(rng);
    pts.push({ x, y, treated });
  }
  return pts;
}

/** 局所線形回帰の片側フィット結果（閾値での予測値 = 切片）。 */
export type RddSideFit = { slope: number; intercept: number; atCutoff: number };

/** 片側（cutoff を原点にシフトした点集合）を線形フィットし、閾値での予測値を返す。 */
function fitSide(points: readonly RddPoint[], cutoff: number): RddSideFit {
  const shifted: Point[] = points.map((p) => ({ x: p.x - cutoff, y: p.y }));
  const { slope, intercept } = olsFit(shifted);
  // x=cutoff（シフト後 0）での予測値は切片。
  return { slope, intercept, atCutoff: intercept };
}

/** RDD 推定：閾値の左右を局所線形フィットし、閾値での予測値の «ジャンプ» を効果とみなす。 */
export function rddEstimate(points: readonly RddPoint[], cutoff: number): {
  left: RddSideFit;
  right: RddSideFit;
  jump: number;
} {
  const left = fitSide(points.filter((p) => !p.treated), cutoff);
  const right = fitSide(points.filter((p) => p.treated), cutoff);
  return { left, right, jump: right.atCutoff - left.atCutoff };
}
