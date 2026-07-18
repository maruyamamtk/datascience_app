import { describe, expect, it } from "vitest";
import { fitGaussianNB, generateGaussianClassData } from "@/lib/stats/naive-bayes-knn";
import { buildNaiveBayesFrames, NB_STEP_QUERY } from "./nb-frames";

const CLASS_STATS = fitGaussianNB(
  generateGaussianClassData(200, 2026, {
    0: { mean1: 0.3, mean2: 0.32, sd1: 0.11, sd2: 0.12 },
    1: { mean1: 0.68, mean2: 0.63, sd1: 0.14, sd2: 0.11 },
  }),
);

describe("buildNaiveBayesFrames", () => {
  it("5段階（事前・尤度x1・尤度x2・スコア・事後確率）のフレームを返す", () => {
    const frames = buildNaiveBayesFrames(CLASS_STATS, NB_STEP_QUERY);
    expect(frames.length).toBe(5);
    expect(frames.map((f) => f.payload?.stage)).toEqual(["prior", "likelihood1", "likelihood2", "score", "posterior"]);
  });

  it("全フレームで同じ予測結果（prediction）を共有する", () => {
    const frames = buildNaiveBayesFrames(CLASS_STATS, NB_STEP_QUERY);
    const first = frames[0].payload?.prediction;
    for (const f of frames) {
      expect(f.payload?.prediction).toEqual(first);
    }
  });

  it("最終フレーム（posterior）はkindがsupplementで、勝者クラスをハイライトする", () => {
    const frames = buildNaiveBayesFrames(CLASS_STATS, NB_STEP_QUERY);
    const last = frames[frames.length - 1];
    expect(last.callout?.kind).toBe("supplement");
    const winner = last.payload!.prediction.label;
    expect(last.highlights).toContain(winner === 0 ? "class0" : "class1");
  });

  it("最初のフレーム（事前確率）はどちらのクラスもハイライトしない", () => {
    const frames = buildNaiveBayesFrames(CLASS_STATS, NB_STEP_QUERY);
    expect(frames[0].highlights).toEqual([]);
  });

  it("事後確率フレームの合計は1に正規化される", () => {
    const frames = buildNaiveBayesFrames(CLASS_STATS, NB_STEP_QUERY);
    const posterior = frames[frames.length - 1].payload!.prediction.posterior;
    expect(posterior[0] + posterior[1]).toBeCloseTo(1, 10);
  });

  it("クエリ点を変えると予測結果も変わりうる", () => {
    const framesA = buildNaiveBayesFrames(CLASS_STATS, { x1: 0.3, x2: 0.32 });
    const framesB = buildNaiveBayesFrames(CLASS_STATS, { x1: 0.68, x2: 0.63 });
    expect(framesA[0].payload?.prediction.label).toBe(0);
    expect(framesB[0].payload?.prediction.label).toBe(1);
  });
});
