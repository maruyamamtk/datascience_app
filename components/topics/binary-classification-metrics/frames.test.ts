import { describe, expect, it } from "vitest";
import { aucOf, generateSamples, N_NEGATIVE, N_POSITIVE, rocPointsOf } from "@/lib/stats/binary-classification-metrics";
import { buildRocFrames } from "./frames";

describe("buildRocFrames", () => {
  const samples = generateSamples();
  const frames = buildRocFrames(samples);
  const n = N_POSITIVE + N_NEGATIVE;

  it("overview(1)+各サンプル(n)+summary(1)のフレーム数になる", () => {
    expect(frames.length).toBe(n + 2);
    expect(samples.length).toBe(n);
  });

  it("先頭フレームはoverviewで、points=[(0,0)]のみ", () => {
    expect(frames[0].payload?.step).toBe("overview");
    expect(frames[0].payload?.points).toEqual([{ fpr: 0, tpr: 0, threshold: 1 }]);
    expect(frames[0].highlights).toEqual([]);
  });

  it("中間フレームはsampleで、highlightsにroc-point-iを含み、pointsが1つずつ伸びる", () => {
    for (let i = 1; i <= n; i++) {
      const f = frames[i];
      expect(f.payload?.step).toBe("sample");
      expect(f.highlights).toEqual([`roc-point-${i}`]);
      expect(f.payload?.points.length).toBe(i + 1);
      expect(f.payload?.sample).toBeDefined();
    }
  });

  it("最終フレームはsummaryで、finalAucがaucOf(全点)と一致する", () => {
    const last = frames[frames.length - 1];
    expect(last.payload?.step).toBe("summary");
    const expected = aucOf(rocPointsOf(samples));
    expect(last.payload?.finalAuc).toBeCloseTo(expected, 9);
    expect(last.payload?.cumulativeAuc).toBeCloseTo(expected, 9);
  });

  it("最後のsampleフレームのcumulativeAucはsummaryのfinalAucと一致する(積み上げの終点)", () => {
    const lastSampleFrame = frames[n];
    const summary = frames[frames.length - 1];
    expect(lastSampleFrame.payload?.cumulativeAuc).toBeCloseTo(summary.payload?.finalAuc ?? NaN, 9);
  });

  it("累積AUCは単調非減少(台形則の各項は非負)", () => {
    let prev = -Infinity;
    for (let i = 1; i <= n; i++) {
      const cur = frames[i].payload?.cumulativeAuc ?? NaN;
      expect(cur).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = cur;
    }
  });

  it("最後のフレームのhighlightsは全roc-point-iのkeyを含む", () => {
    const last = frames[frames.length - 1];
    for (let i = 1; i <= n; i++) {
      expect(last.highlights).toContain(`roc-point-${i}`);
    }
  });
});
