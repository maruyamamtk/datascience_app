import { describe, expect, it } from "vitest";
import {
  brownianEnsemble,
  brownianMotion,
  ensembleMean,
  ensembleVariance,
  poissonProcess,
  randomWalk,
} from "./stochastic";
import { mulberry32 } from "./random";

describe("randomWalk", () => {
  it("S_0=0、長さ length+1、各ステップ ±step", () => {
    const p = randomWalk({ length: 10, step: 1, pUp: 0.5, rng: mulberry32(1) });
    expect(p[0]).toBe(0);
    expect(p).toHaveLength(11);
    for (let i = 1; i < p.length; i++) expect(Math.abs(p[i] - p[i - 1])).toBeCloseTo(1, 10);
  });
  it("pUp=1 なら単調増加（ドリフト上）", () => {
    const p = randomWalk({ length: 20, step: 1, pUp: 1, rng: mulberry32(2) });
    expect(p[p.length - 1]).toBe(20);
  });
});

describe("brownianMotion", () => {
  it("B_0=0、長さ steps+1", () => {
    const b = brownianMotion({ steps: 50, dt: 0.1, sigma: 1, mu: 0, rng: mulberry32(3) });
    expect(b[0]).toBe(0);
    expect(b).toHaveLength(51);
  });
  it("ドリフト0の終点の平均は多数本でほぼ0", () => {
    const ends = Array.from({ length: 400 }, (_, i) =>
      brownianMotion({ steps: 100, dt: 0.01, sigma: 1, mu: 0, rng: mulberry32(100 + i) }),
    ).map((p) => p[p.length - 1]);
    const m = ends.reduce((a, b) => a + b, 0) / ends.length;
    expect(Math.abs(m)).toBeLessThan(0.15);
  });
});

describe("ブラウン運動の分散は時間に比例する（Var[B_t]=σ²t）", () => {
  it("終端の分散 ≈ σ²·T", () => {
    const paths = brownianEnsemble({
      count: 800,
      steps: 100,
      dt: 0.01,
      sigma: 2,
      mu: 0,
      rng: mulberry32(7),
    });
    const varSeq = ensembleVariance(paths);
    const T = 100 * 0.01; // =1
    const expected = 2 * 2 * T; // σ²T = 4
    expect(varSeq[varSeq.length - 1]).toBeGreaterThan(expected * 0.7);
    expect(varSeq[varSeq.length - 1]).toBeLessThan(expected * 1.3);
  });
  it("分散は時刻とともにほぼ線形に増える（中間≈半分）", () => {
    const paths = brownianEnsemble({
      count: 800,
      steps: 100,
      dt: 0.01,
      sigma: 1,
      mu: 0,
      rng: mulberry32(11),
    });
    const v = ensembleVariance(paths);
    const mid = v[50];
    const end = v[100];
    expect(mid / end).toBeGreaterThan(0.35);
    expect(mid / end).toBeLessThan(0.65);
  });
});

describe("ensembleMean", () => {
  it("ドリフト μ の平均は μ·t に近い", () => {
    const paths = brownianEnsemble({
      count: 600,
      steps: 100,
      dt: 0.01,
      sigma: 1,
      mu: 3,
      rng: mulberry32(13),
    });
    const mseq = ensembleMean(paths);
    // 終端 t=1 で平均 ≈ μ·t = 3
    expect(mseq[mseq.length - 1]).toBeGreaterThan(2.4);
    expect(mseq[mseq.length - 1]).toBeLessThan(3.6);
  });
});

describe("poissonProcess", () => {
  it("N(t) は単調非減少、N(0)=0", () => {
    const n = poissonProcess({ steps: 50, dt: 0.1, rate: 2, rng: mulberry32(5) });
    expect(n[0]).toBe(0);
    for (let i = 1; i < n.length; i++) expect(n[i]).toBeGreaterThanOrEqual(n[i - 1]);
  });
  it("平均の到着数 ≈ rate·T", () => {
    const ends = Array.from({ length: 400 }, (_, i) =>
      poissonProcess({ steps: 100, dt: 0.1, rate: 3, rng: mulberry32(200 + i) }),
    ).map((n) => n[n.length - 1]);
    const m = ends.reduce((a, b) => a + b, 0) / ends.length;
    // T = 10, rate=3 → 期待30
    expect(m).toBeGreaterThan(26);
    expect(m).toBeLessThan(34);
  });
});
