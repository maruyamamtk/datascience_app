import { describe, expect, it } from "vitest";
import {
  acf,
  acfConfidenceBound,
  autocorrelation,
  autocovariance,
  difference,
  generateSeries,
  mean,
  movingAverage,
} from "./time-series";
import { mulberry32 } from "./random";

describe("generateSeries", () => {
  it("合成 = トレンド + 季節 + ノイズ、長さ n", () => {
    const s = generateSeries({
      n: 50,
      slope: 0.5,
      amp: 2,
      period: 12,
      noiseSd: 0,
      base: 1,
      rng: mulberry32(1),
    });
    expect(s.value).toHaveLength(50);
    for (let t = 0; t < 50; t++) {
      expect(s.value[t]).toBeCloseTo(s.trend[t] + s.seasonal[t] + s.noise[t], 10);
    }
  });
  it("ノイズ0・季節0ならトレンドは直線（差が一定）", () => {
    const s = generateSeries({
      n: 10,
      slope: 2,
      amp: 0,
      period: 12,
      noiseSd: 0,
      rng: mulberry32(2),
    });
    const d = difference(s.value);
    for (const v of d) expect(v).toBeCloseTo(2, 8);
  });
});

describe("movingAverage", () => {
  it("定数列は不変、長さ保存", () => {
    const ma = movingAverage([5, 5, 5, 5, 5], 3);
    expect(ma).toHaveLength(5);
    for (const v of ma) expect(v).toBeCloseTo(5, 10);
  });
  it("平滑化で分散が下がる（ノイズが均される）", () => {
    const s = generateSeries({
      n: 200,
      slope: 0,
      amp: 0,
      period: 12,
      noiseSd: 1,
      rng: mulberry32(7),
    });
    const raw = autocovariance(s.value, 0);
    const smoothed = autocovariance(movingAverage(s.value, 7), 0);
    expect(smoothed).toBeLessThan(raw);
  });
});

describe("autocorrelation", () => {
  it("ρ(0)=1", () => {
    const s = generateSeries({
      n: 100,
      slope: 0.2,
      amp: 1,
      period: 10,
      noiseSd: 0.5,
      rng: mulberry32(3),
    });
    expect(autocorrelation(s.value, 0)).toBeCloseTo(1, 10);
  });
  it("季節周期 period でACFが正のピーク（周期性の検出）", () => {
    const s = generateSeries({
      n: 240,
      slope: 0,
      amp: 3,
      period: 12,
      noiseSd: 0.3,
      rng: mulberry32(5),
    });
    const rho12 = autocorrelation(s.value, 12);
    const rho6 = autocorrelation(s.value, 6);
    // 1周期ずれ(12)は正で強く、半周期ずれ(6)は負になる
    expect(rho12).toBeGreaterThan(0.5);
    expect(rho6).toBeLessThan(0);
  });
  it("ホワイトノイズはラグ≥1でほぼ0（信頼限界内が多数）", () => {
    const s = generateSeries({
      n: 500,
      slope: 0,
      amp: 0,
      period: 12,
      noiseSd: 1,
      rng: mulberry32(9),
    });
    const bound = acfConfidenceBound(500);
    const a = acf(s.value, 20).slice(1);
    const within = a.filter((r) => Math.abs(r) < bound).length;
    expect(within).toBeGreaterThanOrEqual(17); // 20本中大半は限界内
  });
});

describe("acf / difference", () => {
  it("acf は長さ maxLag+1、先頭1", () => {
    const a = acf([1, 2, 3, 4, 5, 4, 3, 2], 4);
    expect(a).toHaveLength(5);
    expect(a[0]).toBeCloseTo(1, 10);
  });
  it("difference は長さ n-1", () => {
    expect(difference([1, 3, 6, 10])).toEqual([2, 3, 4]);
  });
  it("mean 空は0", () => {
    expect(mean([])).toBe(0);
  });
});

describe("acfConfidenceBound", () => {
  it("±1.96/√n", () => {
    expect(acfConfidenceBound(100)).toBeCloseTo(0.196, 3);
  });
});
