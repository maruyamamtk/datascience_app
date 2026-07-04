import { describe, expect, it } from "vitest";
import {
  exponentialSmoothing,
  forecastDrift,
  forecastES,
  forecastMean,
  forecastNaive,
  mae,
  mape,
  rmse,
  smoothingWeights,
  trainTestSplit,
} from "./forecasting";

describe("exponentialSmoothing", () => {
  it("長さ保存、ℓ_0=y_0", () => {
    const r = exponentialSmoothing([3, 5, 4, 6], 0.5);
    expect(r.level).toHaveLength(4);
    expect(r.level[0]).toBe(3);
    expect(r.oneStep[0]).toBe(3);
  });
  it("α=1 なら水準は観測に一致（直近だけ重視）", () => {
    const r = exponentialSmoothing([2, 7, 1, 9], 1);
    expect(r.level).toEqual([2, 7, 1, 9]);
  });
  it("定数列は平滑化しても定数", () => {
    const r = exponentialSmoothing([5, 5, 5, 5], 0.3);
    for (const l of r.level) expect(l).toBeCloseTo(5, 10);
  });
  it("ℓ_t = α y_t + (1-α) ℓ_{t-1}", () => {
    const r = exponentialSmoothing([10, 20], 0.4);
    expect(r.level[1]).toBeCloseTo(0.4 * 20 + 0.6 * 10, 10); // 14
  });
});

describe("smoothingWeights", () => {
  it("幾何級数 α(1-α)^j、合計は1に近づく", () => {
    const w = smoothingWeights(0.3, 50);
    expect(w[0]).toBeCloseTo(0.3, 10);
    expect(w[1]).toBeCloseTo(0.3 * 0.7, 10);
    const sum = w.reduce((a, b) => a + b, 0);
    expect(sum).toBeGreaterThan(0.99);
  });
});

describe("baseline forecasts", () => {
  const train = [2, 4, 6, 8, 10];
  it("naive は最後の値を繰り返す", () => {
    expect(forecastNaive(train, 3)).toEqual([10, 10, 10]);
  });
  it("mean は平均を繰り返す", () => {
    expect(forecastMean(train, 2)).toEqual([6, 6]);
  });
  it("drift は傾きで外挿（直線データを完全予測）", () => {
    expect(forecastDrift(train, 3)).toEqual([12, 14, 16]);
  });
  it("ES は最終水準を平坦に伸ばす", () => {
    const f = forecastES(train, 4, 0.5);
    expect(f).toHaveLength(4);
    expect(new Set(f).size).toBe(1); // 平坦
  });
});

describe("error metrics", () => {
  const actual = [10, 20, 30];
  const pred = [12, 18, 33];
  it("MAE = mean|誤差|", () => {
    expect(mae(actual, pred)).toBeCloseTo((2 + 2 + 3) / 3, 10);
  });
  it("RMSE = √mean誤差²、MAE以上", () => {
    const r = rmse(actual, pred);
    expect(r).toBeCloseTo(Math.sqrt((4 + 4 + 9) / 3), 10);
    expect(r).toBeGreaterThanOrEqual(mae(actual, pred));
  });
  it("MAPE は%、y=0を除外", () => {
    expect(mape([100, 200], [110, 180])).toBeCloseTo(((0.1 + 0.1) / 2) * 100, 10);
    expect(mape([0, 50], [5, 45])).toBeCloseTo(Math.abs((50 - 45) / 50) * 100, 10);
  });
  it("完全予測は全指標0", () => {
    expect(mae(actual, actual)).toBe(0);
    expect(rmse(actual, actual)).toBe(0);
    expect(mape(actual, actual)).toBe(0);
  });
});

describe("trainTestSplit", () => {
  it("時間順に分割、連結で元に戻る", () => {
    const s = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const { train, test } = trainTestSplit(s, 0.7);
    expect(train).toHaveLength(7);
    expect(test).toHaveLength(3);
    expect([...train, ...test]).toEqual(s);
  });
});
