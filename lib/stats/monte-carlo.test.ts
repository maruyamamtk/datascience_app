import { describe, expect, it } from "vitest";
import {
  bootstrapStandardError,
  bootstrapStatistics,
  estimatePi,
  mean,
  monteCarloIntegrate,
  percentileInterval,
  quantileSorted,
  resample,
  runningPiEstimate,
  throwDarts,
} from "./monte-carlo";
import { mulberry32 } from "./random";

describe("throwDarts / estimatePi", () => {
  it("点は [-1,1]² 内、inside は円判定と一致", () => {
    const darts = throwDarts(200, mulberry32(1));
    expect(darts).toHaveLength(200);
    for (const d of darts) {
      expect(d.x).toBeGreaterThanOrEqual(-1);
      expect(d.x).toBeLessThanOrEqual(1);
      expect(d.inside).toBe(d.x * d.x + d.y * d.y <= 1);
    }
  });
  it("多数の点で π に近づく（4·k/n ≈ π）", () => {
    const darts = throwDarts(20000, mulberry32(42));
    expect(estimatePi(darts)).toBeGreaterThan(3.0);
    expect(estimatePi(darts)).toBeLessThan(3.3);
  });
  it("空なら0", () => {
    expect(estimatePi([])).toBe(0);
  });
});

describe("runningPiEstimate", () => {
  it("長さは点数と一致、末尾は estimatePi と一致", () => {
    const darts = throwDarts(500, mulberry32(7));
    const seq = runningPiEstimate(darts);
    expect(seq).toHaveLength(500);
    expect(seq[seq.length - 1]).toBeCloseTo(estimatePi(darts), 10);
  });
});

describe("monteCarloIntegrate", () => {
  it("∫_0^1 x dx = 1/2 に近い", () => {
    const v = monteCarloIntegrate((x) => x, 0, 1, 40000, mulberry32(3));
    expect(v).toBeGreaterThan(0.48);
    expect(v).toBeLessThan(0.52);
  });
  it("∫_0^2 x² dx = 8/3 に近い", () => {
    const v = monteCarloIntegrate((x) => x * x, 0, 2, 60000, mulberry32(9));
    expect(v).toBeGreaterThan(2.5);
    expect(v).toBeLessThan(2.83);
  });
});

describe("resample", () => {
  it("元と同じ大きさ、各要素は元の集合に属する", () => {
    const sample = [1, 2, 3, 4, 5];
    const r = resample(sample, mulberry32(2));
    expect(r).toHaveLength(5);
    for (const v of r) expect(sample).toContain(v);
  });
});

describe("bootstrap", () => {
  const sample = [2, 4, 4, 4, 5, 5, 7, 9]; // 平均5
  it("ブートストラップ平均の平均 ≈ 標本平均", () => {
    const stats = bootstrapStatistics(sample, mean, 2000, mulberry32(11));
    expect(stats).toHaveLength(2000);
    expect(mean(stats)).toBeCloseTo(mean(sample), 1);
  });
  it("標準誤差 ≈ s/√n（平均の標準誤差の理論値近く）", () => {
    const stats = bootstrapStatistics(sample, mean, 3000, mulberry32(13));
    const se = bootstrapStandardError(stats);
    // s=2, n=8 → s/√n ≈ 0.707
    expect(se).toBeGreaterThan(0.5);
    expect(se).toBeLessThan(0.9);
  });
  it("パーセンタイル95%区間は標本平均を含み、下限<上限", () => {
    const stats = bootstrapStatistics(sample, mean, 3000, mulberry32(17));
    const [lo, hi] = percentileInterval(stats, 0.05);
    expect(lo).toBeLessThan(hi);
    expect(lo).toBeLessThanOrEqual(mean(sample));
    expect(hi).toBeGreaterThanOrEqual(mean(sample));
  });
});

describe("quantileSorted", () => {
  it("中央値・端点", () => {
    const s = [1, 2, 3, 4, 5];
    expect(quantileSorted(s, 0)).toBe(1);
    expect(quantileSorted(s, 1)).toBe(5);
    expect(quantileSorted(s, 0.5)).toBe(3);
  });
  it("線形補間", () => {
    expect(quantileSorted([0, 10], 0.25)).toBeCloseTo(2.5, 10);
  });
});
