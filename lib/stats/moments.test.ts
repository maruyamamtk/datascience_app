import { describe, expect, it } from "vitest";
import {
  chebyshevBound,
  coefficientOfVariation,
  correlation,
  deriveMoments,
  kurtosisExcess,
  partialCorrelation,
  quantile,
  skewness,
  std,
  variance,
} from "./moments";

describe("variance / std", () => {
  it("母分散は中心2次モーメント（1/n）", () => {
    // [2,4,6]: μ=4, dev²=4+0+4=8, /3
    expect(variance([2, 4, 6])).toBeCloseTo(8 / 3, 10);
    expect(std([2, 4, 6])).toBeCloseTo(Math.sqrt(8 / 3), 10);
  });
  it("標本分散は 1/(n−1)", () => {
    expect(variance([2, 4, 6], { sample: true })).toBeCloseTo(4, 10); // 8/2
  });
  it("n<2 の標本分散は NaN", () => {
    expect(variance([5], { sample: true })).toBeNaN();
  });
});

describe("skewness", () => {
  it("対称な分布は歪度0", () => {
    expect(skewness([1, 2, 3, 4, 5])).toBeCloseTo(0, 10);
  });
  it("右に裾が長いと正", () => {
    expect(skewness([1, 1, 1, 1, 10])).toBeGreaterThan(0);
  });
  it("左に裾が長いと負", () => {
    expect(skewness([1, 10, 10, 10, 10])).toBeLessThan(0);
  });
});

describe("kurtosisExcess", () => {
  it("一様な5点は負（正規より平たい）", () => {
    expect(kurtosisExcess([1, 2, 3, 4, 5])).toBeLessThan(0);
  });
  it("外れ値があると裾が重く正に振れる", () => {
    expect(kurtosisExcess([0, 0, 0, 0, 0, 0, 0, 0, 10, -10])).toBeGreaterThan(0);
  });
});

describe("coefficientOfVariation", () => {
  it("CV = σ/μ", () => {
    expect(coefficientOfVariation([2, 4, 6])).toBeCloseTo(Math.sqrt(8 / 3) / 4, 10);
  });
  it("μ=0 は NaN", () => {
    expect(coefficientOfVariation([-1, 0, 1])).toBeNaN();
  });
});

describe("quantile", () => {
  it("中央値（type-7 線形補間）", () => {
    expect(quantile([1, 2, 3, 4], 0.5)).toBeCloseTo(2.5, 10);
    expect(quantile([1, 2, 3, 4, 5], 0.5)).toBeCloseTo(3, 10);
  });
  it("両端は最小・最大", () => {
    expect(quantile([5, 1, 3], 0)).toBe(1);
    expect(quantile([5, 1, 3], 1)).toBe(5);
  });
  it("範囲外の q は NaN", () => {
    expect(quantile([1, 2, 3], 1.2)).toBeNaN();
  });
});

describe("chebyshevBound", () => {
  it("k=2 で 1/4、k=3 で 1/9", () => {
    expect(chebyshevBound(2)).toBeCloseTo(0.25, 12);
    expect(chebyshevBound(3)).toBeCloseTo(1 / 9, 12);
  });
  it("k≤1 は自明な上界 1", () => {
    expect(chebyshevBound(1)).toBe(1);
    expect(chebyshevBound(0.5)).toBe(1);
  });
});

describe("correlation", () => {
  it("完全な正の線形は r=1", () => {
    expect(correlation([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 10);
  });
  it("完全な負の線形は r=-1", () => {
    expect(correlation([1, 2, 3], [6, 4, 2])).toBeCloseTo(-1, 10);
  });
  it("分散0は NaN", () => {
    expect(correlation([1, 1, 1], [1, 2, 3])).toBeNaN();
  });
});

describe("partialCorrelation", () => {
  it("Z と無相関なら偏相関は単相関に一致", () => {
    expect(partialCorrelation(0.5, 0, 0)).toBeCloseTo(0.5, 10);
  });
  it("見かけの相関が Z 経由なら偏相関は小さくなる", () => {
    // rxy=0.8, rxz=ryz=0.8 -> (0.8-0.64)/(1-0.64)=0.16/0.36
    expect(partialCorrelation(0.8, 0.8, 0.8)).toBeCloseTo(0.16 / 0.36, 10);
  });
});

describe("deriveMoments", () => {
  it("controls.points から全特性値を返す", () => {
    const d = deriveMoments({ points: [2, 4, 6] });
    expect(d.mean).toBeCloseTo(4, 10);
    expect(d.variance).toBeCloseTo(8 / 3, 10);
    expect(d.skewness).toBeCloseTo(0, 10);
    expect(Number.isFinite(d.kurtosis)).toBe(true);
  });
});
