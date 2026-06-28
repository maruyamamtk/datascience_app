import { describe, expect, it } from "vitest";
import { fUpperTail, oneWayAnova } from "./anova";

describe("oneWayAnova", () => {
  it("全変動 = 級間 + 級内（分解が成り立つ）", () => {
    const r = oneWayAnova([
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ]);
    expect(r.ssTotal).toBeCloseTo(r.ssBetween + r.ssWithin, 10);
  });

  it("群がはっきり分かれていると F が大きい", () => {
    const r = oneWayAnova([
      [1, 1.2, 0.8, 1.1],
      [5, 5.1, 4.9, 5.2],
      [9, 9.1, 8.8, 9.2],
    ]);
    expect(r.F).toBeGreaterThan(50);
    expect(r.p).toBeLessThan(0.001);
  });

  it("群がほぼ同じだと F が小さく p が大きい", () => {
    const r = oneWayAnova([
      [5, 6, 4, 5],
      [5, 4, 6, 5],
      [6, 5, 4, 5],
    ]);
    expect(r.F).toBeLessThan(3);
    expect(r.p).toBeGreaterThan(0.1);
  });

  it("自由度: k群・各n → df_between=k−1, df_within=N−k", () => {
    const r = oneWayAnova([
      [1, 2, 3],
      [4, 5, 6],
    ]);
    expect(r.dfBetween).toBe(1);
    expect(r.dfWithin).toBe(4);
  });

  it("既知の手計算例（3群×各2）", () => {
    // groups: [2,4],[6,8],[10,12] grand=7
    // 群平均 3,7,11。SS_between=2*((3-7)²+(7-7)²+(11-7)²)=2*(16+0+16)=64
    // SS_within=各群(±1)²×2=2*(1+1)*3... [2,4]→平均3, dev -1,1 →2。3群で6
    const r = oneWayAnova([
      [2, 4],
      [6, 8],
      [10, 12],
    ]);
    expect(r.ssBetween).toBeCloseTo(64, 10);
    expect(r.ssWithin).toBeCloseTo(6, 10);
    expect(r.dfBetween).toBe(2);
    expect(r.dfWithin).toBe(3);
    // MS_between=32, MS_within=2 → F=16
    expect(r.F).toBeCloseTo(16, 10);
  });
});

describe("fUpperTail", () => {
  it("既知の臨界値: F(2,3) の上側5%は約9.55", () => {
    // P(F≥9.55)≈0.05
    expect(fUpperTail(9.55, 2, 3)).toBeCloseTo(0.05, 2);
  });
  it("F=0 で上側確率1、巨大Fでほぼ0", () => {
    expect(fUpperTail(0, 3, 10)).toBe(1);
    expect(fUpperTail(1000, 3, 10)).toBeLessThan(0.01);
  });
  it("上側確率は単調減少", () => {
    expect(fUpperTail(1, 3, 12)).toBeGreaterThan(fUpperTail(3, 3, 12));
  });
});
