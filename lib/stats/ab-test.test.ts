import { describe, expect, it } from "vitest";
import {
  diffConfidenceInterval,
  peekingFalsePositiveRate,
  power,
  requiredSampleSize,
  twoProportionTest,
} from "./ab-test";
import { mulberry32 } from "./random";

describe("twoProportionTest", () => {
  it("差が大きく標本も大きいと有意（p 小・z 正）", () => {
    const r = twoProportionTest({ x1: 1000, n1: 10000, x2: 1300, n2: 10000 });
    expect(r.p1).toBeCloseTo(0.1, 10);
    expect(r.p2).toBeCloseTo(0.13, 10);
    expect(r.diff).toBeCloseTo(0.03, 10);
    expect(r.z).toBeGreaterThan(6);
    expect(r.pValue).toBeLessThan(0.001);
  });

  it("差がなければ z≈0・p≈1", () => {
    const r = twoProportionTest({ x1: 500, n1: 5000, x2: 500, n2: 5000 });
    expect(r.z).toBeCloseTo(0, 10);
    expect(r.pValue).toBeCloseTo(1, 10);
  });
});

describe("diffConfidenceInterval", () => {
  it("差ゼロのとき区間は0を含む", () => {
    const ci = diffConfidenceInterval({ x1: 500, n1: 5000, x2: 500, n2: 5000 });
    expect(ci.lower).toBeLessThan(0);
    expect(ci.upper).toBeGreaterThan(0);
  });
});

describe("requiredSampleSize / power（整合性）", () => {
  it("必要 n で計算した検出力が目標 power にほぼ一致", () => {
    const p0 = 0.1;
    const mde = 0.02;
    const n = requiredSampleSize({ p0, mde, alpha: 0.05, power: 0.8 });
    expect(n).toBeGreaterThan(3000);
    expect(n).toBeLessThan(5000);
    expect(power({ p0, mde, n, alpha: 0.05 })).toBeGreaterThan(0.79);
    expect(power({ p0, mde, n, alpha: 0.05 })).toBeLessThan(0.85);
  });

  it("MDE が小さいほど必要 n は増える（δ² に反比例）", () => {
    const nBig = requiredSampleSize({ p0: 0.1, mde: 0.04 });
    const nSmall = requiredSampleSize({ p0: 0.1, mde: 0.02 });
    // δ 半分 → n は約4倍
    expect(nSmall / nBig).toBeGreaterThan(3.5);
    expect(nSmall / nBig).toBeLessThan(4.5);
  });

  it("n が増えると検出力は単調に上がる", () => {
    const pow1 = power({ p0: 0.1, mde: 0.02, n: 1000 });
    const pow2 = power({ p0: 0.1, mde: 0.02, n: 4000 });
    expect(pow2).toBeGreaterThan(pow1);
  });
});

describe("peekingFalsePositiveRate", () => {
  it("繰り返し覗くと第一種の過誤が名目 alpha を超える", () => {
    const single = peekingFalsePositiveRate({
      looks: 1,
      perLook: 800,
      p0: 0.2,
      alpha: 0.05,
      trials: 600,
      rng: mulberry32(31),
    });
    const many = peekingFalsePositiveRate({
      looks: 10,
      perLook: 80,
      p0: 0.2,
      alpha: 0.05,
      trials: 600,
      rng: mulberry32(31),
    });
    // 1回見るだけなら概ね名目水準付近
    expect(single).toBeLessThan(0.1);
    // 10回覗くと過誤が明確に膨らむ
    expect(many).toBeGreaterThan(single);
    expect(many).toBeGreaterThan(0.1);
  });
});
