import { describe, expect, it } from "vitest";
import { buildForecastFrames, evalSeries } from "./frames";
import { rmse, trainTestSplit } from "@/lib/stats/forecasting";

describe("buildForecastFrames", () => {
  const frames = buildForecastFrames();

  it("split → naive/mean/drift/es の5フレーム", () => {
    expect(frames).toHaveLength(5);
    expect(frames.map((f) => f.payload?.method)).toEqual(["split", "naive", "mean", "drift", "es"]);
  });

  it("分割フレームは予測なし、以降は検証長の予測を持つ", () => {
    expect(frames[0].payload?.pred).toBeNull();
    const { test } = trainTestSplit(evalSeries(), 0.75);
    for (let i = 1; i < frames.length; i++) {
      expect(frames[i].payload?.pred).toHaveLength(test.length);
    }
  });

  it("scores が1手法ずつ積み上がる", () => {
    expect(frames[0].payload?.scores).toHaveLength(0);
    expect(frames[1].payload?.scores).toHaveLength(1);
    expect(frames[4].payload?.scores).toHaveLength(4);
  });

  it("トレンド系列ではドリフトが平均予測より当たる（RMSE小）", () => {
    const scores = frames[4].payload!.scores;
    const drift = scores.find((s) => s.key === "drift")!.rmse;
    const mean = scores.find((s) => s.key === "mean")!.rmse;
    expect(drift).toBeLessThan(mean);
  });

  it("RMSE は payload と再計算が一致", () => {
    const { test } = trainTestSplit(evalSeries(), 0.75);
    const naive = frames[1].payload!;
    expect(naive.rmse).toBeCloseTo(rmse(test, naive.pred!), 10);
  });

  it("各フレームにコールアウトとハイライト", () => {
    frames.forEach((f) => {
      expect((f.callout?.title ?? "").length).toBeGreaterThan(0);
      expect((f.highlights ?? []).length).toBeGreaterThan(0);
    });
  });
});
