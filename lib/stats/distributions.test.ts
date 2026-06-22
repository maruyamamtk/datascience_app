import { describe, expect, it } from "vitest";
import { DISTRIBUTIONS, getDistribution, type DistKind } from "./distributions";
import { mulberry32 } from "./random";

describe("distributions の理論値", () => {
  it("3 分布すべて母平均 μ=5 に揃っている（中心固定）", () => {
    for (const d of DISTRIBUTIONS) {
      expect(d.mean).toBe(5);
    }
  });

  it("一様 U[0,10] の σ は 10/√12", () => {
    expect(getDistribution("uniform").sd).toBeCloseTo(10 / Math.sqrt(12), 10);
  });

  it("指数分布は σ = 平均 = 5", () => {
    expect(getDistribution("exponential").sd).toBe(5);
  });

  it("二項 Bin(10,0.5) の σ は √2.5", () => {
    expect(getDistribution("binomial").sd).toBeCloseTo(Math.sqrt(2.5), 10);
  });
});

describe("各分布の sample（経験値が理論値に近づく）", () => {
  const kinds: DistKind[] = ["uniform", "exponential", "binomial"];

  for (const kind of kinds) {
    it(`${kind}: 大量サンプルの平均・SD が理論 μ・σ に近い`, () => {
      const dist = getDistribution(kind);
      const rng = mulberry32(2026);
      const N = 40000;
      let sum = 0;
      let sumSq = 0;
      for (let i = 0; i < N; i++) {
        const x = dist.sample(rng);
        sum += x;
        sumSq += x * x;
      }
      const empMean = sum / N;
      const empVar = sumSq / N - empMean * empMean;
      expect(Math.abs(empMean - dist.mean)).toBeLessThan(0.2);
      expect(Math.abs(Math.sqrt(empVar) - dist.sd)).toBeLessThan(0.3);
    });
  }

  it("二項は 0..trials の整数のみを返す", () => {
    const dist = getDistribution("binomial");
    const rng = mulberry32(5);
    for (let i = 0; i < 500; i++) {
      const x = dist.sample(rng);
      expect(Number.isInteger(x)).toBe(true);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(dist.max);
    }
  });

  it("指数は常に非負", () => {
    const dist = getDistribution("exponential");
    const rng = mulberry32(9);
    for (let i = 0; i < 500; i++) {
      expect(dist.sample(rng)).toBeGreaterThanOrEqual(0);
    }
  });
});
