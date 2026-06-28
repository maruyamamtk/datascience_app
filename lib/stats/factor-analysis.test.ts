import { describe, expect, it } from "vitest";
import {
  communality,
  fitOneFactor,
  impliedCorrelation,
  meanCommunality,
  residualSumOfSquares,
  uniqueness,
} from "./factor-analysis";

describe("impliedCorrelation", () => {
  it("非対角は λ_i λ_j、対角は1", () => {
    const m = impliedCorrelation([0.8, 0.6, 0.5]);
    expect(m[0][0]).toBe(1);
    expect(m[0][1]).toBeCloseTo(0.48, 10); // 0.8*0.6
    expect(m[1][2]).toBeCloseTo(0.3, 10); // 0.6*0.5
    expect(m[0][1]).toBeCloseTo(m[1][0], 12); // 対称
  });
});

describe("communality / uniqueness", () => {
  it("共通性+独自性=1（標準化）", () => {
    expect(communality(0.7) + uniqueness(0.7)).toBeCloseTo(1, 12);
  });
  it("負荷が大きいほど共通性が大", () => {
    expect(communality(0.9)).toBeGreaterThan(communality(0.5));
  });
});

describe("residualSumOfSquares", () => {
  it("真の負荷で生成した相関には残差0", () => {
    const trueL = [0.8, 0.7, 0.6, 0.5];
    const observed = impliedCorrelation(trueL);
    expect(residualSumOfSquares(observed, trueL)).toBeCloseTo(0, 10);
  });
  it("負荷がずれると残差が増える", () => {
    const trueL = [0.8, 0.7, 0.6, 0.5];
    const observed = impliedCorrelation(trueL);
    const off = trueL.map((l) => l * 0.5);
    expect(residualSumOfSquares(observed, off)).toBeGreaterThan(0.01);
  });
});

describe("meanCommunality", () => {
  it("平均共通性は各λ²の平均", () => {
    expect(meanCommunality([0.6, 0.8])).toBeCloseTo((0.36 + 0.64) / 2, 10);
  });
});

describe("fitOneFactor", () => {
  it("1因子構造の相関から真の負荷を概ね復元", () => {
    const trueL = [0.85, 0.75, 0.65, 0.55];
    const observed = impliedCorrelation(trueL);
    const fit = fitOneFactor(observed);
    // 順序・大小関係を復元（符号は正に揃える）。
    expect(fit[0]).toBeGreaterThan(fit[3]);
    // 残差が小さい。
    expect(residualSumOfSquares(observed, fit)).toBeLessThan(0.05);
  });
});
