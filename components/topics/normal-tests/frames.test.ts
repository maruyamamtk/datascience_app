import { describe, expect, it } from "vitest";
import { twoSampleT } from "@/lib/stats/normal-tests";
import { buildTtestFrames } from "./frames";

describe("buildTtestFrames", () => {
  const params = { meanDiff: 1.2, sd: 2, n: 15 };
  const frames = buildTtestFrames(params);

  it("5ステップ（diff→pooled→se→t→p）", () => {
    expect(frames).toHaveLength(5);
    expect(frames.map((f) => f.payload?.step)).toEqual(["diff", "pooled", "se", "t", "p"]);
  });

  it("④の t は twoSampleT と一致", () => {
    const { t } = twoSampleT({ mean1: 1.2, mean2: 0, s1: 2, s2: 2, n1: 15, n2: 15 });
    expect(frames[3].payload?.value).toBeCloseTo(t, 12);
  });

  it("⑤の p は [0,1]", () => {
    const p = frames[4].payload?.value ?? -1;
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });

  it("各フレームにハイライト", () => {
    expect(frames[0].highlights).toContain("step-diff");
    expect(frames[4].highlights).toContain("step-p");
  });
});
