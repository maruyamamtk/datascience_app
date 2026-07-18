import { describe, expect, it } from "vitest";
import {
  accuracy,
  type ClassGaussianParams,
  clamp01,
  confidenceEllipse,
  decisionBoundaryGrid,
  euclideanDistance,
  fitGaussianNB,
  gaussianPdf,
  generateGaussianClassData,
  kNearestNeighbors,
  knnPredict,
  makeLcg,
  naiveBayesPredict,
  naiveBayesPredictLabel,
  type Point2D,
  pseudoGaussian,
  sortByDistance,
} from "./naive-bayes-knn";

const PARAMS: Record<0 | 1, ClassGaussianParams> = {
  0: { mean1: 0.3, mean2: 0.32, sd1: 0.1, sd2: 0.12 },
  1: { mean1: 0.68, mean2: 0.64, sd1: 0.13, sd2: 0.11 },
};

describe("makeLcg / pseudoGaussian", () => {
  it("同じシードからは常に同じ列を返す（決定的）", () => {
    const a = makeLcg(42);
    const b = makeLcg(42);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("[0,1) の範囲に収まる", () => {
    const rng = makeLcg(7);
    for (let i = 0; i < 200; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("pseudoGaussianはおおむね0付近に分布する（平均が0に近い）", () => {
    const rng = makeLcg(123);
    const n = 5000;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += pseudoGaussian(rng);
    expect(Math.abs(sum / n)).toBeLessThan(0.05);
  });
});

describe("clamp01", () => {
  it("範囲内はそのまま、範囲外は端に丸める", () => {
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(-0.2)).toBe(0);
    expect(clamp01(1.4)).toBe(1);
  });
});

describe("generateGaussianClassData", () => {
  it("nPerClass×2 個の点を生成し、ラベルが半々", () => {
    const pts = generateGaussianClassData(20, 999, PARAMS);
    expect(pts.length).toBe(40);
    expect(pts.filter((p) => p.label === 0).length).toBe(20);
    expect(pts.filter((p) => p.label === 1).length).toBe(20);
  });

  it("全ての点が[0,1]²に収まる", () => {
    const pts = generateGaussianClassData(50, 555, PARAMS);
    for (const p of pts) {
      expect(p.x1).toBeGreaterThanOrEqual(0);
      expect(p.x1).toBeLessThanOrEqual(1);
      expect(p.x2).toBeGreaterThanOrEqual(0);
      expect(p.x2).toBeLessThanOrEqual(1);
    }
  });

  it("同じシードなら同じデータを再現する", () => {
    const a = generateGaussianClassData(10, 2026, PARAMS);
    const b = generateGaussianClassData(10, 2026, PARAMS);
    expect(a).toEqual(b);
  });
});

describe("gaussianPdf", () => {
  it("平均で最大値を取る", () => {
    const atMean = gaussianPdf(0.5, 0.5, 0.1);
    const offMean = gaussianPdf(0.6, 0.5, 0.1);
    expect(atMean).toBeGreaterThan(offMean);
  });

  it("平均を中心に左右対称", () => {
    const left = gaussianPdf(0.4, 0.5, 0.1);
    const right = gaussianPdf(0.6, 0.5, 0.1);
    expect(left).toBeCloseTo(right, 10);
  });

  it("標準正規分布のピーク値は1/√(2π)に一致", () => {
    expect(gaussianPdf(0, 0, 1)).toBeCloseTo(1 / Math.sqrt(2 * Math.PI), 10);
  });
});

describe("fitGaussianNB", () => {
  it("生成時のパラメータに近い平均・標準偏差を推定する（大標本）", () => {
    const pts = generateGaussianClassData(3000, 20260401, PARAMS);
    const stats = fitGaussianNB(pts);
    const c0 = stats.find((s) => s.label === 0)!;
    const c1 = stats.find((s) => s.label === 1)!;
    expect(c0.mean1).toBeCloseTo(PARAMS[0].mean1, 1);
    expect(c0.mean2).toBeCloseTo(PARAMS[0].mean2, 1);
    expect(c1.mean1).toBeCloseTo(PARAMS[1].mean1, 1);
    expect(c0.prior).toBeCloseTo(0.5, 5);
  });

  it("クラスごとのn・priorは点数と一致する", () => {
    const pts = generateGaussianClassData(15, 1, PARAMS);
    const stats = fitGaussianNB(pts);
    for (const s of stats) {
      expect(s.n).toBe(15);
      expect(s.prior).toBeCloseTo(0.5, 10);
    }
  });
});

describe("naiveBayesPredict", () => {
  const pts = generateGaussianClassData(200, 2026, PARAMS);
  const stats = fitGaussianNB(pts);

  it("クラス0の平均そのものはクラス0と予測される", () => {
    const pred = naiveBayesPredict(stats, PARAMS[0].mean1, PARAMS[0].mean2);
    expect(pred.label).toBe(0);
    expect(pred.posterior[0]).toBeGreaterThan(0.5);
  });

  it("クラス1の平均そのものはクラス1と予測される", () => {
    const pred = naiveBayesPredict(stats, PARAMS[1].mean1, PARAMS[1].mean2);
    expect(pred.label).toBe(1);
    expect(pred.posterior[1]).toBeGreaterThan(0.5);
  });

  it("事後確率は合計1に正規化される", () => {
    const pred = naiveBayesPredict(stats, 0.5, 0.5);
    expect(pred.posterior[0] + pred.posterior[1]).toBeCloseTo(1, 10);
  });

  it("naiveBayesPredictLabelはnaiveBayesPredictのlabelと一致する", () => {
    const x1 = 0.45;
    const x2 = 0.4;
    expect(naiveBayesPredictLabel(stats, x1, x2)).toBe(naiveBayesPredict(stats, x1, x2).label);
  });

  it("両クラスが揃っていないとエラー", () => {
    expect(() => naiveBayesPredict([stats[0]], 0.5, 0.5)).toThrow();
  });
});

describe("confidenceEllipse", () => {
  it("中心=平均、半径=kSigma×標準偏差", () => {
    const stats = fitGaussianNB(generateGaussianClassData(100, 3, PARAMS))[0];
    const e = confidenceEllipse(stats, 2);
    expect(e.cx).toBe(stats.mean1);
    expect(e.cy).toBe(stats.mean2);
    expect(e.rx).toBeCloseTo(stats.sd1 * 2, 10);
    expect(e.ry).toBeCloseTo(stats.sd2 * 2, 10);
  });
});

describe("euclideanDistance", () => {
  it("3-4-5の直角三角形で距離5", () => {
    expect(euclideanDistance({ x1: 0, x2: 0 }, { x1: 3, x2: 4 })).toBeCloseTo(5, 10);
  });

  it("同じ点なら距離0", () => {
    expect(euclideanDistance({ x1: 0.3, x2: 0.7 }, { x1: 0.3, x2: 0.7 })).toBe(0);
  });
});

describe("sortByDistance", () => {
  const points: Point2D[] = [
    { x1: 0.9, x2: 0.9, label: 1 },
    { x1: 0.1, x2: 0.1, label: 0 },
    { x1: 0.5, x2: 0.5, label: 0 },
  ];

  it("距離昇順に並び、全点を含む", () => {
    const sorted = sortByDistance(points, { x1: 0, x2: 0 });
    expect(sorted.length).toBe(3);
    expect(sorted[0].point).toEqual({ x1: 0.1, x2: 0.1, label: 0 });
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].dist).toBeGreaterThanOrEqual(sorted[i - 1].dist);
    }
  });
});

describe("kNearestNeighbors / knnPredict", () => {
  const points: Point2D[] = [
    { x1: 0.1, x2: 0.1, label: 0 },
    { x1: 0.12, x2: 0.12, label: 0 },
    { x1: 0.15, x2: 0.1, label: 0 },
    { x1: 0.9, x2: 0.9, label: 1 },
    { x1: 0.88, x2: 0.9, label: 1 },
  ];

  it("k個ちょうどの近傍を返す", () => {
    const nn = kNearestNeighbors(points, { x1: 0, x2: 0 }, 3);
    expect(nn.length).toBe(3);
    expect(nn.every((n) => n.point.label === 0)).toBe(true);
  });

  it("kが点数を超えると全点を返す", () => {
    const nn = kNearestNeighbors(points, { x1: 0, x2: 0 }, 100);
    expect(nn.length).toBe(points.length);
  });

  it("多数決で近傍が全員同じラベルならそのラベルを予測", () => {
    const pred = knnPredict(points, { x1: 0.9, x2: 0.9 }, 2);
    expect(pred.label).toBe(1);
    expect(pred.voteFraction).toBe(1);
  });

  it("同数（タイ）のときはラベル1を選ぶ取り決め", () => {
    const tiePoints: Point2D[] = [
      { x1: 0, x2: 0, label: 0 },
      { x1: 0.01, x2: 0, label: 1 },
    ];
    const pred = knnPredict(tiePoints, { x1: 0, x2: 0 }, 2);
    expect(pred.voteFraction).toBe(0.5);
    expect(pred.label).toBe(1);
  });

  it("近傍0件（空データ）はvoteFraction=0.5", () => {
    const pred = knnPredict([], { x1: 0.5, x2: 0.5 }, 3);
    expect(pred.voteFraction).toBe(0.5);
    expect(pred.neighbors.length).toBe(0);
  });
});

describe("decisionBoundaryGrid", () => {
  it("resolution×resolution個のセルを、[0,1]²内の座標で返す", () => {
    const cells = decisionBoundaryGrid((x1) => (x1 > 0.5 ? 1 : 0), 10);
    expect(cells.length).toBe(100);
    for (const c of cells) {
      expect(c.x1).toBeGreaterThan(0);
      expect(c.x1).toBeLessThan(1);
      expect(c.x2).toBeGreaterThan(0);
      expect(c.x2).toBeLessThan(1);
    }
  });

  it("predictFnの結果をそのままラベルとして反映する", () => {
    const cells = decisionBoundaryGrid((x1) => (x1 > 0.5 ? 1 : 0), 4);
    for (const c of cells) {
      expect(c.label).toBe(c.x1 > 0.5 ? 1 : 0);
    }
  });
});

describe("accuracy", () => {
  it("完全に当たる予測器は正解率1", () => {
    const pts: Point2D[] = [
      { x1: 0.1, x2: 0.1, label: 0 },
      { x1: 0.9, x2: 0.9, label: 1 },
    ];
    expect(accuracy(pts, (x1) => (x1 > 0.5 ? 1 : 0))).toBe(1);
  });

  it("常に外す予測器は正解率0", () => {
    const pts: Point2D[] = [
      { x1: 0.1, x2: 0.1, label: 0 },
      { x1: 0.9, x2: 0.9, label: 1 },
    ];
    expect(accuracy(pts, (x1) => (x1 > 0.5 ? 0 : 1))).toBe(0);
  });

  it("空配列はNaN", () => {
    expect(Number.isNaN(accuracy([], () => 0))).toBe(true);
  });
});
