import { describe, expect, it } from "vitest";
import {
  accuracyOf,
  averageOf,
  CLASS_LABELS,
  colTotal,
  CONFUSION_MATRIX,
  macroAverageOf,
  microAverageOf,
  oneVsRestCounts,
  perClassMetricsOf,
  rowTotal,
  totalCount,
  weightedAverageOf,
  type ConfusionMatrixNxN,
} from "./multiclass-metrics";

describe("totalCount / rowTotal / colTotal", () => {
  it("CONFUSION_MATRIXは全100件、行合計60/30/10", () => {
    expect(totalCount(CONFUSION_MATRIX)).toBe(100);
    expect(rowTotal(CONFUSION_MATRIX, 0)).toBe(60);
    expect(rowTotal(CONFUSION_MATRIX, 1)).toBe(30);
    expect(rowTotal(CONFUSION_MATRIX, 2)).toBe(10);
  });

  it("列合計の総和も全体数と一致する", () => {
    const sum = CLASS_LABELS.reduce((a, _, k) => a + colTotal(CONFUSION_MATRIX, k), 0);
    expect(sum).toBe(totalCount(CONFUSION_MATRIX));
  });
});

describe("oneVsRestCounts", () => {
  it("クラス0(スポーツ): TP=54,FP=8,FN=6,TN=32", () => {
    expect(oneVsRestCounts(CONFUSION_MATRIX, 0)).toEqual({ tp: 54, fp: 8, fn: 6, tn: 32 });
  });

  it("クラス1(政治): TP=20,FP=8,FN=10,TN=62", () => {
    expect(oneVsRestCounts(CONFUSION_MATRIX, 1)).toEqual({ tp: 20, fp: 8, fn: 10, tn: 62 });
  });

  it("クラス2(エンタメ): TP=3,FP=7,FN=7,TN=83", () => {
    expect(oneVsRestCounts(CONFUSION_MATRIX, 2)).toEqual({ tp: 3, fp: 7, fn: 7, tn: 83 });
  });

  it("各クラスのtp+fp+fn+tnは常に全体数と一致する", () => {
    for (let k = 0; k < CLASS_LABELS.length; k++) {
      const c = oneVsRestCounts(CONFUSION_MATRIX, k);
      expect(c.tp + c.fp + c.fn + c.tn).toBe(totalCount(CONFUSION_MATRIX));
    }
  });
});

describe("perClassMetricsOf", () => {
  const perClass = perClassMetricsOf(CONFUSION_MATRIX, CLASS_LABELS);

  it("3クラス分のprecision/recall/f1を計算する", () => {
    expect(perClass).toHaveLength(3);
    expect(perClass[0].precision).toBeCloseTo(54 / 62, 9);
    expect(perClass[0].recall).toBeCloseTo(54 / 60, 9);
    expect(perClass[1].precision).toBeCloseTo(20 / 28, 9);
    expect(perClass[1].recall).toBeCloseTo(20 / 30, 9);
    expect(perClass[2].precision).toBeCloseTo(0.3, 9);
    expect(perClass[2].recall).toBeCloseTo(0.3, 9);
  });

  it("supportはそのクラスの行合計(実際のサンプル数)と一致する", () => {
    expect(perClass.map((c) => c.support)).toEqual([60, 30, 10]);
  });
});

describe("accuracyOf", () => {
  it("対角成分の和/全体 = 77/100", () => {
    expect(accuracyOf(CONFUSION_MATRIX)).toBeCloseTo(0.77, 9);
  });

  it("全体0件はNaN", () => {
    const empty: ConfusionMatrixNxN = [[0]];
    expect(Number.isNaN(accuracyOf(empty))).toBe(true);
  });
});

