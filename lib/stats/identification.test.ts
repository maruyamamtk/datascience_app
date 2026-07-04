import { describe, expect, it } from "vitest";
import {
  didCounterfactual,
  didEstimate,
  generateDidCells,
  generateIvUnits,
  generateRddPoints,
  ivNaiveEstimate,
  ivWaldEstimate,
  rddEstimate,
} from "./identification";
import { mulberry32 } from "./random";

describe("DID（差の差分法）", () => {
  it("平行トレンドが成り立てば DID は真の効果に一致", () => {
    const cells = generateDidCells({
      trueEffect: 3,
      commonTrend: 4,
      treatedBefore: 20,
      controlBefore: 10,
    });
    // 対照群の変化=commonTrend=4、処置群の変化=commonTrend+effect=7 → DID=3
    expect(didEstimate(cells)).toBeCloseTo(3, 10);
  });

  it("反事実後 = 前 + 対照群の変化、実測との差が DID", () => {
    const cells = generateDidCells({
      trueEffect: 5,
      commonTrend: 2,
      treatedBefore: 30,
      controlBefore: 15,
    });
    expect(didCounterfactual(cells)).toBeCloseTo(32, 10); // 30 + 2
    expect(cells.treatedAfter - didCounterfactual(cells)).toBeCloseTo(5, 10);
  });

  it("平行トレンドの破れは DID にそのままバイアスとして乗る", () => {
    const cells = generateDidCells({
      trueEffect: 3,
      commonTrend: 4,
      treatedBefore: 20,
      controlBefore: 10,
      parallelViolation: 2,
    });
    expect(didEstimate(cells)).toBeCloseTo(5, 10); // 3 + 2
  });
});

describe("IV（操作変数法・Wald 推定）", () => {
  it("未観測交絡で素朴比較は偏るが、IV は真の効果を回復", () => {
    const units = generateIvUnits({
      n: 20000,
      tau: 2,
      strength: 1.2,
      confounder: 3,
      rng: mulberry32(11),
    });
    const naive = ivNaiveEstimate(units);
    const iv = ivWaldEstimate(units);
    // 交絡（confounder>0）で素朴比較は真値2から大きく上振れ
    expect(Math.abs(naive - 2)).toBeGreaterThan(0.5);
    // IV は真値2の近くに戻る
    expect(iv).toBeGreaterThan(1.4);
    expect(iv).toBeLessThan(2.6);
    // IV の方が真値に近い
    expect(Math.abs(iv - 2)).toBeLessThan(Math.abs(naive - 2));
  });

  it("操作変数が処置を動かす（第1段階が非ゼロ）", () => {
    const units = generateIvUnits({
      n: 8000,
      tau: 2,
      strength: 1.2,
      confounder: 3,
      rng: mulberry32(12),
    });
    const z1 = units.filter((u) => u.z === 1);
    const z0 = units.filter((u) => u.z === 0);
    const firstStage =
      z1.reduce((a, u) => a + u.t, 0) / z1.length - z0.reduce((a, u) => a + u.t, 0) / z0.length;
    expect(firstStage).toBeGreaterThan(0.15); // Z=1 で処置率が明確に上がる
  });
});

describe("RDD（回帰不連続デザイン）", () => {
  it("閾値でのジャンプが真の効果に一致", () => {
    const pts = generateRddPoints({
      n: 4000,
      tau: 4,
      slope: 1.5,
      cutoff: 50,
      halfWidth: 10,
      noise: 1,
      rng: mulberry32(13),
    });
    const { jump } = rddEstimate(pts, 50);
    expect(jump).toBeGreaterThan(3.4);
    expect(jump).toBeLessThan(4.6);
  });

  it("効果ゼロなら閾値でジャンプしない", () => {
    const pts = generateRddPoints({
      n: 4000,
      tau: 0,
      slope: 2,
      cutoff: 0,
      halfWidth: 5,
      noise: 1,
      rng: mulberry32(14),
    });
    const { jump } = rddEstimate(pts, 0);
    expect(Math.abs(jump)).toBeLessThan(0.6);
  });

  it("左右の傾きが真の傾きに近い（連続な f の推定）", () => {
    const pts = generateRddPoints({
      n: 4000,
      tau: 4,
      slope: 1.5,
      cutoff: 50,
      halfWidth: 10,
      noise: 0.5,
      rng: mulberry32(15),
    });
    const { left, right } = rddEstimate(pts, 50);
    expect(left.slope).toBeCloseTo(1.5, 0);
    expect(right.slope).toBeCloseTo(1.5, 0);
  });
});
