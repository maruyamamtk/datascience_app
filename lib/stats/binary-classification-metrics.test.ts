import { describe, expect, it } from "vitest";
import {
  accuracyOf,
  aucOf,
  classificationMetricsAt,
  classifyByThreshold,
  confusionAt,
  costOptimalThreshold,
  DATA_SEED,
  f1Of,
  fprOf,
  generateSamples,
  histogramBins,
  makeLcg,
  N_NEGATIVE,
  N_POSITIVE,
  precisionOf,
  pseudoGaussian,
  recallOf,
  rocPointsOf,
  type Sample,
  tprOf,
} from "./binary-classification-metrics";

describe("classifyByThreshold", () => {
  it("スコア >= しきい値 なら陽性(1)", () => {
    expect(classifyByThreshold(0.5, 0.5)).toBe(1);
    expect(classifyByThreshold(0.6, 0.5)).toBe(1);
    expect(classifyByThreshold(0.4, 0.5)).toBe(0);
  });
});

describe("confusionAt", () => {
  const samples: Sample[] = [
    { id: 0, label: 1, score: 0.9 }, // TP (>=0.5)
    { id: 1, label: 1, score: 0.3 }, // FN (<0.5)
    { id: 2, label: 0, score: 0.8 }, // FP (>=0.5)
    { id: 3, label: 0, score: 0.1 }, // TN (<0.5)
  ];

  it("TP/FP/FN/TNを正しく数える", () => {
    const c = confusionAt(samples, 0.5);
    expect(c).toEqual({ tp: 1, fp: 1, tn: 1, fn: 1 });
  });

  it("しきい値=0なら全件陽性予測(TP=陽性数,FP=陰性数)", () => {
    const c = confusionAt(samples, 0);
    expect(c.tp).toBe(2);
    expect(c.fp).toBe(2);
    expect(c.tn).toBe(0);
    expect(c.fn).toBe(0);
  });

  it("しきい値>1なら全件陰性予測", () => {
    const c = confusionAt(samples, 1.01);
    expect(c.tp).toBe(0);
    expect(c.fp).toBe(0);
    expect(c.tn).toBe(2);
    expect(c.fn).toBe(2);
  });
});

describe("accuracy / precision / recall / f1", () => {
  it("accuracyOf: (TP+TN)/全体", () => {
    expect(accuracyOf({ tp: 3, fp: 1, tn: 4, fn: 2 })).toBeCloseTo(7 / 10, 9);
  });

  it("accuracyOf: 全体0件はNaN", () => {
    expect(Number.isNaN(accuracyOf({ tp: 0, fp: 0, tn: 0, fn: 0 }))).toBe(true);
  });

  it("precisionOf: TP/(TP+FP)、陽性予測0件はnull", () => {
    expect(precisionOf({ tp: 3, fp: 1, tn: 0, fn: 0 })).toBeCloseTo(0.75, 9);
    expect(precisionOf({ tp: 0, fp: 0, tn: 5, fn: 5 })).toBeNull();
  });

  it("recallOf: TP/(TP+FN)、実際の陽性0件はnull", () => {
    expect(recallOf({ tp: 3, fp: 0, tn: 0, fn: 1 })).toBeCloseTo(0.75, 9);
    expect(recallOf({ tp: 0, fp: 5, tn: 5, fn: 0 })).toBeNull();
  });

  it("f1Of: precisionとrecallの調和平均", () => {
    // precision=0.8, recall=0.4 -> f1 = 2*0.8*0.4/(0.8+0.4) = 0.5333...
    const c = { tp: 4, fp: 1, tn: 0, fn: 6 };
    expect(precisionOf(c)).toBeCloseTo(0.8, 9);
    expect(recallOf(c)).toBeCloseTo(0.4, 9);
    expect(f1Of(c)).toBeCloseTo((2 * 0.8 * 0.4) / (0.8 + 0.4), 9);
  });

  it("f1Of: precision/recallがnullならnull", () => {
    expect(f1Of({ tp: 0, fp: 0, tn: 5, fn: 5 })).toBeNull();
  });

  it("fprOf / tprOf", () => {
    const c = { tp: 3, fp: 2, tn: 8, fn: 1 };
    expect(fprOf(c)).toBeCloseTo(2 / 10, 9);
    expect(tprOf(c)).toBeCloseTo(3 / 4, 9);
  });
});

describe("classificationMetricsAt", () => {
  it("counts・accuracy・precision・recall・f1・fpr・tprをまとめて返す", () => {
    const samples: Sample[] = [
      { id: 0, label: 1, score: 0.9 },
      { id: 1, label: 1, score: 0.3 },
      { id: 2, label: 0, score: 0.8 },
      { id: 3, label: 0, score: 0.1 },
    ];
    const m = classificationMetricsAt(samples, 0.5);
    expect(m.counts).toEqual({ tp: 1, fp: 1, tn: 1, fn: 1 });
    expect(m.accuracy).toBeCloseTo(0.5, 9);
    expect(m.precision).toBeCloseTo(0.5, 9);
    expect(m.recall).toBeCloseTo(0.5, 9);
    expect(m.f1).toBeCloseTo(0.5, 9);
    expect(m.fpr).toBeCloseTo(0.5, 9);
    expect(m.tpr).toBeCloseTo(0.5, 9);
  });
});

