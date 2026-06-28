import { describe, expect, it } from "vitest";
import { mulberry32 } from "./random";
import {
  fitLogistic,
  generateBinaryData,
  logLikelihood,
  logisticPredict,
  logit,
  oddsRatio,
  sigmoid,
} from "./logistic";

describe("sigmoid / logit", () => {
  it("σ(0)=0.5、σ(∞)→1、σ(−∞)→0", () => {
    expect(sigmoid(0)).toBeCloseTo(0.5, 12);
    expect(sigmoid(100)).toBeCloseTo(1, 6);
    expect(sigmoid(-100)).toBeCloseTo(0, 6);
  });
  it("対称 σ(−z)=1−σ(z)", () => {
    expect(sigmoid(-2)).toBeCloseTo(1 - sigmoid(2), 12);
  });
  it("logit はシグモイドの逆関数", () => {
    expect(logit(sigmoid(1.3))).toBeCloseTo(1.3, 8);
    expect(logit(0.5)).toBeCloseTo(0, 12);
  });
});

describe("oddsRatio", () => {
  it("b1=ln2 ならオッズ比2", () => {
    expect(oddsRatio(Math.log(2))).toBeCloseTo(2, 12);
  });
  it("b1=0 ならオッズ比1（効果なし）", () => {
    expect(oddsRatio(0)).toBe(1);
  });
});

describe("logisticPredict", () => {
  it("b0+b1x=0 の x で確率0.5", () => {
    // b0=-2, b1=1 → x=2 で 0.5
    expect(logisticPredict(2, -2, 1)).toBeCloseTo(0.5, 12);
  });
});

describe("fitLogistic（勾配上昇で最尤）", () => {
  it("対数尤度は単調に増え、真の係数に近づく", () => {
    const rng = mulberry32(12345);
    const { x, y } = generateBinaryData({ n: 400, b0: -1, b1: 2, xMin: -2, xMax: 3, rng });
    const path = fitLogistic(x, y, { lr: 0.5, iters: 800 });
    const first = path[0].logLik;
    const last = path[path.length - 1].logLik;
    expect(last).toBeGreaterThan(first); // 登った
    // 推定係数が真値に近い（標本なので緩く）。
    expect(path[path.length - 1].b1).toBeGreaterThan(1); // 正の傾きを復元
    expect(path[path.length - 1].b0).toBeLessThan(0); // 負の切片を復元
  });
  it("対数尤度は常に負（確率の対数の和）", () => {
    const ll = logLikelihood([1, 2, 3], [1, 0, 1], 0.5, 0.5);
    expect(ll).toBeLessThan(0);
  });
});

describe("generateBinaryData", () => {
  it("x が大きいほど y=1 の割合が高い（b1>0）", () => {
    const rng = mulberry32(7);
    const { x, y } = generateBinaryData({ n: 600, b0: 0, b1: 3, xMin: -2, xMax: 2, rng });
    const lowMean =
      y.filter((_, i) => x[i] < 0).reduce((a, b) => a + b, 0) / y.filter((_, i) => x[i] < 0).length;
    const highMean =
      y.filter((_, i) => x[i] > 0).reduce((a, b) => a + b, 0) / y.filter((_, i) => x[i] > 0).length;
    expect(highMean).toBeGreaterThan(lowMean);
  });
});
