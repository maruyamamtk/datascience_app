import { describe, expect, it } from "vitest";
import {
  ate,
  confoundingBias,
  covariateBalance,
  generateUnits,
  naiveDifference,
  observedOutcome,
  stratifiedAte,
} from "./causal";
import { mulberry32 } from "./random";

describe("generateUnits / observedOutcome", () => {
  it("観測結果は treated で Y(1)、そうでなければ Y(0)", () => {
    const units = generateUnits({
      n: 100,
      tau: 3,
      confounderEffect: 4,
      selection: 0.6,
      randomized: false,
      rng: mulberry32(1),
    });
    for (const u of units) {
      expect(observedOutcome(u)).toBe(u.treated ? u.y1 : u.y0);
    }
  });
  it("Y(1)−Y(0)=tau（一定処置効果）", () => {
    const units = generateUnits({
      n: 50,
      tau: 2.5,
      confounderEffect: 3,
      selection: 0.5,
      randomized: false,
      rng: mulberry32(2),
    });
    for (const u of units) expect(u.y1 - u.y0).toBeCloseTo(2.5, 10);
  });
});

describe("ate", () => {
  it("真の ATE は tau に一致（両潜在結果を使う）", () => {
    const units = generateUnits({
      n: 2000,
      tau: 3,
      confounderEffect: 5,
      selection: 0.8,
      randomized: false,
      rng: mulberry32(3),
    });
    expect(ate(units)).toBeCloseTo(3, 8);
  });
});

describe("交絡バイアス（相関≠因果）", () => {
  it("非無作為＋交絡ありでは素朴比較が ATE から上振れ", () => {
    // selection>0（重症ほど治療）かつ confounderEffect>0（重症ほど悪化）
    // → 処置群に重症が多く結果が悪く見え、素朴比較は真の効果からズレる（正のバイアス）
    const units = generateUnits({
      n: 4000,
      tau: 2,
      confounderEffect: 6,
      selection: 0.8,
      randomized: false,
      rng: mulberry32(4),
    });
    const bias = confoundingBias(units);
    expect(Math.abs(bias)).toBeGreaterThan(0.5); // 明確なバイアス
    // 素朴比較は真の ATE(=2) と一致しない
    expect(Math.abs(naiveDifference(units) - 2)).toBeGreaterThan(0.5);
  });

  it("無作為化するとバイアスが消える（素朴比較≈ATE）", () => {
    const units = generateUnits({
      n: 4000,
      tau: 2,
      confounderEffect: 6,
      selection: 0.8, // 無視される（randomized）
      randomized: true,
      rng: mulberry32(5),
    });
    expect(Math.abs(confoundingBias(units))).toBeLessThan(0.4);
    expect(naiveDifference(units)).toBeGreaterThan(1.5);
    expect(naiveDifference(units)).toBeLessThan(2.5);
  });
});

describe("stratifiedAte（層別調整でバイアス除去）", () => {
  it("交絡ありでも層別調整で真の ATE を回復", () => {
    const units = generateUnits({
      n: 6000,
      tau: 2,
      confounderEffect: 6,
      selection: 0.8,
      randomized: false,
      rng: mulberry32(6),
    });
    const adjusted = stratifiedAte(units);
    expect(adjusted).toBeGreaterThan(1.5);
    expect(adjusted).toBeLessThan(2.5);
    // 素朴比較より真値(2)に近い
    expect(Math.abs(adjusted - 2)).toBeLessThan(Math.abs(naiveDifference(units) - 2));
  });
});

describe("covariateBalance", () => {
  it("非無作為では処置群の交絡平均が対照群より高い（不均衡）", () => {
    const units = generateUnits({
      n: 4000,
      tau: 2,
      confounderEffect: 5,
      selection: 0.8,
      randomized: false,
      rng: mulberry32(7),
    });
    const { treatedX, controlX } = covariateBalance(units);
    expect(treatedX).toBeGreaterThan(controlX);
  });
  it("無作為化すると交絡がほぼ均衡する", () => {
    const units = generateUnits({
      n: 4000,
      tau: 2,
      confounderEffect: 5,
      selection: 0.8,
      randomized: true,
      rng: mulberry32(8),
    });
    const { treatedX, controlX } = covariateBalance(units);
    expect(Math.abs(treatedX - controlX)).toBeLessThan(0.08);
  });
});
