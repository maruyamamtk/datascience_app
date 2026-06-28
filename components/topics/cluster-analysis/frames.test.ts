import { describe, expect, it } from "vitest";
import { initCentroids, kmeansIterate } from "@/lib/stats/clustering";
import { CLUSTER_DATA } from "@/lib/store/cluster-analysis";
import { mulberry32 } from "@/lib/stats/random";
import { buildKmeansFrames } from "./frames";

describe("buildKmeansFrames", () => {
  const steps = kmeansIterate(CLUSTER_DATA, initCentroids(CLUSTER_DATA, 4, mulberry32(1004)));
  const frames = buildKmeansFrames(steps);

  it("ステップ数ぶんのフレーム", () => {
    expect(frames).toHaveLength(steps.length);
    expect(frames[0].payload?.step).toBe(0);
  });

  it("最後のフレームだけ converged", () => {
    expect(frames[frames.length - 1].payload?.converged).toBe(true);
    expect(frames.slice(0, -1).every((f) => !f.payload?.converged)).toBe(true);
  });

  it("WCSS は単調非増加", () => {
    for (let i = 1; i < frames.length; i++) {
      expect(frames[i].payload!.wcss).toBeLessThanOrEqual(frames[i - 1].payload!.wcss + 1e-9);
    }
  });

  it("各フレームに centroids ハイライト", () => {
    frames.forEach((f) => expect(f.highlights).toContain("centroids"));
  });
});
