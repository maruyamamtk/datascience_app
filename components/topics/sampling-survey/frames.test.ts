import { describe, expect, it } from "vitest";
import type { Stratum } from "@/lib/stats/sampling-survey";
import { buildReductionFrames } from "./frames";

const STRATA: Stratum[] = [
  { name: "A", size: 600, mean: 10, sd: 2 },
  { name: "B", size: 300, mean: 20, sd: 3 },
  { name: "C", size: 100, mean: 50, sd: 6 },
];

describe("buildReductionFrames", () => {
  const frames = buildReductionFrames(STRATA, 100);

  it("3法（srs/proportional/neyman）", () => {
    expect(frames).toHaveLength(3);
    expect(frames.map((f) => f.payload?.method)).toEqual(["srs", "proportional", "neyman"]);
  });

  it("SE は SRS > 比例 ≥ ネイマン（分散低減）", () => {
    const se = frames.map((f) => f.payload?.se ?? 0);
    expect(se[0]).toBeGreaterThan(se[1]);
    expect(se[1]).toBeGreaterThanOrEqual(se[2] - 1e-9);
  });

  it("各フレームに対応ハイライト", () => {
    expect(frames[0].highlights).toContain("srs");
    expect(frames[2].highlights).toContain("neyman");
  });
});
