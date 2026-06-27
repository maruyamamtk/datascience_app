/**
 * 確率分布と母関数（B-2）トピックの計算層（純関数）。
 * 二項分布を題材に、確率関数 PMF・累積分布関数 CDF・生存関数 S(x)・モーメント母関数 MGF・
 * 確率母関数 PGF を解析的に与える。同時・周辺・条件付き分布も純関数で扱う。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。
 * 二項係数は既存 `combinatorics.ts` を再利用する（重複実装を避ける）。
 */

import { combinations } from "./combinatorics";

/** 二項分布 Bin(n,p) の確率関数 P(X=k)=C(n,k)p^k(1−p)^{n−k}。範囲外は 0。 */
export function binomialPmf(k: number, n: number, p: number): number {
  if (!Number.isInteger(k) || k < 0 || k > n) return 0;
  return combinations(n, k) * p ** k * (1 - p) ** (n - k);
}

/** 二項分布の確率関数ベクトル [P(X=0),…,P(X=n)]。 */
export function binomialPmfVector(n: number, p: number): number[] {
  const out: number[] = [];
  for (let k = 0; k <= n; k++) out.push(binomialPmf(k, n, p));
  return out;
}

/**
 * 確率関数ベクトルから累積分布関数 F(k)=P(X≤k) のベクトルを作る（前から足し上げる）。
 * 最後の要素は（丸め誤差を除き）1 になる。
 */
export function cdfFromPmf(pmf: readonly number[]): number[] {
  const out: number[] = [];
  let acc = 0;
  for (const p of pmf) {
    acc += p;
    out.push(acc);
  }
  return out;
}

/** 生存関数 S(k)=P(X>k)=1−F(k) のベクトル。 */
export function survivalFromCdf(cdf: readonly number[]): number[] {
  return cdf.map((f) => 1 - f);
}

/**
 * しきい値 x 以下の確率 F(x)=P(X≤x)（x は実数でよい。⌊x⌋ までを足す）。
 * x<0 は 0、x≥n は 1。
 */
export function cdfAt(pmf: readonly number[], x: number): number {
  if (x < 0) return 0;
  const upper = Math.min(pmf.length - 1, Math.floor(x));
  let acc = 0;
  for (let k = 0; k <= upper; k++) acc += pmf[k];
  return acc;
}

/** 二項分布のモーメント母関数 M_X(t)=E[e^{tX}]=(1−p+p e^t)^n。M(0)=1、M'(0)=np=μ。 */
export function binomialMgf(t: number, n: number, p: number): number {
  return (1 - p + p * Math.exp(t)) ** n;
}

/** 二項分布の確率母関数 G_X(z)=E[z^X]=(1−p+p z)^n。G(1)=1、G'(1)=np=μ。 */
export function binomialPgf(z: number, n: number, p: number): number {
  return (1 - p + p * z) ** n;
}

/**
 * モーメント母関数の原点での k 階微分を中心差分で数値的に近似する純関数。
 * M^{(1)}(0)=E[X]、M^{(2)}(0)=E[X^2] を «母関数がモーメントを生む» こととして確かめる用途。
 */
export function mgfDerivativeAtZero(mgf: (t: number) => number, order: 1 | 2, h = 1e-3): number {
  if (order === 1) {
    return (mgf(h) - mgf(-h)) / (2 * h);
  }
  return (mgf(h) - 2 * mgf(0) + mgf(-h)) / (h * h);
}

/** 二項分布ラボの操作値。 */
export type MassControls = {
  /** 試行回数 n。 */
  n: number;
  /** 成功確率 p。 */
  p: number;
  /** CDF / 生存関数を読むしきい値 x（0..n の整数想定）。 */
  x: number;
};

/** 二項分布ラボの派生値（controls から純関数で再計算）。 */
export type MassDerived = {
  /** 確率関数ベクトル。 */
  pmf: number[];
  /** 累積分布関数ベクトル。 */
  cdf: number[];
  /** 生存関数ベクトル。 */
  survival: number[];
  /** F(x)=P(X≤x)。 */
  cdfAtX: number;
  /** S(x)=P(X>x)=1−F(x)。 */
  survivalAtX: number;
  /** 母平均 μ=np。 */
  mean: number;
  /** 母分散 σ²=np(1−p)。 */
  variance: number;
};

/** 操作値から派生値を導出する純関数。ストアの `derive` に渡す唯一の計算入口。 */
export function deriveMass({ n, p, x }: MassControls): MassDerived {
  const pmf = binomialPmfVector(n, p);
  const cdf = cdfFromPmf(pmf);
  const survival = survivalFromCdf(cdf);
  const cdfAtX = cdfAt(pmf, x);
  return {
    pmf,
    cdf,
    survival,
    cdfAtX,
    survivalAtX: 1 - cdfAtX,
    mean: n * p,
    variance: n * p * (1 - p),
  };
}

/** 同時分布（行=X の値, 列=Y の値の確率行列）。総和は 1 を想定。 */
export type JointDist = number[][];

/** 周辺分布 P(X=i)=Σ_j P(X=i,Y=j)（各行の和）。 */
export function marginalX(joint: JointDist): number[] {
  return joint.map((row) => row.reduce((a, b) => a + b, 0));
}

/** 周辺分布 P(Y=j)=Σ_i P(X=i,Y=j)（各列の和）。 */
export function marginalY(joint: JointDist): number[] {
  const cols = joint[0]?.length ?? 0;
  const out = new Array(cols).fill(0);
  for (const row of joint) for (let j = 0; j < cols; j++) out[j] += row[j];
  return out;
}

/**
 * 条件付き分布 P(X=i | Y=j)=P(X=i,Y=j)/P(Y=j)（列 j を正規化）。
 * P(Y=j)=0 のときは全要素 NaN。
 */
export function conditionalXgivenY(joint: JointDist, j: number): number[] {
  const py = marginalY(joint)[j] ?? 0;
  return joint.map((row) => (py > 0 ? row[j] / py : Number.NaN));
}

/** 同時分布が積に分解できる（独立 P(X,Y)=P(X)P(Y)）かを許容誤差内で判定。 */
export function isIndependentJoint(joint: JointDist, tol = 1e-9): boolean {
  const px = marginalX(joint);
  const py = marginalY(joint);
  for (let i = 0; i < joint.length; i++) {
    for (let j = 0; j < joint[i].length; j++) {
      if (Math.abs(joint[i][j] - px[i] * py[j]) > tol) return false;
    }
  }
  return true;
}
