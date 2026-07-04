import { describe, expect, it } from "vitest";
import {
  chiSquareStatistic,
  colSums,
  cramersV,
  degreesOfFreedom,
  expectedTable,
  grandTotal,
  independencePValue,
  oddsRatio2x2,
  rowSums,
  standardizedResiduals,
} from "./contingency";

describe("周辺和", () => {
  const t = [
    [10, 20],
    [30, 40],
  ];
  it("行和・列和・総和", () => {
    expect(rowSums(t)).toEqual([30, 70]);
    expect(colSums(t)).toEqual([40, 60]);
    expect(grandTotal(t)).toBe(100);
  });
});

describe("expectedTable", () => {
  it("E_ij = 行和·列和/N、周辺和が保存される", () => {
    const t = [
      [10, 20],
      [30, 40],
    ];
    const e = expectedTable(t);
    expect(e[0][0]).toBeCloseTo((30 * 40) / 100, 10); // 12
    expect(e[1][1]).toBeCloseTo((70 * 60) / 100, 10); // 42
    // 期待度数の周辺和は観測と一致
    expect(rowSums(e)).toEqual(rowSums(t));
    expect(colSums(e)).toEqual(colSums(t));
  });
  it("完全に独立な表は χ²=0", () => {
    // 行が同じ比率 → 独立
    const t = [
      [10, 30],
      [20, 60],
    ];
    expect(chiSquareStatistic(t)).toBeCloseTo(0, 8);
  });
});

describe("chiSquareStatistic / 自由度", () => {
  it("既知の 2×2 例（教科書値）", () => {
    // [[20,30],[30,20]]: E は全て25、各寄与 (5²/25)=1 → χ²=4
    const t = [
      [20, 30],
      [30, 20],
    ];
    expect(chiSquareStatistic(t)).toBeCloseTo(4, 8);
    expect(degreesOfFreedom(t)).toBe(1);
  });
  it("3×2 表の自由度 (3-1)(2-1)=2", () => {
    const t = [
      [10, 5],
      [8, 12],
      [6, 9],
    ];
    expect(degreesOfFreedom(t)).toBe(2);
  });
});

describe("independencePValue", () => {
  it("χ²=4, df=1 の p≈0.0455", () => {
    const t = [
      [20, 30],
      [30, 20],
    ];
    expect(independencePValue(t)).toBeCloseTo(0.0455, 3);
  });
  it("独立な表は p≈1", () => {
    const t = [
      [10, 30],
      [20, 60],
    ];
    expect(independencePValue(t)).toBeGreaterThan(0.99);
  });
});

describe("standardizedResiduals", () => {
  it("(O−E)/√E、独立な表は全て0", () => {
    const t = [
      [10, 30],
      [20, 60],
    ];
    const r = standardizedResiduals(t);
    for (const row of r) for (const v of row) expect(v).toBeCloseTo(0, 8);
  });
  it("符号：観測が期待より多いセルは正", () => {
    const t = [
      [20, 30],
      [30, 20],
    ];
    const r = standardizedResiduals(t);
    expect(r[0][0]).toBeLessThan(0); // 20<25
    expect(r[0][1]).toBeGreaterThan(0); // 30>25
  });
});

describe("cramersV", () => {
  it("独立な表は V=0", () => {
    const t = [
      [10, 30],
      [20, 60],
    ];
    expect(cramersV(t)).toBeCloseTo(0, 8);
  });
  it("完全連関の 2×2 は V=1", () => {
    const t = [
      [50, 0],
      [0, 50],
    ];
    expect(cramersV(t)).toBeCloseTo(1, 8);
  });
  it("0〜1 に収まる", () => {
    const t = [
      [20, 30],
      [30, 20],
    ];
    const v = cramersV(t);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThanOrEqual(1);
  });
});

describe("oddsRatio2x2", () => {
  it("(a·d)/(b·c)", () => {
    const t = [
      [20, 10],
      [5, 25],
    ];
    expect(oddsRatio2x2(t)).toBeCloseTo((20 * 25) / (10 * 5), 10); // 10
  });
  it("独立（OR=1）", () => {
    const t = [
      [10, 10],
      [20, 20],
    ];
    expect(oddsRatio2x2(t)).toBeCloseTo(1, 10);
  });
});
