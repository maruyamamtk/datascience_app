import { describe, expect, it } from "vitest";
import { oneWayAnova } from "@/lib/stats/anova";
import { buildDecompFrames } from "./frames";

describe("buildDecompFrames", () => {
  const anova = oneWayAnova([
    [1, 2, 3],
    [5, 6, 7],
    [9, 10, 11],
  ]);
  const frames = buildDecompFrames(anova);

  it("4ステップ（total/within/between/ratio）", () => {
    expect(frames).toHaveLength(4);
    expect(frames.map((f) => f.payload?.stage)).toEqual(["total", "within", "between", "ratio"]);
  });

  it("total = within + between（分解）", () => {
    const total = frames[0].payload?.value ?? 0;
    const within = frames[1].payload?.value ?? 0;
    const between = frames[2].payload?.value ?? 0;
    expect(total).toBeCloseTo(within + between, 8);
  });

  it("ratio フレームの値は F 統計量", () => {
    expect(frames[3].payload?.value).toBeCloseTo(anova.F, 8);
  });

  it("各フレームに対応ハイライト", () => {
    expect(frames[0].highlights).toContain("total");
    expect(frames[3].highlights).toContain("ratio");
  });
});