describe("rocPointsOf / aucOf", () => {
  it("完全に分離できるデータはAUC=1(ROC曲線が(0,0)->(0,1)->(1,1)の階段)", () => {
    const samples: Sample[] = [
      { id: 0, label: 1, score: 0.9 },
      { id: 1, label: 1, score: 0.8 },
      { id: 2, label: 0, score: 0.2 },
      { id: 3, label: 0, score: 0.1 },
    ];
    const points = rocPointsOf(samples);
    expect(points[0]).toEqual({ fpr: 0, tpr: 0, threshold: 1 });
    expect(points.at(-1)).toMatchObject({ fpr: 1, tpr: 1 });
    expect(aucOf(points)).toBeCloseTo(1, 9);
  });

  it("完全に予測が逆(陰性の方がスコアが高い)データはAUC=0", () => {
    const samples: Sample[] = [
      { id: 0, label: 1, score: 0.1 },
      { id: 1, label: 1, score: 0.2 },
      { id: 2, label: 0, score: 0.8 },
      { id: 3, label: 0, score: 0.9 },
    ];
    const points = rocPointsOf(samples);
    expect(aucOf(points)).toBeCloseTo(0, 9);
  });

  it("concordant/discordantペアが半々ならAUC=0.5(Mann-WhitneyのU統計量としての解釈)", () => {
    // 陽性2件{0.9,0.1}・陰性2件{0.8,0.2}: (0.9,0.8)(0.9,0.2)は陽性が上位=concordant、
    // (0.1,0.8)(0.1,0.2)は陽性が下位=discordant -> concordant率=2/4=0.5。
    const samples: Sample[] = [
      { id: 0, label: 1, score: 0.9 },
      { id: 1, label: 1, score: 0.1 },
      { id: 2, label: 0, score: 0.8 },
      { id: 3, label: 0, score: 0.2 },
    ];
    const points = rocPointsOf(samples);
    expect(aucOf(points)).toBeCloseTo(0.5, 9);
  });

  it("fpr・tprは単調非減少(ROC曲線は右または上にしか進まない)", () => {
    const points = rocPointsOf(generateSamples());
    for (let i = 1; i < points.length; i++) {
      expect(points[i].fpr).toBeGreaterThanOrEqual(points[i - 1].fpr - 1e-9);
      expect(points[i].tpr).toBeGreaterThanOrEqual(points[i - 1].tpr - 1e-9);
    }
  });

  it("点列の数はサンプル数+1(先頭の(0,0)を含む)", () => {
    const samples = generateSamples();
    expect(rocPointsOf(samples).length).toBe(samples.length + 1);
  });
});

describe("generateSamples", () => {
  it("同じseedなら同じ結果(決定的)", () => {
    const a = generateSamples(DATA_SEED);
    const b = generateSamples(DATA_SEED);
    expect(a).toEqual(b);
  });

  it("異なるseedでは異なる結果になる", () => {
    const a = generateSamples(1);
    const b = generateSamples(2);
    expect(a).not.toEqual(b);
  });

  it("陽性・陰性の件数がnPositive/nNegativeと一致する", () => {
    const samples = generateSamples(DATA_SEED);
    expect(samples.filter((s) => s.label === 1).length).toBe(N_POSITIVE);
    expect(samples.filter((s) => s.label === 0).length).toBe(N_NEGATIVE);
  });

  it("スコアはすべて[0,1]の範囲に収まる", () => {
    for (const s of generateSamples(DATA_SEED)) {
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(1);
    }
  });

  it("陽性群の平均スコアは陰性群より高い(分布が重なりつつも分離傾向を持つ)", () => {
    const samples = generateSamples(DATA_SEED);
    const posMean = samples.filter((s) => s.label === 1).reduce((a, s) => a + s.score, 0) / N_POSITIVE;
    const negMean = samples.filter((s) => s.label === 0).reduce((a, s) => a + s.score, 0) / N_NEGATIVE;
    expect(posMean).toBeGreaterThan(negMean);
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

describe("costOptimalThreshold", () => {
  it("p*=C_FP/(C_FP+C_FN)", () => {
    expect(costOptimalThreshold(1000, 3000)).toBeCloseTo(0.25, 9);
    expect(costOptimalThreshold(1, 1)).toBeCloseTo(0.5, 9);
  });

  it("両コストが0なら既定0.5", () => {
    expect(costOptimalThreshold(0, 0)).toBe(0.5);
  });
});

describe("histogramBins", () => {
  it("スコアを等幅ビンへ振り分け、陽性/陰性を別集計する", () => {
    const samples: Sample[] = [
      { id: 0, label: 1, score: 0.05 },
      { id: 1, label: 1, score: 0.95 },
      { id: 2, label: 0, score: 0.15 },
      { id: 3, label: 0, score: 0.15 },
    ];
    const bins = histogramBins(samples, 10);
    expect(bins.length).toBe(10);
    expect(bins[0]).toMatchObject({ posCount: 1, negCount: 0 });
    expect(bins[1]).toMatchObject({ posCount: 0, negCount: 2 });
    expect(bins[9]).toMatchObject({ posCount: 1, negCount: 0 });
  });

  it("全ビンの合計件数はサンプル総数と一致する", () => {
    const samples = generateSamples();
    const bins = histogramBins(samples, 10);
    const total = bins.reduce((a, b) => a + b.posCount + b.negCount, 0);
    expect(total).toBe(samples.length);
  });
});
