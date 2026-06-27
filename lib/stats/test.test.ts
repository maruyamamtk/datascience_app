import { describe, expect, it } from "vitest";
import {
  betaError,
  criticalValue,
  deriveTest,
  power,
  pValue,
  zTest,
} from "./test";

describe("criticalValue（棄却域の臨界値）", () => {
  it("両側は z_{1−α/2}", () => {
    expect(criticalValue(0.05, "two-sided")).toBeCloseTo(1.95996, 4);
    expect(criticalValue(0.01, "two-sided")).toBeCloseTo(2.57583, 4);
  });
  it("片側は z_{1−α}", () => {
    expect(criticalValue(0.05, "greater")).toBeCloseTo(1.64485, 4);
    expect(criticalValue(0.05, "less")).toBeCloseTo(1.64485, 4);
  });
  it("α∉(0,1) は NaN", () => {
    expect(criticalValue(0, "two-sided")).toBeNaN();
    expect(criticalValue(1, "greater")).toBeNaN();
  });
});

describe("pValue", () => {
  it("z=0 のとき 両側は1・片側は0.5", () => {
    expect(pValue(0, "two-sided")).toBeCloseTo(1, 6);
    expect(pValue(0, "greater")).toBeCloseTo(0.5, 6);
    expect(pValue(0, "less")).toBeCloseTo(0.5, 6);
  });
  it("z=1.96 で両側 ≈ 0.05", () => {
    expect(pValue(1.95996, "two-sided")).toBeCloseTo(0.05, 4);
  });
  it("z=1.645 で右片側 ≈ 0.05", () => {
    expect(pValue(1.64485, "greater")).toBeCloseTo(0.05, 4);
  });
  it("両側 p は |z| に依る（符号で変わらない）", () => {
    expect(pValue(2, "two-sided")).toBeCloseTo(pValue(-2, "two-sided"), 12);
  });
});

describe("zTest（σ既知の z 検定）", () => {
  it("Z=(x̄−μ0)/(σ/√n)", () => {
    // x̄=52, μ0=50, σ=10, n=25 → SE=2 → z=1
    const r = zTest({ mean: 52, mu0: 50, sigma: 10, n: 25, alpha: 0.05, alternative: "two-sided" });
    expect(r.z).toBeCloseTo(1, 12);
    expect(r.critical).toBeCloseTo(1.95996, 4);
    expect(r.reject).toBe(false); // |1| < 1.96
  });
  it("臨界値を超えると棄却（両側）", () => {
    const r = zTest({ mean: 55, mu0: 50, sigma: 10, n: 25, alpha: 0.05, alternative: "two-sided" });
    expect(r.z).toBeCloseTo(2.5, 12);
    expect(r.reject).toBe(true);
  });
  it("棄却 ⇔ p<α と整合（両側）", () => {
    const r = zTest({ mean: 55, mu0: 50, sigma: 10, n: 25, alpha: 0.05, alternative: "two-sided" });
    expect(r.reject).toBe(r.pValue < 0.05);
  });
  it("右片側は正側のみ棄却", () => {
    const lo = zTest({ mean: 45, mu0: 50, sigma: 10, n: 25, alpha: 0.05, alternative: "greater" });
    expect(lo.z).toBeCloseTo(-2.5, 12);
    expect(lo.reject).toBe(false); // 左に外れても右片側では棄却しない
    const hi = zTest({ mean: 54, mu0: 50, sigma: 10, n: 25, alpha: 0.05, alternative: "greater" });
    expect(hi.reject).toBe(true);
  });
});

describe("power / betaError（検出力と第二種の過誤）", () => {
  it("効果量 0 のとき検出力は α に等しい", () => {
    expect(power({ effectSize: 0, n: 30, alpha: 0.05, alternative: "two-sided" })).toBeCloseTo(
      0.05,
      6,
    );
    expect(power({ effectSize: 0, n: 30, alpha: 0.05, alternative: "greater" })).toBeCloseTo(
      0.05,
      6,
    );
  });
  it("n を増やすと検出力は上がる（効果量一定）", () => {
    const small = power({ effectSize: 0.5, n: 10, alpha: 0.05, alternative: "two-sided" });
    const large = power({ effectSize: 0.5, n: 60, alpha: 0.05, alternative: "two-sided" });
    expect(large).toBeGreaterThan(small);
  });
  it("効果量を増やすと検出力は上がる", () => {
    const a = power({ effectSize: 0.2, n: 30, alpha: 0.05, alternative: "two-sided" });
    const b = power({ effectSize: 0.8, n: 30, alpha: 0.05, alternative: "two-sided" });
    expect(b).toBeGreaterThan(a);
  });
  it("α を下げると検出力は下がる（β は上がる）", () => {
    const at05 = power({ effectSize: 0.5, n: 30, alpha: 0.05, alternative: "two-sided" });
    const at01 = power({ effectSize: 0.5, n: 30, alpha: 0.01, alternative: "two-sided" });
    expect(at01).toBeLessThan(at05);
    expect(betaError({ effectSize: 0.5, n: 30, alpha: 0.01, alternative: "two-sided" })).toBeGreaterThan(
      betaError({ effectSize: 0.5, n: 30, alpha: 0.05, alternative: "two-sided" }),
    );
  });
  it("β = 1 − 検出力", () => {
    const args = { effectSize: 0.5, n: 30, alpha: 0.05, alternative: "two-sided" as const };
    expect(betaError(args)).toBeCloseTo(1 - power(args), 12);
  });
  it("既知の代表値: d=0.5,n=32,α=0.05,両側 → 検出力 ≈ 0.80", () => {
    // 一標本 z 検定で検出力 0.8 を得るには δ=d√n≈2.80（=z_{0.975}+z_{0.8}）→ n≈32。
    expect(power({ effectSize: 0.5, n: 32, alpha: 0.05, alternative: "two-sided" })).toBeCloseTo(
      0.8,
      1,
    );
  });
});

describe("deriveTest（ストアの派生値）", () => {
  it("δ=d√n、critical/pValue/power/beta を返す", () => {
    const d = deriveTest({ effectSize: 0.5, n: 32, alpha: 0.05, alternative: "two-sided" });
    expect(d.delta).toBeCloseTo(0.5 * Math.sqrt(32), 12); // 0.5·√32 ≈ 2.83
    expect(d.critical).toBeCloseTo(1.95996, 4);
    expect(d.power).toBeCloseTo(0.8, 1);
    expect(d.beta).toBeCloseTo(1 - d.power, 12);
    expect(d.pValue).toBeCloseTo(pValue(d.delta, "two-sided"), 12);
  });
  it("効果量 0 なら δ=0・検出力=α", () => {
    const d = deriveTest({ effectSize: 0, n: 30, alpha: 0.05, alternative: "greater" });
    expect(d.delta).toBe(0);
    expect(d.power).toBeCloseTo(0.05, 6);
  });
});
