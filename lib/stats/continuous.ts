/**
 * 連続型確率分布（C-2）トピックの計算層（純関数）。
 * 連続一様・指数・ガンマ・ベータ・対数正規・コーシー・半正規の確率密度関数（PDF）と理論平均・分散を、
 * 共通インターフェース（種別＋パラメータ → PDF）でラボから扱えるようにする。正規分布は既存トピックに譲る。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。ガンマ・ベータ関数は lnGamma（Lanczos 近似）で実装。
 */

const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
  1.5056327351493116e-7,
];

/** ln Γ(x)（Lanczos 近似、x>0）。ガンマ・ベータ分布の正規化定数に使う。 */
export function lnGamma(x: number): number {
  if (x < 0.5) {
    // 反射公式 Γ(x)Γ(1-x)=π/sin(πx)。
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
  }
  const z = x - 1;
  let a = LANCZOS[0];
  const t = z + 7.5;
  for (let i = 1; i < LANCZOS.length; i++) a += LANCZOS[i] / (z + i);
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Γ(x)。 */
export function gammaFn(x: number): number {
  return Math.exp(lnGamma(x));
}

/** 連続一様 U[a,b] の密度。 */
export function uniformPdf(x: number, a: number, b: number): number {
  return x >= a && x <= b ? 1 / (b - a) : 0;
}

/** 指数分布（率 λ）の密度 λe^{-λx}（x≥0）。平均 1/λ。 */
export function exponentialPdf(x: number, lambda: number): number {
  if (x < 0) return 0;
  return lambda * Math.exp(-lambda * x);
}

/** ガンマ分布（形状 k>0・尺度 θ>0）の密度。平均 kθ、分散 kθ²。 */
export function gammaPdf(x: number, k: number, theta: number): number {
  if (x < 0) return 0;
  if (x === 0) return k < 1 ? Infinity : k === 1 ? 1 / theta : 0;
  const logPdf = (k - 1) * Math.log(x) - x / theta - k * Math.log(theta) - lnGamma(k);
  return Math.exp(logPdf);
}

/** ベータ分布（α,β>0）の密度（台 [0,1]）。平均 α/(α+β)。 */
export function betaPdf(x: number, alpha: number, beta: number): number {
  if (x < 0 || x > 1) return 0;
  if (x === 0 || x === 1) {
    // 端点は α,β に応じて 0 / 有限 / 発散。描画では大きな値を避け 0 に丸める。
    if (x === 0) return alpha < 1 ? Infinity : alpha === 1 ? beta : 0;
    return beta < 1 ? Infinity : beta === 1 ? alpha : 0;
  }
  const lnB = lnGamma(alpha) + lnGamma(beta) - lnGamma(alpha + beta);
  return Math.exp((alpha - 1) * Math.log(x) + (beta - 1) * Math.log(1 - x) - lnB);
}

/** コーシー分布（位置 x0・尺度 γ）の密度。平均・分散は存在しない（裾が重い）。 */
export function cauchyPdf(x: number, x0: number, gamma: number): number {
  return 1 / (Math.PI * gamma * (1 + ((x - x0) / gamma) ** 2));
}

/** 対数正規分布（log が N(μ,σ²)）の密度（x>0）。 */
export function lognormalPdf(x: number, mu: number, sigma: number): number {
  if (x <= 0) return 0;
  return (
    Math.exp(-((Math.log(x) - mu) ** 2) / (2 * sigma * sigma)) /
    (x * sigma * Math.sqrt(2 * Math.PI))
  );
}

/** 半正規分布（|N(0,σ²)|）の密度（x≥0）。 */
export function halfNormalPdf(x: number, sigma: number): number {
  if (x < 0) return 0;
  return (Math.SQRT2 / (sigma * Math.sqrt(Math.PI))) * Math.exp(-(x * x) / (2 * sigma * sigma));
}

/** 連続分布の種別。 */
export type ContinuousKind =
  | "uniform"
  | "exponential"
  | "gamma"
  | "beta"
  | "lognormal"
  | "cauchy"
  | "halfNormal";

/** 種別ごとのパラメータ（使うものだけ持つ）。 */
export type ContinuousParams = {
  /** 指数の率 λ。 */
  lambda: number;
  /** ガンマ形状 k / ベータ α。 */
  k: number;
  /** ガンマ尺度 θ / ベータ β。 */
  theta: number;
  /** 位置・log平均（コーシー x0 / 対数正規 μ）。 */
  mu: number;
  /** 尺度（コーシー γ / 対数正規 σ / 半正規 σ）。 */
  sigma: number;
};

/** 分布のメタ情報（表示名・平均・分散・PDF・推奨表示範囲）。平均/分散が存在しない場合は NaN。 */
export type ContinuousSpec = {
  kind: ContinuousKind;
  label: string;
  paramText: (pr: ContinuousParams) => string;
  mean: (pr: ContinuousParams) => number;
  variance: (pr: ContinuousParams) => number;
  pdf: (x: number, pr: ContinuousParams) => number;
  /** 描画レンジ [min,max]。 */
  range: (pr: ContinuousParams) => [number, number];
};

const f = (x: number, d = 2) => Number(x.toFixed(d));

export const CONTINUOUS_SPECS: Record<ContinuousKind, ContinuousSpec> = {
  uniform: {
    kind: "uniform",
    label: "連続一様",
    paramText: () => `U[0, 4]`,
    mean: () => 2,
    variance: () => 16 / 12,
    pdf: (x) => uniformPdf(x, 0, 4),
    range: () => [-0.5, 4.5],
  },
  exponential: {
    kind: "exponential",
    label: "指数",
    paramText: (pr) => `Exp(λ=${f(pr.lambda)})`,
    mean: (pr) => 1 / pr.lambda,
    variance: (pr) => 1 / (pr.lambda * pr.lambda),
    pdf: (x, pr) => exponentialPdf(x, pr.lambda),
    range: (pr) => [0, Math.max(4, 5 / pr.lambda)],
  },
  gamma: {
    kind: "gamma",
    label: "ガンマ",
    paramText: (pr) => `Gamma(k=${f(pr.k)}, θ=${f(pr.theta)})`,
    mean: (pr) => pr.k * pr.theta,
    variance: (pr) => pr.k * pr.theta * pr.theta,
    pdf: (x, pr) => gammaPdf(x, pr.k, pr.theta),
    range: (pr) => [0, Math.max(6, pr.k * pr.theta + 4 * Math.sqrt(pr.k) * pr.theta)],
  },
  beta: {
    kind: "beta",
    label: "ベータ",
    paramText: (pr) => `Beta(α=${f(pr.k)}, β=${f(pr.theta)})`,
    mean: (pr) => pr.k / (pr.k + pr.theta),
    variance: (pr) => (pr.k * pr.theta) / ((pr.k + pr.theta) ** 2 * (pr.k + pr.theta + 1)),
    pdf: (x, pr) => betaPdf(x, pr.k, pr.theta),
    range: () => [0, 1],
  },
  lognormal: {
    kind: "lognormal",
    label: "対数正規",
    paramText: (pr) => `LogN(μ=${f(pr.mu)}, σ=${f(pr.sigma)})`,
    mean: (pr) => Math.exp(pr.mu + (pr.sigma * pr.sigma) / 2),
    variance: (pr) =>
      (Math.exp(pr.sigma * pr.sigma) - 1) * Math.exp(2 * pr.mu + pr.sigma * pr.sigma),
    pdf: (x, pr) => lognormalPdf(x, pr.mu, pr.sigma),
    range: () => [0, 8],
  },
  cauchy: {
    kind: "cauchy",
    label: "コーシー",
    paramText: (pr) => `Cauchy(x₀=${f(pr.mu)}, γ=${f(pr.sigma)})`,
    mean: () => Number.NaN, // 平均は存在しない
    variance: () => Number.NaN, // 分散も存在しない
    pdf: (x, pr) => cauchyPdf(x, pr.mu, pr.sigma),
    range: () => [-8, 8],
  },
  halfNormal: {
    kind: "halfNormal",
    label: "半正規",
    paramText: (pr) => `HalfN(σ=${f(pr.sigma)})`,
    mean: (pr) => pr.sigma * Math.sqrt(2 / Math.PI),
    variance: (pr) => pr.sigma * pr.sigma * (1 - 2 / Math.PI),
    pdf: (x, pr) => halfNormalPdf(x, pr.sigma),
    range: (pr) => [0, Math.max(4, 4 * pr.sigma)],
  },
};

/** 種別とパラメータから PDF のサンプル点列 [{x,y}] を作る（描画用、samples+1 点）。 */
export function continuousCurve(
  kind: ContinuousKind,
  pr: ContinuousParams,
  samples = 160,
): { x: number; y: number }[] {
  const spec = CONTINUOUS_SPECS[kind];
  const [lo, hi] = spec.range(pr);
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i <= samples; i++) {
    const x = lo + (i / samples) * (hi - lo);
    const y = spec.pdf(x, pr);
    out.push({ x, y: Number.isFinite(y) ? y : 0 });
  }
  return out;
}
