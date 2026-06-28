import { describe, expect, it } from "vitest";
import {
  correlationT,
  oneSampleT,
  tCdf,
  tTestPValue,
  twoSampleT,
  varianceChiSquare,
} from "./normal-tests";

describe("tCdf", () => {
  it("F(0)=0.5、対称 F(−t)=1−F(t)", () => {
    expect(tCdf(0, 10)).toBeCloseTo(0.5, 12);
    expect(tCdf(-1.5, 10)).toBeCloseTo(1 - tCdf(1.5, 10), 8);
  });
  it("df=∞相当（大）で標準正規に近い：F(1.96, 1000)≈0.975", () => {
    expect(tCdf(1.96, 1000)).toBeCloseTo(0.975, 3);
  });
  it("自由度10で t=2.228 が上側2.5%（既知の臨界値）", () => {
    expect(tCdf(2.228, 10)).toBeCloseTo(0.975, 3);
  });
});

describe("tTestPValue", () => {
  it("t=0 で p=1", () => {
    expect(tTestPValue(0, 10)).toBeCloseTo(1, 8);
  });
  it("自由度10で |t|=2.228 の両側 p≈0.05", () => {
    expect(tTestPValue(2.228, 10)).toBeCloseTo(0.05, 3);
  });
  it("t が大きいほど p は小さい", () => {
    expect(tTestPValue(3, 20)).toBeLessThan(tTestPValue(1.5, 20));
  });
});

describe("oneSampleT", () => {
  it("t=(x̄−μ0)/(s/√n), df=n−1", () => {
    const { t, df } = oneSampleT(5, 4, 2, 16);
    expect(t).toBeCloseTo((5 - 4) / (2 / 4), 12); // =2
    expect(df).toBe(15);
  });
});

describe("twoSampleT（等分散プール）", () => {
  it("等分散・等nでは se=sp·√(2/n), df=2n−2", () => {
    const r = twoSampleT({ mean1: 10, mean2: 8, s1: 2, s2: 2, n1: 10, n2: 10 });
    expect(r.pooledSd).toBeCloseTo(2, 12);
    expect(r.df).toBe(18);
    expect(r.se).toBeCloseTo(2 * Math.sqrt(2 / 10), 12);
    expect(r.t).toBeCloseTo(2 / (2 * Math.sqrt(2 / 10)), 12);
  });
  it("平均差が0なら t=0", () => {
    expect(twoSampleT({ mean1: 5, mean2: 5, s1: 1, s2: 1, n1: 5, n2: 5 }).t).toBe(0);
  });
});

describe("correlationT", () => {
  it("t=r√((n−2)/(1−r²)), df=n−2", () => {
    const { t, df } = correlationT(0.5, 12);
    expect(df).toBe(10);
    expect(t).toBeCloseTo((0.5 * Math.sqrt(10)) / Math.sqrt(1 - 0.25), 12);
  });
  it("r=0 で t=0", () => {
    expect(correlationT(0, 30).t).toBe(0);
  });
});

describe("varianceChiSquare", () => {
  it("χ²=(n−1)s²/σ0², df=n−1", () => {
    const { chi2, df } = varianceChiSquare(9, 4, 21);
    expect(chi2).toBeCloseTo((20 * 9) / 4, 12);
    expect(df).toBe(20);
  });
});
