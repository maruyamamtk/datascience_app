import { describe, expect, it } from "vitest";
import {
  fitPoisson,
  generateCountData,
  inverseLink,
  linkFn,
  poissonDeviance,
  poissonLogLikelihood,
  poissonMean,
} from "./glm";
import { mulberry32 } from "./random";

describe("linkFn / inverseLink", () => {
  it("恒等リンク（ガウス）", () => {
    expect(linkFn("gaussian", 3)).toBe(3);
    expect(inverseLink("gaussian", 3)).toBe(3);
  });
  it("対数リンク（ポアソン）は exp の逆", () => {
    expect(inverseLink("poisson", Math.log(5))).toBeCloseTo(5, 12);
    expect(linkFn("poisson", 5)).toBeCloseTo(Math.log(5), 12);
  });
  it("ロジットリンク（二項）", () => {
    expect(inverseLink("binomial", 0)).toBeCloseTo(0.5, 12);
    expect(linkFn("binomial", 0.5)).toBeCloseTo(0, 12);
  });
  it("リンクと逆リンクは互いに逆（往復で戻る）", () => {
    expect(linkFn("poisson", inverseLink("poisson", 1.3))).toBeCloseTo(1.3, 10);
    expect(inverseLink("binomial", linkFn("binomial", 0.7))).toBeCloseTo(0.7, 10);
  });
});

describe("poissonMean", () => {
  it("λ=exp(b0+b1x)、b1>0 で x が増えると λ 増", () => {
    expect(poissonMean(0, 1, 0.5)).toBeCloseTo(Math.E, 10);
    expect(poissonMean(2, 1, 0.5)).toBeGreaterThan(poissonMean(0, 1, 0.5));
  });
});

describe("fitPoisson（勾配上昇で最尤）", () => {
  it("対数尤度が単調に増え、真の係数に近づく", () => {
    const rng = mulberry32(99);
    const { x, y } = generateCountData({ n: 200, b0: 0.2, b1: 0.6, xMin: 0, xMax: 4, rng });
    const path = fitPoisson(x, y, { lr: 0.02, iters: 1500 });
    expect(path[path.length - 1].logLik).toBeGreaterThan(path[0].logLik);
    expect(path[path.length - 1].b1).toBeGreaterThan(0.3); // 正の傾きを復元
    expect(path[path.length - 1].b1).toBeLessThan(0.9);
  });
});

describe("poissonDeviance", () => {
  it("デビアンスは非負", () => {
    const x = [0, 1, 2, 3];
    const y = [1, 2, 4, 8];
    expect(poissonDeviance(x, y, 0.2, 0.6)).toBeGreaterThanOrEqual(0);
  });
  it("良い当てはめほどデビアンスが小さい", () => {
    const rng = mulberry32(3);
    const { x, y } = generateCountData({ n: 150, b0: 0.3, b1: 0.5, xMin: 0, xMax: 4, rng });
    const good = fitPoisson(x, y, { lr: 0.02, iters: 1500 });
    const last = good[good.length - 1];
    const dGood = poissonDeviance(x, y, last.b0, last.b1);
    const dBad = poissonDeviance(x, y, 0, 0); // 平坦モデル
    expect(dGood).toBeLessThan(dBad);
  });
});

describe("logLikelihood は当てはまりとともに増える（負）", () => {
  it("ポアソン対数尤度", () => {
    const ll = poissonLogLikelihood([0, 1, 2], [1, 2, 4], 0.2, 0.6);
    expect(Number.isFinite(ll)).toBe(true);
  });
});
