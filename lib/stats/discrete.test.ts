import { describe, expect, it } from "vitest";
import {
  DISCRETE_SPECS,
  discretePmfVector,
  discreteUniformPmf,
  geometricPmf,
  negativeBinomialPmf,
  poissonPmf,
} from "./discrete";

describe("poissonPmf", () => {
  it("Po(λ) の P(X=0)=e^{-λ}", () => {
    expect(poissonPmf(0, 2)).toBeCloseTo(Math.exp(-2), 12);
  });
  it("Po(3) の P(X=2)=e^{-3}·9/2", () => {
    expect(poissonPmf(2, 3)).toBeCloseTo((Math.exp(-3) * 9) / 2, 12);
  });
  it("総和≈1（λ=4 を 0..40 で）", () => {
    let s = 0;
    for (let k = 0; k <= 40; k++) s += poissonPmf(k, 4);
    expect(s).toBeCloseTo(1, 8);
  });
});

describe("geometricPmf（失敗回数版）", () => {
  it("P(X=0)=p、P(X=1)=(1-p)p", () => {
    expect(geometricPmf(0, 0.3)).toBeCloseTo(0.3, 12);
    expect(geometricPmf(1, 0.3)).toBeCloseTo(0.7 * 0.3, 12);
  });
  it("総和≈1", () => {
    let s = 0;
    for (let k = 0; k <= 200; k++) s += geometricPmf(k, 0.2);
    expect(s).toBeCloseTo(1, 6);
  });
});

describe("negativeBinomialPmf", () => {
  it("r=1 なら幾何分布に一致", () => {
    for (let k = 0; k <= 5; k++) {
      expect(negativeBinomialPmf(k, 1, 0.4)).toBeCloseTo(geometricPmf(k, 0.4), 12);
    }
  });
  it("総和≈1", () => {
    let s = 0;
    for (let k = 0; k <= 300; k++) s += negativeBinomialPmf(k, 3, 0.3);
    expect(s).toBeCloseTo(1, 5);
  });
});

describe("discreteUniformPmf", () => {
  it("各値 1/n、範囲外0", () => {
    expect(discreteUniformPmf(0, 6)).toBeCloseTo(1 / 6, 12);
    expect(discreteUniformPmf(6, 6)).toBe(0);
  });
});

describe("DISCRETE_SPECS の平均・分散", () => {
  it("二項: μ=np, σ²=np(1-p)", () => {
    const pr = { n: 10, p: 0.3, lambda: 3, r: 2 };
    expect(DISCRETE_SPECS.binomial.mean(pr)).toBeCloseTo(3, 12);
    expect(DISCRETE_SPECS.binomial.variance(pr)).toBeCloseTo(2.1, 12);
  });
  it("ポアソン: 平均=分散=λ", () => {
    const pr = { n: 10, p: 0.3, lambda: 4, r: 2 };
    expect(DISCRETE_SPECS.poisson.mean(pr)).toBe(4);
    expect(DISCRETE_SPECS.poisson.variance(pr)).toBe(4);
  });
  it("幾何（失敗回数版）: μ=(1-p)/p", () => {
    const pr = { n: 10, p: 0.25, lambda: 3, r: 2 };
    expect(DISCRETE_SPECS.geometric.mean(pr)).toBeCloseTo(3, 12);
  });
  it("PMF ベクトルは確率（総和≤1, 非負）", () => {
    const v = discretePmfVector("poisson", { n: 10, p: 0.3, lambda: 5, r: 2 });
    expect(v.every((x) => x >= 0)).toBe(true);
    expect(v.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(1.0000001);
  });
});

describe("二項→ポアソン近似", () => {
  it("n大・p小（np=λ固定）で二項はポアソンに近い", () => {
    const lambda = 3;
    const n = 500;
    const p = lambda / n;
    for (let k = 0; k <= 6; k++) {
      expect(DISCRETE_SPECS.binomial.pmf(k, { n, p, lambda, r: 1 })).toBeCloseTo(
        poissonPmf(k, lambda),
        2,
      );
    }
  });
});
