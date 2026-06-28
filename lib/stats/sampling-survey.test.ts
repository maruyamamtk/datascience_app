import { describe, expect, it } from "vitest";
import {
  neymanAllocation,
  populationMean,
  populationVariance,
  proportionalAllocation,
  srsVariance,
  stratifiedVariance,
  withinStrataVariance,
  type Stratum,
} from "./sampling-survey";

const STRATA: Stratum[] = [
  { name: "A", size: 600, mean: 10, sd: 2 },
  { name: "B", size: 300, mean: 20, sd: 3 },
  { name: "C", size: 100, mean: 50, sd: 5 },
];

describe("populationMean", () => {
  it("層の重み付き平均", () => {
    // (600*10+300*20+100*50)/1000 = (6000+6000+5000)/1000 = 17
    expect(populationMean(STRATA)).toBeCloseTo(17, 10);
  });
});

describe("populationVariance = 層内 + 層間", () => {
  it("分散分解が成り立つ", () => {
    const total = populationVariance(STRATA);
    const within = withinStrataVariance(STRATA);
    expect(total).toBeGreaterThan(within); // 層間ぶん大きい
    // 層間分散 = Σ W(μ_h−μ)²
    const N = 1000;
    const mu = 17;
    const between =
      (600 / N) * (10 - mu) ** 2 + (300 / N) * (20 - mu) ** 2 + (100 / N) * (50 - mu) ** 2;
    expect(total).toBeCloseTo(within + between, 8);
  });
});

describe("allocation", () => {
  it("比例配分は層サイズに比例、合計 n", () => {
    const a = proportionalAllocation(STRATA, 100);
    expect(a).toEqual([60, 30, 10]);
    expect(a.reduce((x, y) => x + y, 0)).toBeCloseTo(100, 10);
  });
  it("ネイマン配分は N_h σ_h に比例、合計 n", () => {
    const a = neymanAllocation(STRATA, 100);
    // 重み: 600*2=1200, 300*3=900, 100*5=500 → 計2600
    expect(a[0]).toBeCloseTo((100 * 1200) / 2600, 8);
    expect(a[2]).toBeCloseTo((100 * 500) / 2600, 8);
    expect(a.reduce((x, y) => x + y, 0)).toBeCloseTo(100, 8);
  });
});

describe("層化は単純無作為抽出より分散が小さい（層間変動を除けるため）", () => {
  it("比例配分の層化分散 < SRS分散", () => {
    const n = 100;
    const vSrs = srsVariance(STRATA, n);
    const vStr = stratifiedVariance(STRATA, proportionalAllocation(STRATA, n));
    expect(vStr).toBeLessThan(vSrs);
  });
  it("ネイマン配分は比例配分よりさらに分散が小さい（または同等）", () => {
    const n = 100;
    const vProp = stratifiedVariance(STRATA, proportionalAllocation(STRATA, n));
    const vNey = stratifiedVariance(STRATA, neymanAllocation(STRATA, n));
    expect(vNey).toBeLessThanOrEqual(vProp + 1e-9);
  });
});

describe("有限母集団修正", () => {
  it("全数調査(n=N)で SRS 分散は0", () => {
    expect(srsVariance(STRATA, 1000)).toBeCloseTo(0, 10);
  });
  it("n が増えると分散は減る", () => {
    expect(srsVariance(STRATA, 200)).toBeLessThan(srsVariance(STRATA, 50));
  });
});
