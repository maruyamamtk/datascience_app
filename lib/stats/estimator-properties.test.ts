import { describe, expect, it } from "vitest";
import { mulberry32 } from "./random";
import {
  bias,
  biasVarianceDecomposition,
  estimatorVariance,
  meanSquaredError,
  relativeEfficiency,
  sampleVarianceBiased,
  sampleVarianceUnbiased,
  simulateVarianceEstimators,
} from "./estimator-properties";

describe("標本分散（偏り/不偏）", () => {
  it("1/n と 1/(n-1) の関係: s²_unbiased = n/(n-1)·S²_biased", () => {
    const xs = [2, 4, 4, 4, 5, 5, 7, 9];
    const n = xs.length;
    expect(sampleVarianceUnbiased(xs)).toBeCloseTo((n / (n - 1)) * sampleVarianceBiased(xs), 12);
  });
  it("n<2 の不偏分散は NaN", () => {
    expect(sampleVarianceUnbiased([5])).toBeNaN();
  });
});

describe("バイアス分散分解 MSE = bias² + variance", () => {
  it("恒等式が成り立つ", () => {
    const est = [1.8, 2.1, 1.9, 2.3, 1.7, 2.0];
    const d = biasVarianceDecomposition(est, 2.0);
    expect(d.mse).toBeCloseTo(d.biasSq + d.variance, 12);
  });
  it("バイアス・分散・MSE の定義", () => {
    const est = [3, 3, 3]; // 一定 → 分散0
    expect(bias(est, 2)).toBe(1);
    expect(estimatorVariance(est)).toBe(0);
    expect(meanSquaredError(est, 2)).toBe(1); // bias²=1
  });
});

describe("relativeEfficiency", () => {
  it("Var₂/Var₁。θ̂₁ が小分散なら>1", () => {
    expect(relativeEfficiency(1, 2)).toBe(2);
  });
});

describe("simulateVarianceEstimators", () => {
  it("不偏分散は真値の周りに偏りなし、偏り分散は σ² を下に偏る", () => {
    const rng = mulberry32(12345);
    const { trueVar, biased, unbiased } = simulateVarianceEstimators({
      mu: 0,
      sigma: 2,
      n: 5,
      trials: 4000,
      rng,
    });
    expect(trueVar).toBe(4);
    // 不偏分散のバイアスはほぼ0。
    expect(Math.abs(unbiased.bias)).toBeLessThan(0.2);
    // 偏り分散は下に偏る（負のバイアス）。理論上 E[S²ₙ]=(n-1)/n·σ²=0.8·4=3.2 → bias≈-0.8。
    expect(biased.bias).toBeLessThan(-0.4);
    expect(biased.bias).toBeGreaterThan(-1.2); // 理論 -σ²/n=-0.8 付近（MC誤差込み）
    expect(biased.bias).toBeLessThan(-0.5);
  });
  it("偏り分散の方が分散は小さい（バイアスと分散のトレードオフ）", () => {
    const rng = mulberry32(999);
    const { biased, unbiased } = simulateVarianceEstimators({
      mu: 0,
      sigma: 2,
      n: 5,
      trials: 4000,
      rng,
    });
    expect(biased.variance).toBeLessThan(unbiased.variance);
  });
});
