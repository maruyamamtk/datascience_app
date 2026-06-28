import { describe, expect, it } from "vitest";
import { buildPermutationFrames } from "./frames";

describe("buildPermutationFrames", () => {
  const nullDist = Array.from({ length: 1000 }, (_, i) => Math.sin(i) * 2);
  const frames = buildPermutationFrames(nullDist, 1.5, [10, 50, 200, 1000]);

  it("steps ぶんのフレーム", () => {
    expect(frames).toHaveLength(4);
    expect(frames.map((f) => f.payload?.count)).toEqual([10, 50, 200, 1000]);
  });

  it("collected は段階的に増える", () => {
    expect(frames[0].payload?.collected.length).toBe(10);
    expect(frames[3].payload?.collected.length).toBe(1000);
  });

  it("p 推定は [0,1]", () => {
    frames.forEach((f) => {
      expect(f.payload?.pEstimate).toBeGreaterThanOrEqual(0);
      expect(f.payload?.pEstimate).toBeLessThanOrEqual(1);
    });
  });

  it("各フレームに observed ハイライト", () => {
    frames.forEach((f) => expect(f.highlights).toContain("observed"));
  });
});
