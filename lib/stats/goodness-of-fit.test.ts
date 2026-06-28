import { describe, expect, it } from "vitest";
import {
  chiSquareCdf,
  chiSquareGof,
  chiSquareGofPValue,
  expectedFromProbabilities,
  uniformExpected,
} from "./goodness-of-fit";

describe("chiSquareGof", () => {
  it("観測=期待なら χ²=0", () => {
    const { chi2 } = chiSquareGof([10, 10, 10], [10, 10, 10]);
    expect(chi2).toBe(0);
  });
  it("χ²=Σ(O−E)²/E、df=k−1", () => {
    // サイコロ60回、各期待10。観測 [16,8,10,12,6,8]
    const obs = [16, 8, 10, 12, 6, 8];
    const exp = uniformExpected(60, 6);
    const { chi2, df, cells } = chiSquareGof(obs, exp);
    const manual = obs.reduce((a, o) => a + (o - 10) ** 2 / 10, 0);
    expect(chi2).toBeCloseTo(manual, 12);
    expect(df).toBe(5);
    expect(cells[0].contribution).toBeCloseTo((16 - 10) ** 2 / 10, 12);
  });
  it("パラメータ推定で自由度が減る", () => {
    const { df } = chiSquareGof([5, 5, 5, 5], [5, 5, 5, 5], 1);
    expect(df).toBe(2); // 4-1-1
  });
});

describe("chiSquareCdf", () => {
  it("F(0)=0、単調増加で上限1", () => {
    expect(chiSquareCdf(0, 5)).toBe(0);
    expect(chiSquareCdf(100, 5)).toBeCloseTo(1, 3);
  });
  it("自由度1で χ²=3.841 が上側5%（F≈0.95）", () => {
    expect(chiSquareCdf(3.841, 1)).toBeCloseTo(0.95, 2);
  });
  it("自由度5で χ²=11.07 が上側5%（F≈0.95）", () => {
    expect(chiSquareCdf(11.07, 5)).toBeCloseTo(0.95, 2);
  });
});

describe("chiSquareGofPValue", () => {
  it("χ²=0 で p=1", () => {
    expect(chiSquareGofPValue(0, 5)).toBeCloseTo(1, 6);
  });
  it("自由度5で χ²=11.07 の p≈0.05", () => {
    expect(chiSquareGofPValue(11.07, 5)).toBeCloseTo(0.05, 2);
  });
  it("χ² が大きいほど p は小さい", () => {
    expect(chiSquareGofPValue(20, 5)).toBeLessThan(chiSquareGofPValue(5, 5));
  });
});

describe("期待度数の作成", () => {
  it("確率から: total×p", () => {
    expect(expectedFromProbabilities(100, [0.5, 0.3, 0.2])).toEqual([50, 30, 20]);
  });
  it("一様: total/k", () => {
    expect(uniformExpected(60, 6)).toEqual([10, 10, 10, 10, 10, 10]);
  });
});
