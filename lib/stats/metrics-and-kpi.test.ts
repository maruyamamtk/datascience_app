import { describe, expect, it } from "vitest";
import {
  accuracyOf,
  argmaxIndex,
  businessValueOf,
  classifyByThreshold,
  confusionAt,
  decomposeRevenue,
  factorSensitivity,
  generateCustomers,
  makeLcg,
  normalizeToUnit,
  N_CUSTOMERS,
  sweepThresholds,
} from "./metrics-and-kpi";

describe("generateCustomers", () => {
  it("N_CUSTOMERS 件を決定的に生成する（同じ seed で同じ結果）", () => {
    const a = generateCustomers(20260719);
    const b = generateCustomers(20260719);
    expect(a).toEqual(b);
    expect(a.length).toBe(N_CUSTOMERS);
  });

  it("スコア・qualityは0〜1に収まる", () => {
    const customers = generateCustomers(20260719);
    for (const c of customers) {
      expect(c.score).toBeGreaterThanOrEqual(0);
      expect(c.score).toBeLessThanOrEqual(1);
      expect(c.quality).toBeGreaterThanOrEqual(0);
      expect(c.quality).toBeLessThanOrEqual(1);
      expect([0, 1]).toContain(c.label);
    }
  });

  it("陽性・陰性の両方が一定数存在する（極端な不均衡になっていない）", () => {
    const customers = generateCustomers(20260719);
    const positives = customers.filter((c) => c.label === 1).length;
    expect(positives).toBeGreaterThan(10);
    expect(positives).toBeLessThan(N_CUSTOMERS - 10);
  });
});

describe("classifyByThreshold / confusionAt", () => {
  it("しきい値0なら全員陽性判定、しきい値1超なら全員陰性判定", () => {
    expect(classifyByThreshold(0.3, 0)).toBe(1);
    expect(classifyByThreshold(0, 0)).toBe(1);
    expect(classifyByThreshold(0.9, 1.01)).toBe(0);
  });

  it("混同行列の合計は常に全件数と一致する", () => {
    const customers = generateCustomers(20260719);
    for (const threshold of [0, 0.2, 0.5, 0.8, 1]) {
      const c = confusionAt(customers, threshold);
      expect(c.tp + c.fp + c.tn + c.fn).toBe(customers.length);
    }
  });

  it("しきい値0では全員陽性予測なのでFN=0・TN=0", () => {
    const customers = generateCustomers(20260719);
    const c = confusionAt(customers, 0);
    expect(c.fn).toBe(0);
    expect(c.tn).toBe(0);
  });

  it("しきい値を1超にすると全員陰性予測なのでTP=0・FP=0", () => {
    const customers = generateCustomers(20260719);
    const c = confusionAt(customers, 1.01);
    expect(c.tp).toBe(0);
    expect(c.fp).toBe(0);
  });
});

describe("accuracyOf / businessValueOf", () => {
  it("正解率は0〜1の範囲", () => {
    const customers = generateCustomers(20260719);
    for (const threshold of [0, 0.3, 0.5, 0.7, 1]) {
      const acc = accuracyOf(confusionAt(customers, threshold));
      expect(acc).toBeGreaterThanOrEqual(0);
      expect(acc).toBeLessThanOrEqual(1);
    }
  });

  it("コストが全て0なら期待ビジネスインパクトは常に0", () => {
    const customers = generateCustomers(20260719);
    const c = confusionAt(customers, 0.4);
    expect(businessValueOf(c, 0, 0, 0)).toBe(0);
  });

  it("FP・FNが0（完全分類）なら期待ビジネスインパクトはTP×revenueTPのみ", () => {
    const counts = { tp: 5, fp: 0, tn: 10, fn: 0 };
    expect(businessValueOf(counts, 100, 999, 999)).toBe(500);
  });
});

