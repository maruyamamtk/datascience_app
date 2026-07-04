import { describe, expect, it } from "vitest";
import {
  ar1Variance,
  fitAR1,
  forecastAR1,
  simulateAR1,
  simulateMA1,
  simulateRandomWalk,
  theoreticalAcfAR1,
} from "./arima";
import { autocorrelation, autocovariance } from "./time-series";
import { mulberry32 } from "./random";

describe("simulateAR1", () => {
  it("長さ n、x_0=0", () => {
    const x = simulateAR1({ phi: 0.5, sigma: 1, n: 50, rng: mulberry32(1) });
    expect(x).toHaveLength(50);
    expect(x[0]).toBe(0);
  });
  it("φ が正なら標本ラグ1自己相関 ≈ φ", () => {
    const x = simulateAR1({ phi: 0.7, sigma: 1, n: 4000, rng: mulberry32(2) });
    expect(autocorrelation(x, 1)).toBeGreaterThan(0.6);
    expect(autocorrelation(x, 1)).toBeLessThan(0.8);
  });
  it("理論分散 σ²/(1−φ²) に近い", () => {
    const phi = 0.6;
    const x = simulateAR1({ phi, sigma: 1, n: 8000, rng: mulberry32(3) });
    const v = autocovariance(x, 0);
    const expected = ar1Variance(phi, 1); // 1/0.64 ≈ 1.5625
    expect(v).toBeGreaterThan(expected * 0.8);
    expect(v).toBeLessThan(expected * 1.2);
  });
});

describe("simulateMA1", () => {
  it("MA(1) はラグ1が非0、ラグ2以降ほぼ0（記憶が有限）", () => {
    const x = simulateMA1({ theta: 0.8, sigma: 1, n: 6000, rng: mulberry32(5) });
    expect(Math.abs(autocorrelation(x, 1))).toBeGreaterThan(0.3);
    expect(Math.abs(autocorrelation(x, 3))).toBeLessThan(0.06);
  });
  it("MA(1) の理論ラグ1自己相関 θ/(1+θ²) に近い", () => {
    const theta = 0.5;
    const x = simulateMA1({ theta, sigma: 1, n: 8000, rng: mulberry32(7) });
    const expected = theta / (1 + theta * theta); // 0.4
    expect(autocorrelation(x, 1)).toBeGreaterThan(expected - 0.08);
    expect(autocorrelation(x, 1)).toBeLessThan(expected + 0.08);
  });
});

describe("simulateRandomWalk", () => {
  it("階差はホワイトノイズ（ラグ1自己相関ほぼ0）", () => {
    const x = simulateRandomWalk({ sigma: 1, n: 4000, rng: mulberry32(9) });
    const d = x.slice(1).map((v, i) => v - x[i]);
    expect(Math.abs(autocorrelation(d, 1))).toBeLessThan(0.06);
  });
  it("分散が t に比例して増える（非定常, Var[x_t]=σ²t）", () => {
    // 多数の独立なランダムウォークで、遅い時刻ほど «散らばり» が大きい（アンサンブル分散）。
    const walks = Array.from({ length: 500 }, (_, i) =>
      simulateRandomWalk({ sigma: 1, n: 401, rng: mulberry32(1000 + i) }),
    );
    const varAt = (t: number) => {
      const vals = walks.map((w) => w[t]);
      const m = vals.reduce((a, b) => a + b, 0) / vals.length;
      return vals.reduce((a, v) => a + (v - m) ** 2, 0) / vals.length;
    };
    const early = varAt(100); // ≈100
    const late = varAt(400); // ≈400
    expect(late).toBeGreaterThan(early * 2);
  });
});

describe("theoreticalAcfAR1", () => {
  it("ρ(k)=φ^k、ρ(0)=1", () => {
    const a = theoreticalAcfAR1(0.5, 4);
    expect(a[0]).toBe(1);
    expect(a[1]).toBeCloseTo(0.5, 10);
    expect(a[2]).toBeCloseTo(0.25, 10);
  });
  it("φ<0 は符号が交互", () => {
    const a = theoreticalAcfAR1(-0.6, 3);
    expect(a[1]).toBeLessThan(0);
    expect(a[2]).toBeGreaterThan(0);
  });
});

describe("fitAR1 / forecastAR1", () => {
  it("fitAR1 は生成した φ を回復する", () => {
    const x = simulateAR1({ phi: 0.65, sigma: 1, n: 5000, rng: mulberry32(13) });
    expect(fitAR1(x)).toBeGreaterThan(0.55);
    expect(fitAR1(x)).toBeLessThan(0.75);
  });
  it("forecastAR1 は φ^h で平均(0)へ減衰", () => {
    const f = forecastAR1(10, 0.5, 3);
    expect(f).toEqual([5, 2.5, 1.25]);
  });
});