describe("macroAverageOf / weightedAverageOf / microAverageOf", () => {
  const perClass = perClassMetricsOf(CONFUSION_MATRIX, CLASS_LABELS);

  it("macro平均は各クラスの単純平均(少数派クラスの低い値に強く引っ張られる)", () => {
    const macro = macroAverageOf(perClass);
    expect(macro.precision).toBeCloseTo(0.6284, 3);
    expect(macro.recall).toBeCloseTo(0.6222, 3);
    expect(macro.f1).toBeCloseTo(0.625, 3);
  });

  it("weighted平均はサンプル数で重み付けた平均で、多数派クラスに引っ張られる", () => {
    const weighted = weightedAverageOf(perClass);
    expect(weighted.precision).toBeCloseTo(0.7669, 3);
    expect(weighted.recall).toBeCloseTo(0.77, 3);
    expect(weighted.f1).toBeCloseTo(0.768, 3);
  });

  it("micro平均はTP/FP/FNを合算してから1回だけ計算する", () => {
    const micro = microAverageOf(perClass);
    expect(micro.precision).toBeCloseTo(0.77, 9);
    expect(micro.recall).toBeCloseTo(0.77, 9);
    expect(micro.f1).toBeCloseTo(0.77, 9);
  });

  it("クラス不均衡があるとMacroはMicro/Weightedより大きく低くなる(乖離が体感できる)", () => {
    const macro = macroAverageOf(perClass);
    const micro = microAverageOf(perClass);
    expect(micro.f1! - macro.f1!).toBeGreaterThan(0.1);
  });

  it("恒等式: 単一ラベル多クラス分類ではMicro precision=Micro recall=Micro F1=正解率が常に成り立つ", () => {
    // ΣFP_k = ΣFN_k = N-ΣTP_k(列合計の総和=行合計の総和=N)という代数的な恒等式による。
    const micro = microAverageOf(perClass);
    const acc = accuracyOf(CONFUSION_MATRIX);
    expect(micro.precision).toBeCloseTo(acc, 9);
    expect(micro.recall).toBeCloseTo(acc, 9);
    expect(micro.f1).toBeCloseTo(acc, 9);
  });

  it("恒等式: Weighted recallも常に正解率と一致する(Σ(n_k/N)·TP_k/n_k=ΣTP_k/N)", () => {
    const weighted = weightedAverageOf(perClass);
    const acc = accuracyOf(CONFUSION_MATRIX);
    expect(weighted.recall).toBeCloseTo(acc, 9);
  });

  it("averageOf: methodを指定してmacro/micro/weightedを切り替えられる", () => {
    expect(averageOf(perClass, "macro")).toEqual(macroAverageOf(perClass));
    expect(averageOf(perClass, "micro")).toEqual(microAverageOf(perClass));
    expect(averageOf(perClass, "weighted")).toEqual(weightedAverageOf(perClass));
  });
});

describe("恒等式は行列の中身によらず一般に成り立つ(別の混同行列でも検証)", () => {
  // 4クラス、非対称な列合計/行合計を持つ別の固定行列で頑健性を確認する。
  const matrix: ConfusionMatrixNxN = [
    [10, 2, 1, 0],
    [3, 15, 0, 2],
    [0, 4, 8, 1],
    [1, 1, 2, 6],
  ];
  const labels = ["A", "B", "C", "D"];
  const perClass = perClassMetricsOf(matrix, labels);

  it("Micro precision=Micro recall=正解率、Weighted recall=正解率", () => {
    const micro = microAverageOf(perClass);
    const weighted = weightedAverageOf(perClass);
    const acc = accuracyOf(matrix);
    expect(micro.precision).toBeCloseTo(acc, 9);
    expect(micro.recall).toBeCloseTo(acc, 9);
    expect(weighted.recall).toBeCloseTo(acc, 9);
  });

  it("ΣFP_k = ΣFN_k(列合計の総和=行合計の総和=Nという恒等式の根拠)", () => {
    const sumFp = perClass.reduce((a, c) => a + c.counts.fp, 0);
    const sumFn = perClass.reduce((a, c) => a + c.counts.fn, 0);
    expect(sumFp).toBe(sumFn);
  });
});
