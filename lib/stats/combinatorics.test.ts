import { describe, expect, it } from "vitest";
import { combinations, factorial, permutations, unionThree, unionTwo } from "./combinatorics";

describe("factorial", () => {
  it("0! = 1, 1! = 1", () => {
    expect(factorial(0)).toBe(1);
    expect(factorial(1)).toBe(1);
  });
  it("5! = 120, 10! = 3628800", () => {
    expect(factorial(5)).toBe(120);
    expect(factorial(10)).toBe(3628800);
  });
  it("負・非整数はNaN", () => {
    expect(factorial(-1)).toBeNaN();
    expect(factorial(2.5)).toBeNaN();
  });
});

describe("permutations nPr", () => {
  it("nP0 = 1, nPn = n!", () => {
    expect(permutations(5, 0)).toBe(1);
    expect(permutations(5, 5)).toBe(120);
  });
  it("5P2 = 20, 10P3 = 720", () => {
    expect(permutations(5, 2)).toBe(20);
    expect(permutations(10, 3)).toBe(720);
  });
  it("r>n なら0", () => {
    expect(permutations(3, 5)).toBe(0);
  });
});

describe("combinations nCr", () => {
  it("nC0 = 1, nCn = 1, 対称性 nCr=nC(n-r)", () => {
    expect(combinations(5, 0)).toBe(1);
    expect(combinations(5, 5)).toBe(1);
    expect(combinations(7, 2)).toBe(combinations(7, 5));
  });
  it("5C2 = 10, 10C3 = 120, 52C5 = 2598960", () => {
    expect(combinations(5, 2)).toBe(10);
    expect(combinations(10, 3)).toBe(120);
    expect(combinations(52, 5)).toBe(2598960);
  });
  it("r>n なら0", () => {
    expect(combinations(3, 5)).toBe(0);
  });
  it("整数値を返す（割り算の丸め誤差を持ち込まない）", () => {
    expect(Number.isInteger(combinations(20, 10))).toBe(true);
    expect(combinations(20, 10)).toBe(184756);
  });
});

describe("包除原理", () => {
  it("2集合: |A∪B| = |A|+|B|−|A∩B|", () => {
    // 1〜100で2の倍数(50)・3の倍数(33)・6の倍数(16)
    expect(unionTwo(50, 33, 16)).toBe(67);
  });
  it("確率版でも同じ式", () => {
    expect(unionTwo(0.5, 0.4, 0.2)).toBeCloseTo(0.7, 12);
  });
  it("3集合: 足しすぎ引きすぎを補正", () => {
    // 1〜100で2,3,5の倍数: |2|=50,|3|=33,|5|=20,|6|=16,|10|=10,|15|=6,|30|=3
    expect(unionThree(50, 33, 20, 16, 10, 6, 3)).toBe(74);
  });
});
