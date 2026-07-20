import { describe, expect, it } from "vitest";
import {
  allMetricsOf,
  FIXED_MODEL,
  generateMetricPoints,
  maeOf,
  makeLcg,
  makeOutlier,
  mapeOf,
  metricRatios,
  mseOf,
  N_POINTS,
  pointErrorOf,
  pointErrorsOf,
  predictedOf,
  pseudoGaussian,
  rmseOf,
  rmsleOf,
} from "./regression-metrics";

describe("predictedOf", () => {
  it("固定モデル slope・x+intercept を計算する", () => {
    expect(predictedOf(10, { slope: 2, intercept: 3 })).toBe(23);
    expect(predictedOf(0, FIXED_MODEL)).toBe(FIXED_MODEL.intercept);
  });
});

describe("generateMetricPoints", () => {
  it("N_POINTS件を決定的に生成する(同じseedで同じ結果)", () => {
    const a = generateMetricPoints(20260720);
    const b = generateMetricPoints(20260720);
    expect(a).toEqual(b);
    expect(a.length).toBe(N_POINTS);
  });

  it("異なるseedでは異なる結果になる", () => {
    const a = generateMetricPoints(1);
    const b = generateMetricPoints(2);
    expect(a).not.toEqual(b);
  });

  it("yはすべて正の値(来店者数)にとどまる", () => {
    for (const seed of [1, 2, 3, 20260720]) {
      const points = generateMetricPoints(seed);
      for (const p of points) {
        expect(p.y).toBeGreaterThan(0);
      }
    }
  });

  it("xは指定件数ぶん昇順に並ぶ", () => {
    const points = generateMetricPoints(20260720);
    for (let i = 1; i < points.length; i++) {
      expect(points[i].x).toBeGreaterThan(points[i - 1].x);
    }
  });
});

describe("pointErrorOf", () => {
  it("残差・絶対誤差・二乗誤差を正しく計算する", () => {
    const e = pointErrorOf({ x: 10, y: 30 }, { slope: 2, intercept: 5 });
    // predicted = 2*10+5 = 25, residual = 30-25 = 5
    expect(e.predicted).toBe(25);
    expect(e.residual).toBe(5);
    expect(e.absError).toBe(5);
    expect(e.sqError).toBe(25);
  });

  it("パーセント誤差は|残差|/|実測値|*100", () => {
    const e = pointErrorOf({ x: 10, y: 50 }, { slope: 2, intercept: 5 });
    // predicted=25, residual=25, pct = 25/50*100 = 50
    expect(e.pctError).toBeCloseTo(50, 6);
  });

  it("実測値がほぼ0のときpctErrorはnull", () => {
    const e = pointErrorOf({ x: 0, y: 0 }, { slope: 0, intercept: 0 });
    expect(e.pctError).toBeNull();
  });

  it("logSqErrorはlog1pの差の二乗", () => {
    const e = pointErrorOf({ x: 0, y: Math.E - 1 }, { slope: 0, intercept: Math.E * Math.E - 1 });
    // predicted = e^2-1, actual = e-1 => log1p(predicted)=2, log1p(actual)=1 => diff^2=1
    expect(e.logSqError).toBeCloseTo(1, 6);
  });

  it("実測・予測が-1以下のときlogSqErrorはnull", () => {
    const e = pointErrorOf({ x: 0, y: -2 }, { slope: 0, intercept: 0 });
    expect(e.logSqError).toBeNull();
  });
});

describe("maeOf / mseOf / rmseOf", () => {
  const points = [
    { x: 0, y: 10 },
    { x: 1, y: 8 },
    { x: 2, y: 14 },
  ];
  const model = { slope: 0, intercept: 10 }; // predicted は常に10

  it("MAEは絶対誤差の平均", () => {
    // residuals: 0, -2, 4 -> |e|: 0,2,4 -> mean=2
    expect(maeOf(points, model)).toBeCloseTo(2, 6);
  });

  it("MSEは二乗誤差の平均、RMSEはその平方根", () => {
    // sqErrors: 0,4,16 -> mean=20/3
    expect(mseOf(points, model)).toBeCloseTo(20 / 3, 6);
    expect(rmseOf(points, model)).toBeCloseTo(Math.sqrt(20 / 3), 6);
  });

  it("常にRMSE >= MAE(二乗平均平方根 >= 絶対値平均、Jensenの不等式)", () => {
    const random = generateMetricPoints(999);
    expect(rmseOf(random)).toBeGreaterThanOrEqual(maeOf(random) - 1e-9);
  });
});

