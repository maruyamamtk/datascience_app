import { describe, expect, it } from "vitest";
import {
  completeCaseEstimate,
  fullDataEstimate,
  generateMissing,
  meanImputationEstimate,
  observedFraction,
  regressionImputationEstimate,
  stochasticRegressionEstimate,
  type Mechanism,
} from "./missing";
import { mulberry32 } from "./random";

function build(mechanism: Mechanism, seed: number) {
  return generateMissing({
    n: 8000,
    beta0: 10,
    beta1: 3,
    noise: 2,
    mechanism,
    missRate: 0.4,
    strength: 0.28,
    rng: mulberry32(seed),
  });
}

describe("MCAR：完全ケース分析は不偏", () => {
  it("観測だけの平均が真の平均に近い", () => {
    const u = build("MCAR", 61);
    const full = fullDataEstimate(u).mean;
    const cc = completeCaseEstimate(u).mean;
    expect(Math.abs(cc - full)).toBeLessThan(0.15);
  });
});

describe("MAR：完全ケースは偏るが回帰代入で回復", () => {
  const u = build("MAR", 62);
  const full = fullDataEstimate(u).mean;

  it("完全ケース分析は真値から明確にズレる", () => {
    const cc = completeCaseEstimate(u).mean;
    expect(Math.abs(cc - full)).toBeGreaterThan(0.3);
  });

  it("回帰代入（X を使う）は完全ケースより真値に近い", () => {
    const cc = completeCaseEstimate(u).mean;
    const reg = regressionImputationEstimate(u).mean;
    expect(Math.abs(reg - full)).toBeLessThan(Math.abs(cc - full));
    expect(Math.abs(reg - full)).toBeLessThan(0.2);
  });
});

describe("平均代入はばらつきを縮める", () => {
  it("平均代入の SD < 真の SD（分散の過小評価）", () => {
    const u = build("MCAR", 63);
    const full = fullDataEstimate(u).sd;
    const meanImp = meanImputationEstimate(u).sd;
    expect(meanImp).toBeLessThan(full);
  });

  it("平均代入の平均は完全ケースと一致", () => {
    const u = build("MCAR", 64);
    expect(meanImputationEstimate(u).mean).toBeCloseTo(completeCaseEstimate(u).mean, 8);
  });
});

describe("確率的回帰代入はばらつきも回復", () => {
  it("MAR で確率的回帰代入の SD が平均代入より真値に近い", () => {
    const u = build("MAR", 65);
    const full = fullDataEstimate(u).sd;
    const meanImp = meanImputationEstimate(u).sd;
    const stoch = stochasticRegressionEstimate(u, mulberry32(99)).sd;
    expect(Math.abs(stoch - full)).toBeLessThan(Math.abs(meanImp - full));
  });
});

describe("MNAR：Y 自身に依存すると観測変数だけでは戻せない", () => {
  it("回帰代入でも完全ケースと同様に偏りが残る", () => {
    const u = build("MNAR", 66);
    const full = fullDataEstimate(u).mean;
    const reg = regressionImputationEstimate(u).mean;
    // MNAR は X で説明できないので回帰代入でもバイアスが残る
    expect(Math.abs(reg - full)).toBeGreaterThan(0.3);
  });
});

describe("observedFraction", () => {
  it("欠測率 0.4 なら観測割合は概ね 0.6", () => {
    const u = build("MCAR", 67);
    expect(observedFraction(u)).toBeGreaterThan(0.55);
    expect(observedFraction(u)).toBeLessThan(0.65);
  });
});
