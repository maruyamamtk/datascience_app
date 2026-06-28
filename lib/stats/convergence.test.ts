import { describe, expect, it } from "vitest";
import {
  binomialExactCdf,
  binomialNormalApproxCdf,
  deltaMethodVariance,
  maxApproxError,
  runningMeans,
} from "./convergence";

describe("runningMeans", () => {
  it("累積平均（i番目は最初のi個の平均）", () => {
    expect(runningMeans([2, 4, 6])).toEqual([2, 3, 4]);
  });
  it("一定値なら累積平均も一定", () => {
    expect(runningMeans([5, 5, 5])).toEqual([5, 5, 5]);
  });
});

describe("binomial 正規近似 vs 正確", () => {
  it("正確な CDF は単調で末尾が1", () => {
    expect(binomialExactCdf(10, 10, 0.5)).toBeCloseTo(1, 12);
    expect(binomialExactCdf(5, 10, 0.5)).toBeCloseTo(0.623046875, 9);
  });
  it("連続修正ありの方が最大誤差が小さい（n=20,p=0.5）", () => {
    const withCC = maxApproxError(20, 0.5, true);
    const withoutCC = maxApproxError(20, 0.5, false);
    expect(withCC).toBeLessThan(withoutCC);
  });
  it("n を大きくすると近似誤差は小さくなる", () => {
    const small = maxApproxError(10, 0.5, true);
    const large = maxApproxError(100, 0.5, true);
    expect(large).toBeLessThan(small);
  });
  it("連続修正は境界に+0.5（k=npで Φ(0.5/σ)>0.5）", () => {
    // n=10,p=0.5: np=5, σ=√2.5. P(X≤5) 近似(cc)=Φ(0.5/√2.5)
    const approx = binomialNormalApproxCdf(5, 10, 0.5, true);
    expect(approx).toBeGreaterThan(0.5);
  });
});

describe("deltaMethodVariance", () => {
  it("g(X̄)≈N(g(μ), g'(μ)²σ²/n)", () => {
    // g'(μ)=2, σ²=4, n=100 -> 4*4/100=0.16
    expect(deltaMethodVariance(2, 4, 100)).toBeCloseTo(0.16, 12);
  });
  it("n≤0 は NaN", () => {
    expect(deltaMethodVariance(1, 1, 0)).toBeNaN();
  });
});
