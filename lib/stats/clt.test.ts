import { describe, expect, it } from "vitest";
import { deriveClt, drawSample, drawSampleMeans, sampleMean, standardError } from "./clt";
import { getDistribution } from "./distributions";
import { mulberry32 } from "./random";

describe("standardError", () => {
  it("σ/√n を返す", () => {
    expect(standardError(2, 4)).toBe(1);
    expect(standardError(10, 100)).toBe(1);
  });

  it("n を4倍にすると SE は半分になる", () => {
    expect(standardError(8, 4)).toBeCloseTo(4);
    expect(standardError(8, 16)).toBeCloseTo(2);
  });

  it("n<=0 は NaN", () => {
    expect(Number.isNaN(standardError(1, 0))).toBe(true);
    expect(Number.isNaN(standardError(1, -3))).toBe(true);
  });
});

describe("deriveClt", () => {
  it("元分布から μ・σ・SE を計算する（一様 U[0,10], n=4）", () => {
    const d = deriveClt({ distKind: "uniform", n: 4 });
    expect(d.mu).toBe(5);
    expect(d.sigma).toBeCloseTo(10 / Math.sqrt(12), 10);
    expect(d.standardError).toBeCloseTo(getDistribution("uniform").sd / 2, 10);
  });

  it("元分布を変えると μ は固定(5)・σ と SE が連動する", () => {
    const exp = deriveClt({ distKind: "exponential", n: 25 });
    expect(exp.mu).toBe(5);
    expect(exp.sigma).toBe(5);
    expect(exp.standardError).toBe(1); // 5/√25
  });

  it("副作用を持たず、入力を変更しない", () => {
    const controls = { distKind: "binomial" as const, n: 4 };
    deriveClt(controls);
    expect(controls).toEqual({ distKind: "binomial", n: 4 });
  });

  it("不正な n では SE が NaN になる", () => {
    expect(Number.isNaN(deriveClt({ distKind: "uniform", n: 0 }).standardError)).toBe(true);
  });
});

describe("sampleMean", () => {
  it("平均を返す / 空配列は 0", () => {
    expect(sampleMean([1, 2, 3, 4])).toBe(2.5);
    expect(sampleMean([])).toBe(0);
  });
});

describe("drawSample", () => {
  it("n 個の観測を返す", () => {
    expect(drawSample("uniform", 5, mulberry32(1))).toHaveLength(5);
    expect(drawSample("binomial", 0, mulberry32(1))).toHaveLength(0);
  });

  it("同じシードからは同じ標本（再現可能）", () => {
    expect(drawSample("exponential", 4, mulberry32(99))).toEqual(
      drawSample("exponential", 4, mulberry32(99)),
    );
  });
});

describe("drawSampleMeans", () => {
  it("count 個の標本平均を返す", () => {
    expect(drawSampleMeans("uniform", 10, 50, mulberry32(3))).toHaveLength(50);
  });

  it("n を大きくすると標本平均の散らばり（SD）が縮む（CLT の核心）", () => {
    const sd = (xs: number[]) => {
      const m = sampleMean(xs);
      return Math.sqrt(sampleMean(xs.map((x) => (x - m) ** 2)));
    };
    const small = drawSampleMeans("exponential", 1, 3000, mulberry32(11));
    const large = drawSampleMeans("exponential", 100, 3000, mulberry32(11));
    expect(sd(large)).toBeLessThan(sd(small));
  });

  it("標本平均の平均は母平均 μ に近い", () => {
    const means = drawSampleMeans("uniform", 20, 5000, mulberry32(7));
    expect(Math.abs(sampleMean(means) - 5)).toBeLessThan(0.1);
  });
});
