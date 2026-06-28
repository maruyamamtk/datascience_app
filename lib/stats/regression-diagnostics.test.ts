import { describe, expect, it } from "vitest";
import {
  durbinWatson,
  fitSimple,
  leverage,
  qqPoints,
  standardizedResiduals,
} from "./regression-diagnostics";

describe("fitSimple", () => {
  it("既知の OLS（slope=0.8, intercept=1.8）", () => {
    const f = fitSimple([1, 2, 3, 4, 5], [2, 4, 5, 4, 6]);
    expect(f.slope).toBeCloseTo(0.8, 10);
    expect(f.intercept).toBeCloseTo(1.8, 10);
    // 残差の和は0。
    expect(f.residuals.reduce((a, b) => a + b, 0)).toBeCloseTo(0, 10);
  });
});

describe("leverage", () => {
  it("Σhᵢ=2（単回帰）、平均から遠い点ほど大", () => {
    const lev = leverage([1, 2, 3, 4, 10]);
    expect(lev.reduce((a, b) => a + b, 0)).toBeCloseTo(2, 8);
    // x=10 が最大てこ比。
    expect(Math.max(...lev)).toBe(lev[4]);
  });
  it("等間隔データでは端の点のてこ比が最大", () => {
    const lev = leverage([1, 2, 3, 4, 5]);
    expect(lev[0]).toBeCloseTo(lev[4], 10);
    expect(lev[0]).toBeGreaterThan(lev[2]);
  });
});

describe("standardizedResiduals", () => {
  it("外れ値は |標準化残差| が大きい", () => {
    const x = [1, 2, 3, 4, 5, 6];
    const y = [1, 2, 3, 4, 5, 20]; // 最後が外れ値
    const f = fitSimple(x, y);
    const lev = leverage(x);
    const sr = standardizedResiduals(f.residuals, lev);
    expect(Math.abs(sr[5])).toBeGreaterThan(1.5);
  });
});

describe("durbinWatson", () => {
  it("無相関に近い残差で DW≈2", () => {
    // 符号が交互の残差は負の相関寄り（DW>2）。ランダム風で2付近を確認。
    const dw = durbinWatson([1, -1, 1, -1, 1, -1, 1, -1]);
    expect(dw).toBeGreaterThan(2); // 交互は負の系列相関→DW大
  });
  it("同符号が続く（正の系列相関）と DW は小さい", () => {
    const dw = durbinWatson([1, 1.1, 1.2, 1.1, 1.0, 1.1, 1.2, 1.3]);
    expect(dw).toBeLessThan(1);
  });
  it("理想的な無相関乱数列で DW≈2 付近", () => {
    const e = [0.5, -1.2, 0.8, -0.3, 1.1, -0.9, 0.2, -0.6, 1.0, -0.4];
    const dw = durbinWatson(e);
    expect(dw).toBeGreaterThan(1.5);
    expect(dw).toBeLessThan(3.5);
  });
});

describe("qqPoints", () => {
  it("点の数=残差数、理論分位点は昇順", () => {
    const pts = qqPoints([2, -1, 0, 1, -2, 0.5]);
    expect(pts).toHaveLength(6);
    for (let i = 1; i < pts.length; i++) {
      expect(pts[i].theoretical).toBeGreaterThanOrEqual(pts[i - 1].theoretical);
      expect(pts[i].sample).toBeGreaterThanOrEqual(pts[i - 1].sample);
    }
  });
});
