/**
 * 離散型確率分布（C-1）トピックの計算層（純関数）。
 * 離散一様・ベルヌーイ・二項・ポアソン・幾何・負の二項の確率関数（PMF）と理論平均・分散を与え、
 * 共通インターフェース（種別＋パラメータ → PMF ベクトル）でラボから扱えるようにする。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。
 * 二項の PMF・二項係数は既存 `mass-functions.ts` / `combinatorics.ts` を再利用する。
 */

import { combinations } from "./combinatorics";
import { binomialPmf } from "./mass-functions";

/** ポアソン分布 P(X=k)=e^{-λ}λ^k/k!（k≥0）。 */
export function poissonPmf(k: number, lambda: number): number {
  if (!Number.isInteger(k) || k < 0 || lambda < 0) return 0;
  // log で計算して桁あふれを防ぐ。
  let logFact = 0;
  for (let i = 2; i <= k; i++) logFact += Math.log(i);
  return Math.exp(-lambda + k * Math.log(lambda || 1e-300) - logFact);
}

/** 幾何分布（初回成功までの «失敗回数» k≥0 の版）P(X=k)=(1-p)^k p。 */
export function geometricPmf(k: number, p: number): number {
  if (!Number.isInteger(k) || k < 0 || p <= 0 || p > 1) return 0;
  return (1 - p) ** k * p;
}

/** 負の二項分布（r 回成功までの «失敗回数» k≥0）P(X=k)=C(k+r-1,k)p^r(1-p)^k。 */
export function negativeBinomialPmf(k: number, r: number, p: number): number {
  if (!Number.isInteger(k) || k < 0 || r < 1 || p <= 0 || p > 1) return 0;
  return combinations(k + r - 1, k) * p ** r * (1 - p) ** k;
}

/** 離散一様分布 U{0,…,n-1}: 各値 1/n。 */
export function discreteUniformPmf(k: number, n: number): number {
  if (!Number.isInteger(k) || k < 0 || k >= n) return 0;
  return 1 / n;
}

/** 離散分布の種別。 */
export type DiscreteKind =
  | "uniform"
  | "bernoulli"
  | "binomial"
  | "poisson"
  | "geometric"
  | "negativeBinomial";

/** 種別ごとのパラメータ（使うものだけ持つ）。 */
export type DiscreteParams = {
  /** 二項・一様の試行回数 / 台のサイズ。 */
  n: number;
  /** 成功確率（ベルヌーイ・二項・幾何・負の二項）。 */
  p: number;
  /** ポアソンの平均 λ。 */
  lambda: number;
  /** 負の二項の成功回数 r。 */
  r: number;
};

/** 分布のメタ情報（表示名・平均・分散・PMF・推奨表示範囲）。 */
export type DiscreteSpec = {
  kind: DiscreteKind;
  label: string;
  paramText: (pr: DiscreteParams) => string;
  mean: (pr: DiscreteParams) => number;
  variance: (pr: DiscreteParams) => number;
  pmf: (k: number, pr: DiscreteParams) => number;
  /** PMF ベクトルを描く上限 k（包括的）。 */
  support: (pr: DiscreteParams) => number;
};

const f = (x: number, d = 2) => Number(x.toFixed(d));

export const DISCRETE_SPECS: Record<DiscreteKind, DiscreteSpec> = {
  uniform: {
    kind: "uniform",
    label: "離散一様",
    paramText: (pr) => `U{0,…,${pr.n - 1}}`,
    mean: (pr) => (pr.n - 1) / 2,
    variance: (pr) => (pr.n * pr.n - 1) / 12,
    pmf: (k, pr) => discreteUniformPmf(k, pr.n),
    support: (pr) => pr.n - 1,
  },
  bernoulli: {
    kind: "bernoulli",
    label: "ベルヌーイ",
    paramText: (pr) => `Ber(${f(pr.p)})`,
    mean: (pr) => pr.p,
    variance: (pr) => pr.p * (1 - pr.p),
    pmf: (k, pr) => binomialPmf(k, 1, pr.p),
    support: () => 1,
  },
  binomial: {
    kind: "binomial",
    label: "二項",
    paramText: (pr) => `Bin(${pr.n}, ${f(pr.p)})`,
    mean: (pr) => pr.n * pr.p,
    variance: (pr) => pr.n * pr.p * (1 - pr.p),
    pmf: (k, pr) => binomialPmf(k, pr.n, pr.p),
    support: (pr) => pr.n,
  },
  poisson: {
    kind: "poisson",
    label: "ポアソン",
    paramText: (pr) => `Po(${f(pr.lambda)})`,
    mean: (pr) => pr.lambda,
    variance: (pr) => pr.lambda,
    pmf: (k, pr) => poissonPmf(k, pr.lambda),
    support: (pr) => Math.max(8, Math.ceil(pr.lambda + 4 * Math.sqrt(pr.lambda + 1))),
  },
  geometric: {
    kind: "geometric",
    label: "幾何",
    paramText: (pr) => `Geo(${f(pr.p)})`,
    mean: (pr) => (1 - pr.p) / pr.p,
    variance: (pr) => (1 - pr.p) / (pr.p * pr.p),
    pmf: (k, pr) => geometricPmf(k, pr.p),
    support: (pr) => Math.max(8, Math.ceil((1 - pr.p) / pr.p + (4 * Math.sqrt(1 - pr.p)) / pr.p)),
  },
  negativeBinomial: {
    kind: "negativeBinomial",
    label: "負の二項",
    paramText: (pr) => `NB(${pr.r}, ${f(pr.p)})`,
    mean: (pr) => (pr.r * (1 - pr.p)) / pr.p,
    variance: (pr) => (pr.r * (1 - pr.p)) / (pr.p * pr.p),
    pmf: (k, pr) => negativeBinomialPmf(k, pr.r, pr.p),
    support: (pr) =>
      Math.max(
        10,
        Math.ceil((pr.r * (1 - pr.p)) / pr.p + 4 * Math.sqrt((pr.r * (1 - pr.p)) / (pr.p * pr.p))),
      ),
  },
};

/** 種別とパラメータから PMF ベクトル [P(X=0),…,P(X=support)] を作る。 */
export function discretePmfVector(kind: DiscreteKind, pr: DiscreteParams): number[] {
  const spec = DISCRETE_SPECS[kind];
  const upper = Math.min(60, Math.max(1, spec.support(pr)));
  const out: number[] = [];
  for (let k = 0; k <= upper; k++) out.push(spec.pmf(k, pr));
  return out;
}
