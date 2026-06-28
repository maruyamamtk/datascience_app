import { describe, expect, it } from "vitest";
import { mulberry32 } from "./random";
import {
  meanDiff,
  permutationNull,
  permutationPValue,
  ranks,
  spearman,
  wilcoxonRankSum,
} from "./nonparametric";

describe("ranks", () => {
  it("昇順1始まり、タイは平均順位", () => {
    expect(ranks([3, 1, 2])).toEqual([3, 1, 2]);
    expect(ranks([10, 10, 20])).toEqual([1.5, 1.5, 3]); // タイ平均
    expect(ranks([5, 5, 5])).toEqual([2, 2, 2]); // 全タイ→(1+2+3)/3=2
  });
});

describe("wilcoxonRankSum", () => {
  it("群aの順位和", () => {
    // a=[1,2], b=[3,4] → 合併順位 [1,2,3,4]、a の順位和=1+2=3
    const { W, nA, nB } = wilcoxonRankSum([1, 2], [3, 4]);
    expect(W).toBe(3);
    expect(nA).toBe(2);
    expect(nB).toBe(2);
  });
});

describe("permutationNull / PValue", () => {
  it("帰無分布の長さ=shuffles、平均はほぼ0", () => {
    const a = [5, 6, 7, 8];
    const b = [4, 5, 6, 7];
    const nd = permutationNull(a, b, 2000, mulberry32(1));
    expect(nd).toHaveLength(2000);
    expect(Math.abs(nd.reduce((x, y) => x + y, 0) / nd.length)).toBeLessThan(0.2);
  });
  it("はっきり差がある2群は p が小さい", () => {
    const a = [10, 11, 12, 13, 14];
    const b = [1, 2, 3, 4, 5];
    const obs = meanDiff(a, b);
    const nd = permutationNull(a, b, 3000, mulberry32(7));
    expect(permutationPValue(obs, nd)).toBeLessThan(0.02);
  });
  it("差がない2群は p が大きい", () => {
    const a = [4, 5, 6, 5, 4];
    const b = [5, 4, 5, 6, 5];
    const obs = meanDiff(a, b);
    const nd = permutationNull(a, b, 3000, mulberry32(3));
    expect(permutationPValue(obs, nd)).toBeGreaterThan(0.2);
  });
  it("観測差0なら p=1（すべての |差|≥0）", () => {
    expect(permutationPValue(0, [0.5, -0.3, 0.1])).toBe(1);
  });
});

describe("spearman", () => {
  it("完全な単調増加（非線形でも）は ρ=1", () => {
    // y=x³ は単調増加 → 順位は一致 → ρ=1
    expect(spearman([1, 2, 3, 4], [1, 8, 27, 64])).toBeCloseTo(1, 12);
  });
  it("完全な単調減少は ρ=-1", () => {
    expect(spearman([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1, 12);
  });
  it("分散0は NaN", () => {
    expect(spearman([1, 1, 1], [1, 2, 3])).toBeNaN();
  });
});
