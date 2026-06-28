import { describe, expect, it } from "vitest";
import {
  exponentialLogLikelihood,
  exponentialMle,
  exponentialScore,
  gradientAscentSteps,
  logLikCurve,
  residualSumOfSquares,
  uniformMaxMle,
  uniformMomentEstimate,
} from "./estimation";

const SAMPLE = [0.5, 1.2, 2.0, 0.8, 3.1, 1.5]; // 平均 ≈ 1.5167

describe("exponentialMle", () => {
  it("λ̂ = 1/x̄", () => {
    const mean = SAMPLE.reduce((a, b) => a + b, 0) / SAMPLE.length;
    expect(exponentialMle(SAMPLE)).toBeCloseTo(1 / mean, 12);
  });
  it("空・平均0 は NaN", () => {
    expect(exponentialMle([])).toBeNaN();
    expect(exponentialMle([0, 0])).toBeNaN();
  });
});

describe("対数尤度は MLE で最大", () => {
  it("λ̂ の対数尤度が近傍より大きい", () => {
    const mle = exponentialMle(SAMPLE);
    const atMle = exponentialLogLikelihood(mle, SAMPLE);
    expect(atMle).toBeGreaterThan(exponentialLogLikelihood(mle * 0.7, SAMPLE));
    expect(atMle).toBeGreaterThan(exponentialLogLikelihood(mle * 1.3, SAMPLE));
  });
  it("score（勾配）は MLE で 0", () => {
    expect(exponentialScore(exponentialMle(SAMPLE), SAMPLE)).toBeCloseTo(0, 8);
  });
});

describe("logLikCurve", () => {
  it("正規化尤度の最大は λ̂ 付近で 1", () => {
    const curve = logLikCurve(SAMPLE, 0.1, 2, 200);
    const max = curve.reduce((m, c) => (c.lik > m.lik ? c : m));
    expect(max.lambda).toBeCloseTo(exponentialMle(SAMPLE), 1);
    expect(max.lik).toBeCloseTo(1, 6);
  });
});

describe("gradientAscentSteps", () => {
  it("勾配上昇で λ̂ に収束（勾配→0）", () => {
    const steps = gradientAscentSteps(SAMPLE, 0.2, 0.2, 80);
    const last = steps[steps.length - 1];
    expect(last.lambda).toBeCloseTo(exponentialMle(SAMPLE), 2);
    expect(Math.abs(last.score)).toBeLessThan(0.05);
  });
  it("対数尤度は全体として増え、最終的に最大付近へ（登っている）", () => {
    const steps = gradientAscentSteps(SAMPLE, 0.2, 0.2, 80);
    const first = steps[0].logLik;
    const last = steps[steps.length - 1].logLik;
    const best = exponentialLogLikelihood(exponentialMle(SAMPLE), SAMPLE);
    expect(last).toBeGreaterThan(first); // 出発点より登った
    expect(best - last).toBeLessThan(0.01); // ほぼ頂上に到達
  });
});

describe("モーメント法 vs 最尤法（一様 U[0,θ]）", () => {
  const u = [1, 2, 3, 4, 9]; // 平均 3.8, 最大 9
  it("モーメント法は 2·x̄、最尤は max", () => {
    expect(uniformMomentEstimate(u)).toBeCloseTo(7.6, 12);
    expect(uniformMaxMle(u)).toBe(9);
  });
  it("最尤（max）は必ず観測を覆う、モーメント法は覆わないことがある", () => {
    // max=9 > すべての観測。2·x̄=7.6 < 9 なので最大値を覆わない（理論上ありえない θ）。
    expect(uniformMaxMle(u)).toBeGreaterThanOrEqual(Math.max(...u));
    expect(uniformMomentEstimate(u)).toBeLessThan(Math.max(...u));
  });
});

describe("最小二乗法（平均の推定）", () => {
  it("RSS(c)=Σ(x−c)² は c=x̄ で最小", () => {
    const mean = SAMPLE.reduce((a, b) => a + b, 0) / SAMPLE.length;
    const atMean = residualSumOfSquares(SAMPLE, mean);
    expect(atMean).toBeLessThan(residualSumOfSquares(SAMPLE, mean + 0.5));
    expect(atMean).toBeLessThan(residualSumOfSquares(SAMPLE, mean - 0.5));
  });
});
