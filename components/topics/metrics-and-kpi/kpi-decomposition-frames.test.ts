import { describe, expect, it } from "vitest";
import { DEMO_DELTA_PCT, DEMO_FACTORS, buildKpiDecompositionFrames } from "./kpi-decomposition-frames";

describe("buildKpiDecompositionFrames", () => {
  const frames = buildKpiDecompositionFrames();

  it("全体像1コマ+要素3つ=4コマ", () => {
    expect(frames.length).toBe(4);
  });

  it("先頭フレームは overview で、highlightsに3要素すべてを含む", () => {
    expect(frames[0].payload?.step).toBe("overview");
    expect(frames[0].highlights).toEqual(expect.arrayContaining(["traffic", "conversionRate", "aov"]));
  });

  it("2〜4コマ目はtraffic/conversionRate/aovの順", () => {
    expect(frames[1].payload?.step).toBe("traffic");
    expect(frames[2].payload?.step).toBe("conversionRate");
    expect(frames[3].payload?.step).toBe("aov");
  });

  it("各要素フレームの売上相対インパクトはDEMO_DELTA_PCTと一致する（乗法分解の対称性）", () => {
    for (const f of frames.slice(1)) {
      expect(f.payload?.revenueDeltaPct).toBeCloseTo(DEMO_DELTA_PCT, 6);
    }
  });

  it("baseRevenueは全フレームで同じ値", () => {
    const base = frames[0].payload?.baseRevenue;
    for (const f of frames) expect(f.payload?.baseRevenue).toBe(base);
  });

  it("カスタムの deltaPct を渡すとその値が使われる", () => {
    const custom = buildKpiDecompositionFrames(DEMO_FACTORS, 20);
    for (const f of custom.slice(1)) {
      expect(f.payload?.revenueDeltaPct).toBeCloseTo(20, 6);
    }
  });
});
