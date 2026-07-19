import { describe, expect, it } from "vitest";
import { generateImbalancedData } from "@/lib/stats/imbalanced-anomaly";
import { ADASYN_DEMO_K, buildAdasynWeightFrames } from "./adasyn-weight-frames";

describe("buildAdasynWeightFrames", () => {
  const data = generateImbalancedData(20260719);
  const minority = data.filter((p) => p.label === 1).map((p) => ({ x1: p.x1, x2: p.x2 }));
  const frames = buildAdasynWeightFrames(minority, data, ADASYN_DEMO_K);

  it("少数派の点数だけフレームがある", () => {
    expect(frames.length).toBe(minority.length);
  });

  it("各フレームの重みは合計1に正規化される", () => {
    const total = frames.reduce((s, f) => s + (f.payload?.weight ?? 0), 0);
    expect(total).toBeCloseTo(1, 6);
  });

  it("各フレームに近傍がk個ある", () => {
    for (const f of frames) expect(f.payload?.neighbors.length).toBe(ADASYN_DEMO_K);
  });

  it("境界寄りの点（後半）は核寄りの点（前半）より平均的に重みが大きい", () => {
    const half = Math.floor(frames.length / 2);
    const meanFirst = frames.slice(0, half).reduce((s, f) => s + (f.payload?.weight ?? 0), 0) / half;
    const meanSecond = frames.slice(half).reduce((s, f) => s + (f.payload?.weight ?? 0), 0) / (frames.length - half);
    expect(meanSecond).toBeGreaterThan(meanFirst);
  });
});
