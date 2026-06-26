import { describe, expect, it } from "vitest";
import {
  CI_MEAN,
  confidenceInterval,
  containsMean,
  coverageRate,
  deriveInterval,
  simulateIntervals,
  standardError,
  zCritical,
} from "./interval";
import { mulberry32 } from "./random";

describe("standardError", () => {
  it("SE = σ/√n", () => {
    expect(standardError(10, 4)).toBe(5);
    expect(standardError(2, 100)).toBeCloseTo(0.2, 12);
  });
  it("n<=0 は NaN", () => {
    expect(standardError(1, 0)).toBeNaN();
  });
});

describe("zCritical（両側の臨界値）", () => {
  it("代表的な信頼係数の z", () => {
    expect(zCritical(0.95)).toBeCloseTo(1.95996, 4);
    expect(zCritical(0.99)).toBeCloseTo(2.57583, 4);
    expect(zCritical(0.9)).toBeCloseTo(1.64485, 4);
  });
  it("level∉(0,1) は NaN", () => {
    expect(zCritical(0)).toBeNaN();
    expect(zCritical(1)).toBeNaN();
  });
  it("信頼係数を上げると区間は広がる（z が増える）", () => {
    expect(zCritical(0.99)).toBeGreaterThan(zCritical(0.95));
  });
});

describe("confidenceInterval（x̄ ± z·σ/√n）", () => {
  it("中心 x̄・半幅 z·SE で対称", () => {
    const ci = confidenceInterval({ mean: 50, sigma: 10, n: 25, level: 0.95 });
    expect(ci.se).toBeCloseTo(2, 12); // 10/√25 = 2
    expect(ci.z).toBeCloseTo(1.95996, 4);
    const half = ci.z * ci.se;
    expect(ci.lower).toBeCloseTo(50 - half, 10);
    expect(ci.upper).toBeCloseTo(50 + half, 10);
    expect((ci.lower + ci.upper) / 2).toBeCloseTo(50, 10);
  });

  it("n を 4 倍にすると SE は半分（区間幅も半分）", () => {
    const a = confidenceInterval({ mean: 0, sigma: 1, n: 25, level: 0.95 });
    const b = confidenceInterval({ mean: 0, sigma: 1, n: 100, level: 0.95 });
    const widthA = a.upper - a.lower;
    const widthB = b.upper - b.lower;
    expect(widthB).toBeCloseTo(widthA / 2, 10);
  });
});

describe("deriveInterval（ストアの派生値）", () => {
  it("x̄=CI_MEAN を中心に z・SE・区間幅を返す", () => {
    const d = deriveInterval({ n: 25, level: 0.95, sigma: 10 });
    expect(d.se).toBeCloseTo(2, 12);
    expect(d.z).toBeCloseTo(1.95996, 4);
    expect(d.halfWidth).toBeCloseTo(d.z * d.se, 12);
    expect(d.lower).toBeCloseTo(CI_MEAN - d.halfWidth, 12);
    expect(d.upper).toBeCloseTo(CI_MEAN + d.halfWidth, 12);
  });
});

describe("containsMean / coverageRate", () => {
  it("端点を含む（閉区間）", () => {
    expect(containsMean({ lower: 1, upper: 3 }, 1)).toBe(true);
    expect(containsMean({ lower: 1, upper: 3 }, 3)).toBe(true);
    expect(containsMean({ lower: 1, upper: 3 }, 3.0001)).toBe(false);
  });
  it("被覆割合 = 含む本数 / 全本数", () => {
    const ivs = [
      { lower: 0, upper: 2 }, // 含む
      { lower: 3, upper: 4 }, // 外す
      { lower: -1, upper: 1 }, // 含む
      { lower: 5, upper: 6 }, // 外す
    ];
    expect(coverageRate(ivs, 1)).toBeCloseTo(0.5, 12);
  });
  it("空配列は NaN", () => {
    expect(coverageRate([], 0)).toBeNaN();
  });
});

describe("simulateIntervals（被覆シミュレーション）", () => {
  it("同じシードなら再現する（決定的）", () => {
    const a = simulateIntervals({
      mu: 0,
      sigma: 1,
      n: 10,
      level: 0.95,
      trials: 5,
      rng: mulberry32(7),
    });
    const b = simulateIntervals({
      mu: 0,
      sigma: 1,
      n: 10,
      level: 0.95,
      trials: 5,
      rng: mulberry32(7),
    });
    expect(a).toEqual(b);
    expect(a).toHaveLength(5);
  });

  it("trials を増やすと被覆率は名目の信頼係数 0.95 に近づく", () => {
    const ivs = simulateIntervals({
      mu: 0,
      sigma: 1,
      n: 30,
      level: 0.95,
      trials: 2000,
      rng: mulberry32(2024),
    });
    expect(coverageRate(ivs, 0)).toBeCloseTo(0.95, 1);
  });

  it("各区間の中心は標本平均 x̄（含む判定と整合）", () => {
    const ivs = simulateIntervals({
      mu: 0,
      sigma: 1,
      n: 10,
      level: 0.95,
      trials: 50,
      rng: mulberry32(1),
    });
    for (const iv of ivs) {
      expect((iv.lower + iv.upper) / 2).toBeCloseTo(iv.mean, 10);
      expect(iv.contains).toBe(iv.lower <= 0 && 0 <= iv.upper);
    }
  });
});