describe("mapeOf / rmsleOf", () => {
  it("MAPEは%表示のスケール", () => {
    const points = [
      { x: 0, y: 100 },
      { x: 1, y: 200 },
    ];
    const model = { slope: 0, intercept: 90 }; // predicted=90 常に
    // pct: |100-90|/100*100=10, |200-90|/200*100=55 -> mean=32.5
    expect(mapeOf(points, model)).toBeCloseTo(32.5, 6);
  });

  it("RMSLEは非負", () => {
    const random = generateMetricPoints(20260720);
    expect(rmsleOf(random)).toBeGreaterThanOrEqual(0);
  });

  it("完全一致(残差0)ならすべての指標が0", () => {
    const points = [
      { x: 0, y: 10 },
      { x: 1, y: 12 },
    ];
    const model = { slope: 2, intercept: 10 };
    expect(maeOf(points, model)).toBeCloseTo(0, 9);
    expect(mseOf(points, model)).toBeCloseTo(0, 9);
    expect(rmseOf(points, model)).toBeCloseTo(0, 9);
    expect(mapeOf(points, model)).toBeCloseTo(0, 9);
    expect(rmsleOf(points, model)).toBeCloseTo(0, 9);
  });
});

describe("外れ値への感度: MSE/RMSEはMAEより敏感に反応する", () => {
  it("1点を大きく外れ値化すると、MSE/RMSEの増加率はMAEの増加率より大きい", () => {
    const base = generateMetricPoints(20260720);
    const before = allMetricsOf(base);
    const outlierIndex = base.length - 1;
    const after = allMetricsOf(makeOutlier(base, outlierIndex, 60));

    const maeRatio = after.mae / before.mae;
    const mseRatio = after.mse / before.mse;
    const rmseRatio = after.rmse / before.rmse;

    expect(mseRatio).toBeGreaterThan(maeRatio);
    expect(rmseRatio).toBeGreaterThan(maeRatio);
  });

  it("makeOutlierは指定indexの点だけyを動かし、他は変えない(純関数・非破壊)", () => {
    const base = generateMetricPoints(20260720);
    const next = makeOutlier(base, 0, 100);
    expect(next).not.toBe(base);
    expect(next[0].y).toBeCloseTo(base[0].y + 100, 9);
    expect(next[0].x).toBe(base[0].x);
    for (let i = 1; i < base.length; i++) {
      expect(next[i]).toEqual(base[i]);
    }
    // 元の配列は変更されない
    expect(base[0].y).not.toBeCloseTo(base[0].y + 100, 9);
  });
});

describe("metricRatios", () => {
  it("baselineに対する比率を計算する", () => {
    const baseline = { mae: 2, mse: 4, rmse: 2, mape: 10, rmsle: 0.5 };
    const current = { mae: 4, mse: 16, rmse: 4, mape: 20, rmsle: 1 };
    const ratios = metricRatios(current, baseline);
    expect(ratios.mae).toBeCloseTo(2, 9);
    expect(ratios.mse).toBeCloseTo(4, 9);
    expect(ratios.rmse).toBeCloseTo(2, 9);
  });

  it("baselineがほぼ0ならnull", () => {
    const baseline = { mae: 0, mse: 4, rmse: 2, mape: 10, rmsle: 0.5 };
    const current = { mae: 5, mse: 16, rmse: 4, mape: 20, rmsle: 1 };
    expect(metricRatios(current, baseline).mae).toBeNull();
  });
});

describe("pointErrorsOf", () => {
  it("各点の誤差配列を返す(点数と一致)", () => {
    const points = generateMetricPoints(20260720);
    expect(pointErrorsOf(points).length).toBe(points.length);
  });
});

describe("makeLcg / pseudoGaussian", () => {
  it("同じseedなら同じ数列を返す(決定的)", () => {
    const rng1 = makeLcg(42);
    const rng2 = makeLcg(42);
    const seq1 = Array.from({ length: 5 }, () => rng1());
    const seq2 = Array.from({ length: 5 }, () => rng2());
    expect(seq1).toEqual(seq2);
  });

  it("pseudoGaussianはおおむね-1.5〜1.5の範囲", () => {
    const rng = makeLcg(7);
    for (let i = 0; i < 50; i++) {
      const v = pseudoGaussian(rng);
      expect(v).toBeGreaterThanOrEqual(-1.5);
      expect(v).toBeLessThanOrEqual(1.5);
    }
  });
});
