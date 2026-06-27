import { describe, expect, it } from "vitest";
import { variance } from "@/lib/stats/moments";
import { buildVarianceFrames } from "./frames";

describe("buildVarianceFrames", () => {
  const points = [2, 4, 6];
  const frames = buildVarianceFrames(points);

  it("点の数だけフレームを作る", () => {
    expect(frames).toHaveLength(points.length);
  });

  it("偏差平方和が単調に積み上がる", () => {
    const sums = frames.map((f) => f.payload?.runningSum ?? 0);
    expect(sums[0]).toBeLessThanOrEqual(sums[1]);
    expect(sums[1]).toBeLessThanOrEqual(sums[2]);
  });

  it("最終フレームの偏差平方和を n で割ると母分散に一致", () => {
    const last = frames[frames.length - 1].payload;
    expect((last?.runningSum ?? 0) / points.length).toBeCloseTo(variance(points), 10);
  });

  it("各フレームに着目点のハイライトが付く", () => {
    frames.forEach((f, i) => {
      expect(f.highlights).toContain(`pt-${i}`);
    });
  });
});
