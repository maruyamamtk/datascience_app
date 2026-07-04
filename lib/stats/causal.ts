/**
 * 因果推論の枠組み（N-1）の計算層（純関数）。
 * 潜在的結果（Rubin 因果モデル）：各個体に «処置あり Y(1)» と «処置なし Y(0)» の2つの潜在結果を置き、
 * 実際に観測できるのは片方だけ（因果推論の根本問題）。平均処置効果 ATE=E[Y(1)−Y(0)]、
 * 素朴比較の交絡バイアス、無作為化・層別調整によるバイアス除去を扱う。
 * 「相関と因果の違い」を潜在結果と交絡で説明する土台。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。乱数は呼び出し側の Rng に閉じる。
 */

import type { Rng } from "./random";

/** ボックス–ミュラー法で標準正規。 */
function gauss(rng: Rng): number {
  const u1 = Math.max(1e-12, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** 1個体：交絡変数 x（0/1）、2つの潜在結果、実際の処置。 */
export type Unit = {
  /** 交絡変数（例：重症度 0=軽症/1=重症）。処置の受けやすさと結果の両方に影響。 */
  x: number;
  /** 処置なしの潜在結果 Y(0)。 */
  y0: number;
  /** 処置ありの潜在結果 Y(1)。 */
  y1: number;
  /** 実際に処置を受けたか。 */
  treated: boolean;
};

/**
 * 潜在結果モデルで n 個体を生成。
 * - x〜Bernoulli(0.5)（交絡変数、例：重症度）。
 * - Y(0)=base + confounderEffect·x + 雑音。x（重症）ほど結果が悪い（値が大きい）。
 * - Y(1)=Y(0) + tau（一定の処置効果）。← 真の ATE は tau。
 * - 処置割り当て：randomized なら P(T=1)=0.5。非無作為なら «x（重症）ほど処置されやすい» 交絡
 *   P(T=1)=0.5 + selection·(x−0.5)。selection>0 で «重症ほど治療» の割り当て偏り。
 */
export function generateUnits(params: {
  n: number;
  tau: number;
  confounderEffect: number;
  selection: number;
  randomized: boolean;
  noiseSd?: number;
  base?: number;
  rng: Rng;
}): Unit[] {
  const { n, tau, confounderEffect, selection, randomized, noiseSd = 1, base = 10, rng } = params;
  const units: Unit[] = [];
  for (let i = 0; i < n; i++) {
    const x = rng() < 0.5 ? 0 : 1;
    const y0 = base + confounderEffect * x + noiseSd * gauss(rng);
    const y1 = y0 + tau;
    const pTreat = randomized ? 0.5 : Math.min(0.95, Math.max(0.05, 0.5 + selection * (x - 0.5)));
    units.push({ x, y0, y1, treated: rng() < pTreat });
  }
  return units;
}

/** 実際に観測される結果（処置を受けたら Y(1)、でなければ Y(0)）。 */
export function observedOutcome(u: Unit): number {
  return u.treated ? u.y1 : u.y0;
}

/** 平均。 */
function mean(xs: readonly number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/**
 * 真の平均処置効果 ATE = E[Y(1)−Y(0)]。両方の潜在結果を使う «神の視点»（本来は観測不能）。
 * シミュレーションでは真値を知っているので、推定のバイアスを測る基準に使う。
 */
export function ate(units: readonly Unit[]): number {
  return mean(units.map((u) => u.y1 - u.y0));
}

/**
 * 素朴比較：観測された «処置群の平均結果 − 対照群の平均結果»。
 * E[Y|T=1] − E[Y|T=0]。交絡があるとこれは ATE からズレる（相関≠因果）。
 */
export function naiveDifference(units: readonly Unit[]): number {
  const treated = units.filter((u) => u.treated).map(observedOutcome);
  const control = units.filter((u) => !u.treated).map(observedOutcome);
  return mean(treated) - mean(control);
}

/** 交絡バイアス = 素朴比較 − 真の ATE。無作為化・層別で0に近づく。 */
export function confoundingBias(units: readonly Unit[]): number {
  return naiveDifference(units) - ate(units);
}

/**
 * 層別調整した ATE 推定：交絡変数 x の各層で «処置群−対照群» を求め、層の大きさで加重平均。
 * «同じ x の中で比べる» ことで交絡を断ち切る（バックドア基準の最も単純な形）。
 */
export function stratifiedAte(units: readonly Unit[]): number {
  const strata = [...new Set(units.map((u) => u.x))];
  const n = units.length;
  let est = 0;
  for (const s of strata) {
    const group = units.filter((u) => u.x === s);
    const t = group.filter((u) => u.treated).map(observedOutcome);
    const c = group.filter((u) => !u.treated).map(observedOutcome);
    // 片群が空の層は寄与できない（推定不能）ので0扱い。
    if (t.length === 0 || c.length === 0) continue;
    est += (group.length / n) * (mean(t) - mean(c));
  }
  return est;
}

/** 処置群・対照群での交絡変数 x の平均（割り当ての偏りの可視化用）。 */
export function covariateBalance(units: readonly Unit[]): { treatedX: number; controlX: number } {
  const treatedX = mean(units.filter((u) => u.treated).map((u) => u.x));
  const controlX = mean(units.filter((u) => !u.treated).map((u) => u.x));
  return { treatedX, controlX };
}
