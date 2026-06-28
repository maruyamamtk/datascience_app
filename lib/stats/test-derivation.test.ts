import { describe, expect, it } from "vitest";
import {
  normalLogLikMu,
  normalTestErrors,
  npThreshold,
  threeTestStatistics,
} from "./test-derivation";

describe("normalTestErrors", () => {
  it("c=μ0 のとき α=0.5（H0分布の中央で切る）", () => {
    const { alpha } = normalTestErrors({ mu0: 0, mu1: 1, sigma: 1, n: 1, c: 0 });
    expect(alpha).toBeCloseTo(0.5, 6);
  });
  it("c を上げると α は減り power も減る（トレードオフ）", () => {
    const lo = normalTestErrors({ mu0: 0, mu1: 1, sigma: 1, n: 16, c: 0.3 });
    const hi = normalTestErrors({ mu0: 0, mu1: 1, sigma: 1, n: 16, c: 0.6 });
    expect(hi.alpha).toBeLessThan(lo.alpha);
    expect(hi.power).toBeLessThan(lo.power);
  });
  it("μ1>μ0 のとき power>α（検出力は有意水準を上回る）", () => {
    const { alpha, power } = normalTestErrors({ mu0: 0, mu1: 1, sigma: 1, n: 16, c: 0.4 });
    expect(power).toBeGreaterThan(alpha);
  });
});

describe("npThreshold（ネイマン・ピアソン閾値）", () => {
  it("α=0.05 の閾値で実際の α が 0.05 になる", () => {
    const c = npThreshold(0, 1, 25, 0.05);
    const { alpha } = normalTestErrors({ mu0: 0, mu1: 1, sigma: 1, n: 25, c });
    expect(alpha).toBeCloseTo(0.05, 4);
  });
  it("c = μ0 + z_{0.95}·se ≈ 0 + 1.645·0.2", () => {
    const c = npThreshold(0, 1, 25, 0.05); // se=0.2
    expect(c).toBeCloseTo(1.645 * 0.2, 2);
  });
});

describe("threeTestStatistics（正規では3検定が一致）", () => {
  it("Wald=Score=LRT=z²", () => {
    const s = threeTestStatistics({ xbar: 0.5, mu0: 0, sigma: 1, n: 16 });
    const z = (0.5 - 0) / (1 / 4); // se=0.25 → z=2
    expect(s.z).toBeCloseTo(z, 12);
    expect(s.wald).toBeCloseTo(z * z, 12);
    expect(s.wald).toBe(s.score);
    expect(s.score).toBe(s.lrt);
  });
});

describe("normalLogLikMu", () => {
  it("対数尤度は μ=x̄ で最大（=0, 相対値）", () => {
    const at = normalLogLikMu(2, 2, 1, 10);
    const off = normalLogLikMu(1.5, 2, 1, 10);
    expect(at).toBeCloseTo(0, 12);
    expect(at).toBeGreaterThan(off);
  });
});