describe("argmaxIndex / normalizeToUnit", () => {
  it("最大値のindexを返す", () => {
    expect(argmaxIndex([3, 7, 2, 7], (v) => v)).toBe(1);
  });

  it("空配列は0を返す", () => {
    expect(argmaxIndex([] as number[], (v) => v)).toBe(0);
  });

  it("min-max正規化で最小0・最大1になる", () => {
    const norm = normalizeToUnit([2, 4, 10]);
    expect(norm[0]).toBeCloseTo(0, 6);
    expect(norm[2]).toBeCloseTo(1, 6);
  });

  it("全要素が同値なら0.5を返す（0除算を避ける）", () => {
    expect(normalizeToUnit([5, 5, 5])).toEqual([0.5, 0.5, 0.5]);
  });
});

describe("sweepThresholds: 技術指標（正解率）とビジネスKPI（期待利益）は別のしきい値で最大化される", () => {
  const customers = generateCustomers(20260719);
  // «見逃しの機会損失» が «誤報の無駄コスト» よりずっと大きい非対称なコスト構造
  // （詳細_第1章 §1.6 のクーポン施策と同じ非対称性）。
  const REVENUE_TP = 6000;
  const COST_FP = 800;
  const COST_FN = 4500;

  it("正解率カーブとビジネスインパクトカーブのargmaxしきい値が異なる", () => {
    const points = sweepThresholds(customers, REVENUE_TP, COST_FP, COST_FN);
    const bestAccIdx = argmaxIndex(points, (p) => p.accuracy);
    const bestBizIdx = argmaxIndex(points, (p) => p.businessValue);
    expect(points[bestAccIdx].threshold).not.toBeCloseTo(points[bestBizIdx].threshold, 2);
    // ビジネス最適しきい値は正解率最適しきい値より低い（見逃しコストが高いので «疑わしきは陽性» 側に倒す）。
    expect(points[bestBizIdx].threshold).toBeLessThan(points[bestAccIdx].threshold);
  });

  it("しきい値を動かすとFP・FNの構成が変わり、期待ビジネスインパクトも変化する", () => {
    const low = businessValueOf(confusionAt(customers, 0.2), REVENUE_TP, COST_FP, COST_FN);
    const high = businessValueOf(confusionAt(customers, 0.8), REVENUE_TP, COST_FP, COST_FN);
    expect(low).not.toBe(high);
  });
});

describe("decomposeRevenue / factorSensitivity", () => {
  const factors = { traffic: 50000, conversionRate: 0.02, aov: 8000 };

  it("売上はトラフィック×転換率×客単価", () => {
    expect(decomposeRevenue(factors)).toBeCloseTo(50000 * 0.02 * 8000, 6);
  });

  it("乗法分解では、単一要素の相対deltaPct%変化が売上のdeltaPct%変化にそのまま一致する（どの要素でも対称）", () => {
    for (const factor of ["traffic", "conversionRate", "aov"] as const) {
      const s = factorSensitivity(factors, factor, 10);
      expect(s.revenueDeltaPct).toBeCloseTo(10, 6);
    }
    for (const factor of ["traffic", "conversionRate", "aov"] as const) {
      const s = factorSensitivity(factors, factor, -5);
      expect(s.revenueDeltaPct).toBeCloseTo(-5, 6);
    }
  });

  it("deltaPct=0なら売上は変化しない", () => {
    const s = factorSensitivity(factors, "aov", 0);
    expect(s.revenueDeltaPct).toBeCloseTo(0, 6);
    expect(s.after).toBe(s.before);
  });
});

describe("makeLcg", () => {
  it("同じseedなら同じ数列を返す（決定的）", () => {
    const rng1 = makeLcg(42);
    const rng2 = makeLcg(42);
    const seq1 = Array.from({ length: 5 }, () => rng1());
    const seq2 = Array.from({ length: 5 }, () => rng2());
    expect(seq1).toEqual(seq2);
  });

  it("生成値は0〜1の範囲", () => {
    const rng = makeLcg(7);
    for (let i = 0; i < 20; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
