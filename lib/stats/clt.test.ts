import { describe, expect, it } from "vitest";
import { deriveClt, standardError } from "./clt";

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
  it("操作値から派生値(SE)を計算する", () => {
    expect(deriveClt({ sigma: 8, n: 16 })).toEqual({ standardError: 2 });
  });

  it("副作用を持たず、入力を変更しない", () => {
    const controls = { sigma: 10, n: 4 };
    deriveClt(controls);
    expect(controls).toEqual({ sigma: 10, n: 4 });
  });

  it("不正な n では SE が NaN になる", () => {
    expect(Number.isNaN(deriveClt({ sigma: 10, n: 0 }).standardError)).toBe(true);
  });
});
