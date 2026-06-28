import { describe, expect, it } from "vitest";
import { mulberry32 } from "./random";
import {
  exponentialFisherInfo,
  jackknife,
  klExponential,
  mleAsymptoticVariance,
  simulateMleSampling,
} from "./asymptotics";

describe("フィッシャー情報量と漸近分散", () => {
  it("指数分布の I(λ)=1/λ²", () => {
    expect(exponentialFisherInfo(2)).toBeCloseTo(0.25, 12);
  });
  it("漸近分散 = λ²/n（クラメール–ラオ下限）", () => {
    expect(mleAsymptoticVariance(2, 100)).toBeCloseTo(4 / 100, 12);
  });
  it("n→大 で漸近分散→0（一致性）", () => {
    expect(mleAsymptoticVariance(2, 1000)).toBeLessThan(mleAsymptoticVariance(2, 100));
  });
});

describe("simulateMleSampling（漸近正規性）", () => {
  it("最尤推定の標本分布の平均≈真値、分散≈λ²/n（大標本）", () => {
    const rng = mulberry32(7);
    const { mean, variance } = simulateMleSampling({
      trueLambda: 2,
      n: 200,
      trials: 4000,
      rng,
    });
    expect(mean).toBeCloseTo(2, 1); // ≈ 真値（小標本バイアスは O(1/n)）
    // 漸近分散 λ²/n=4/200=0.02 に近い。
    expect(variance).toBeGreaterThan(0.012);
    expect(variance).toBeLessThan(0.035);
  });
  it("n を増やすと標本分布の分散は小さくなる", () => {
    const a = simulateMleSampling({ trueLambda: 2, n: 30, trials: 3000, rng: mulberry32(1) });
    const b = simulateMleSampling({ trueLambda: 2, n: 300, trials: 3000, rng: mulberry32(1) });
    expect(b.variance).toBeLessThan(a.variance);
  });
});

describe("カルバック–ライブラー情報量", () => {
  it("同じ分布なら 0", () => {
    expect(klExponential(2, 2)).toBeCloseTo(0, 12);
  });
  it("ずれると正、非対称", () => {
    expect(klExponential(2, 1)).toBeGreaterThan(0);
    expect(klExponential(1, 2)).toBeGreaterThan(0);
    expect(klExponential(2, 1)).not.toBeCloseTo(klExponential(1, 2), 3); // 非対称
  });
});

describe("jackknife", () => {
  it("平均のジャックナイフ分散は s²/n に一致", () => {
    const xs = [2, 4, 4, 4, 5, 5, 7, 9];
    const mean = (a: readonly number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    const { varianceEstimate } = jackknife(xs, mean);
    const n = xs.length;
    const m = mean(xs);
    const s2 = xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / (n - 1);
    expect(varianceEstimate).toBeCloseTo(s2 / n, 8);
  });
  it("n<2 は NaN", () => {
    expect(jackknife([5], (a) => a[0]).varianceEstimate).toBeNaN();
  });
});
