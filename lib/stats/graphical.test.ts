import { describe, expect, it } from "vitest";
import {
  acDependence,
  column,
  correlation,
  dSeparated,
  generateTriples,
  partialCorrelation,
} from "./graphical";
import { mulberry32 } from "./random";

describe("dSeparated（d分離のルール）", () => {
  it("連鎖・分岐は B を条件づけると d分離、しないと従属", () => {
    expect(dSeparated("chain", true)).toBe(true);
    expect(dSeparated("chain", false)).toBe(false);
    expect(dSeparated("fork", true)).toBe(true);
    expect(dSeparated("fork", false)).toBe(false);
  });
  it("合流は B を条件づけると開いて従属、しないと d分離", () => {
    expect(dSeparated("collider", true)).toBe(false);
    expect(dSeparated("collider", false)).toBe(true);
  });
});

describe("連鎖 A→B→C", () => {
  it("周辺は相関、B で条件づけると偏相関がほぼ0（遮断）", () => {
    const t = generateTriples({ structure: "chain", n: 6000, w: 0.9, rng: mulberry32(41) });
    const { marginal, partialGivenB } = acDependence(t);
    expect(Math.abs(marginal)).toBeGreaterThan(0.4);
    expect(Math.abs(partialGivenB)).toBeLessThan(0.08);
  });
});

describe("分岐 A←B→C（共通原因）", () => {
  it("周辺は相関、B で条件づけると偏相関がほぼ0（交絡の除去）", () => {
    const t = generateTriples({ structure: "fork", n: 6000, w: 0.9, rng: mulberry32(42) });
    const { marginal, partialGivenB } = acDependence(t);
    expect(Math.abs(marginal)).toBeGreaterThan(0.4);
    expect(Math.abs(partialGivenB)).toBeLessThan(0.08);
  });
});

describe("合流 A→B←C", () => {
  it("周辺は独立（相関≈0）だが B で条件づけると偏相関が開く", () => {
    const t = generateTriples({ structure: "collider", n: 6000, w: 0.9, rng: mulberry32(43) });
    const { marginal, partialGivenB } = acDependence(t);
    expect(Math.abs(marginal)).toBeLessThan(0.08);
    expect(Math.abs(partialGivenB)).toBeGreaterThan(0.3);
  });
});

describe("correlation / partialCorrelation の基本", () => {
  it("完全一次従属は相関±1", () => {
    const xs = [1, 2, 3, 4, 5];
    expect(correlation(xs, [2, 4, 6, 8, 10])).toBeCloseTo(1, 10);
    expect(correlation(xs, [10, 8, 6, 4, 2])).toBeCloseTo(-1, 10);
  });
  it("偏相関は3変数の相関から計算できる", () => {
    const t = generateTriples({ structure: "chain", n: 3000, w: 0.8, rng: mulberry32(44) });
    const a = column(t, "a");
    const b = column(t, "b");
    const c = column(t, "c");
    // 直接式と acDependence が一致
    expect(partialCorrelation(a, c, b)).toBeCloseTo(acDependence(t).partialGivenB, 10);
  });
});
