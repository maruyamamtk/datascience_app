import { describe, expect, it } from "vitest";
import { allMetricsOf, FIXED_MODEL, generateMetricPoints, N_POINTS } from "@/lib/stats/regression-metrics";
import { buildMetricsFrames } from "./frames";

describe("buildMetricsFrames", () => {
  const points = generateMetricPoints(20260720);
  const frames = buildMetricsFrames(points, FIXED_MODEL);

  it("overview(1)+各点(N_POINTS)+summary(1)のフレーム数になる", () => {
    expect(frames.length).toBe(N_POINTS + 2);
    expect(points.length).toBe(N_POINTS);
  });

  it("先頭フレームはoverviewでprocessedCount=0", () => {
    expect(frames[0].payload?.step).toBe("overview");
    expect(frames[0].payload?.processedCount).toBe(0);
  });

  it("中間フレームはpointで、highlightsに該当pointのkeyを含み、processedCountが1ずつ増える", () => {
    for (let i = 0; i < points.length; i++) {
      const f = frames[i + 1];
      expect(f.payload?.step).toBe("point");
      expect(f.payload?.pointIndex).toBe(i);
      expect(f.payload?.processedCount).toBe(i + 1);
      expect(f.highlights).toEqual([`point-${i}`]);
    }
  });

  it("最終フレームはsummaryで、finalMetricsがallMetricsOfの結果と一致する", () => {
    const last = frames[frames.length - 1];
    expect(last.payload?.step).toBe("summary");
    expect(last.payload?.processedCount).toBe(points.length);
    const expected = allMetricsOf(points, FIXED_MODEL);
    expect(last.payload?.finalMetrics?.mae).toBeCloseTo(expected.mae, 9);
    expect(last.payload?.finalMetrics?.mse).toBeCloseTo(expected.mse, 9);
    expect(last.payload?.finalMetrics?.rmse).toBeCloseTo(expected.rmse, 9);
    expect(last.payload?.finalMetrics?.mape).toBeCloseTo(expected.mape, 9);
    expect(last.payload?.finalMetrics?.rmsle).toBeCloseTo(expected.rmsle, 9);
  });

  it("最終pointフレームのrunningMetricsは全点の最終指標と一致する(積み上げの終点=全体平均)", () => {
    const lastPointFrame = frames[points.length];
    const expected = allMetricsOf(points, FIXED_MODEL);
    expect(lastPointFrame.payload?.runningMetrics?.mae).toBeCloseTo(expected.mae, 9);
    expect(lastPointFrame.payload?.runningMetrics?.mse).toBeCloseTo(expected.mse, 9);
    expect(lastPointFrame.payload?.runningMetrics?.rmse).toBeCloseTo(expected.rmse, 9);
  });

  it("1点目のrunningMetrics.maeはその点のabsErrorそのもの(積み上げの起点)", () => {
    const firstPointFrame = frames[1];
    expect(firstPointFrame.payload?.runningMetrics?.mae).toBeCloseTo(firstPointFrame.payload?.error?.absError ?? NaN, 9);
  });

  it("最後のフレームのhighlightsは全点のkeyを含む", () => {
    const last = frames[frames.length - 1];
    for (let i = 0; i < points.length; i++) {
      expect(last.highlights).toContain(`point-${i}`);
    }
  });
});
