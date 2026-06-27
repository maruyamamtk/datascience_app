import { describe, expect, it } from "vitest";
import {
  binomialMgf,
  binomialPgf,
  binomialPmf,
  binomialPmfVector,
  cdfAt,
  cdfFromPmf,
  conditionalXgivenY,
  deriveMass,
  isIndependentJoint,
  marginalX,
  marginalY,
  mgfDerivativeAtZero,
  survivalFromCdf,
} from "./mass-functions";

describe("binomialPmf", () => {
  it("Bin(10,0.5) の P(X=5)=252/1024", () => {
    expect(binomialPmf(5, 10, 0.5)).toBeCloseTo(252 / 1024, 12);
  });
  it("範囲外は0", () => {
    expect(binomialPmf(-1, 10, 0.5)).toBe(0);
    expect(binomialPmf(11, 10, 0.5)).toBe(0);
  });
  it("確率関数ベクトルは総和1", () => {
    const v = binomialPmfVector(10, 0.3);
    expect(v).toHaveLength(11);
    expect(v.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });
});

describe("cdf / survival", () => {
  const pmf = binomialPmfVector(10, 0.5);
  const cdf = cdfFromPmf(pmf);
  it("CDFは単調増加で末尾が1", () => {
    for (let i = 1; i < cdf.length; i++) expect(cdf[i]).toBeGreaterThanOrEqual(cdf[i - 1]);
    expect(cdf[cdf.length - 1]).toBeCloseTo(1, 12);
  });
  it("生存関数 S=1−F", () => {
    const s = survivalFromCdf(cdf);
    s.forEach((sv, i) => expect(sv).toBeCloseTo(1 - cdf[i], 12));
  });
  it("cdfAt は ⌊x⌋ までの和、範囲外をクランプ", () => {
    expect(cdfAt(pmf, 5)).toBeCloseTo(cdf[5], 12);
    expect(cdfAt(pmf, 5.9)).toBeCloseTo(cdf[5], 12);
    expect(cdfAt(pmf, -1)).toBe(0);
    expect(cdfAt(pmf, 100)).toBeCloseTo(1, 12);
  });
});

describe("母関数（モーメント・確率）", () => {
  it("MGF: M(0)=1", () => {
    expect(binomialMgf(0, 10, 0.5)).toBeCloseTo(1, 12);
  });
  it("MGF が平均と分散を生む: M'(0)=np, M''(0)=E[X²]", () => {
    const n = 10;
    const p = 0.3;
    const mgf = (t: number) => binomialMgf(t, n, p);
    expect(mgfDerivativeAtZero(mgf, 1)).toBeCloseTo(n * p, 4); // μ=3
    const ex2 = mgfDerivativeAtZero(mgf, 2); // E[X²]=Var+μ²=2.1+9
    expect(ex2).toBeCloseTo(n * p * (1 - p) + (n * p) ** 2, 3);
  });
  it("PGF: G(1)=1、G'(1)=np（数値）", () => {
    expect(binomialPgf(1, 10, 0.5)).toBeCloseTo(1, 12);
    const h = 1e-4;
    const dg = (binomialPgf(1 + h, 10, 0.5) - binomialPgf(1 - h, 10, 0.5)) / (2 * h);
    expect(dg).toBeCloseTo(5, 4);
  });
});

describe("同時・周辺・条件付き分布", () => {
  // 独立な例: P(X)=[0.5,0.5], P(Y)=[0.2,0.8]
  const indep: number[][] = [
    [0.1, 0.4],
    [0.1, 0.4],
  ];
  // 従属な例
  const dep: number[][] = [
    [0.4, 0.1],
    [0.1, 0.4],
  ];

  it("周辺分布は行和・列和", () => {
    expect(marginalX(indep)).toEqual([0.5, 0.5]);
    expect(marginalY(indep)).toEqual([0.2, 0.8]);
  });
  it("条件付き分布は列を正規化", () => {
    // P(X|Y=0) for dep: column0=[0.4,0.1], py0=0.5 -> [0.8,0.2]
    const c = conditionalXgivenY(dep, 0);
    expect(c[0]).toBeCloseTo(0.8, 12);
    expect(c[1]).toBeCloseTo(0.2, 12);
  });
  it("独立判定 P(X,Y)=P(X)P(Y)", () => {
    expect(isIndependentJoint(indep)).toBe(true);
    expect(isIndependentJoint(dep)).toBe(false);
  });
});

describe("deriveMass", () => {
  it("controls から PMF/CDF/生存/平均/分散を返す", () => {
    const d = deriveMass({ n: 10, p: 0.5, x: 5 });
    expect(d.mean).toBeCloseTo(5, 12);
    expect(d.variance).toBeCloseTo(2.5, 12);
    expect(d.cdfAtX).toBeCloseTo(d.cdf[5], 12);
    expect(d.survivalAtX).toBeCloseTo(1 - d.cdf[5], 12);
  });
});
