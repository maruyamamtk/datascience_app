import { describe, expect, it } from "vitest";
import {
  densityCurve,
  integratedSquaredError,
  iqr,
  kde,
  kernel,
  sampleSd,
  silvermanBandwidth,
} from "./kde";

describe("kernel", () => {
  it("ガウスカーネルは K(0)=1/√(2π)", () => {
    expect(kernel("gaussian", 0)).toBeCloseTo(1 / Math.sqrt(2 * Math.PI), 12);
  });
  it("エパネチニコフは |u|>1 で0、K(0)=0.75", () => {
    expect(kernel("epanechnikov", 0)).toBeCloseTo(0.75, 12);
    expect(kernel("epanechnikov", 1.5)).toBe(0);
  });
  it("一様カーネルは [-1,1] で0.5", () => {
    expect(kernel("uniform", 0.5)).toBe(0.5);
    expect(kernel("uniform", 2)).toBe(0);
  });
  it("各カーネルは面積1（数値積分で確認）", () => {
    for (const k of ["gaussian", "epanechnikov", "uniform", "triangular"] as const) {
      let area = 0;
      const dx = 0.01;
      for (let u = -5; u <= 5; u += dx) area += kernel(k, u) * dx;
      expect(area).toBeCloseTo(1, 2);
    }
  });
});

describe("kde", () => {
  it("密度は非負、面積≈1", () => {
    const data = [0, 1, 2, 3, 4, 2, 2, 1, 3];
    let area = 0;
    const dx = 0.05;
    for (let x = -5; x <= 10; x += dx) {
      const y = kde(x, data, 0.6, "gaussian");
      expect(y).toBeGreaterThanOrEqual(0);
      area += y * dx;
    }
    expect(area).toBeCloseTo(1, 1);
  });
  it("単一点のKDEは重なりのない山（その点で最大）", () => {
    const atCenter = kde(5, [5], 1, "gaussian");
    const away = kde(8, [5], 1, "gaussian");
    expect(atCenter).toBeGreaterThan(away);
  });
});

describe("silvermanBandwidth", () => {
  it("標本数が増えると帯域幅は小さくなる（n^-1/5）", () => {
    const small = silvermanBandwidth([0, 1, 2, 3, 4]);
    const big = silvermanBandwidth(Array.from({ length: 200 }, (_, i) => i % 5));
    expect(big).toBeLessThan(small);
  });
  it("ばらつきが大きいほど帯域幅が大きい", () => {
    const narrow = silvermanBandwidth([0, 0.1, 0.2, 0.1, 0]);
    const wide = silvermanBandwidth([0, 5, 10, 5, 0]);
    expect(wide).toBeGreaterThan(narrow);
  });
});

describe("sampleSd / iqr", () => {
  it("標準偏差", () => {
    expect(sampleSd([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 2);
  });
  it("IQR", () => {
    expect(iqr([1, 2, 3, 4, 5, 6, 7, 8])).toBeGreaterThan(0);
  });
});

describe("densityCurve", () => {
  it("格子点数ぶんの点、範囲の端を含む", () => {
    const c = densityCurve([1, 2, 3], 0.5, "gaussian", { min: 0, max: 4, steps: 21 });
    expect(c).toHaveLength(21);
    expect(c[0].x).toBe(0);
    expect(c[20].x).toBe(4);
  });
});

describe("integratedSquaredError", () => {
  it("帯域幅が極端に小さい/大きいと ISE が増える（最適が中間）", () => {
    // 標準正規から等間隔サンプルを真の密度に当てる。
    const data = [-2, -1, -0.5, 0, 0.5, 1, 2, -1.5, 1.5, 0.2, -0.3, 0.8];
    const trueDensity = (x: number) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
    const range = { min: -5, max: 5, steps: 201 };
    const tiny = integratedSquaredError(data, 0.05, "gaussian", trueDensity, range);
    const good = integratedSquaredError(data, 0.5, "gaussian", trueDensity, range);
    const huge = integratedSquaredError(data, 5, "gaussian", trueDensity, range);
    expect(good).toBeLessThan(tiny);
    expect(good).toBeLessThan(huge);
  });
});
