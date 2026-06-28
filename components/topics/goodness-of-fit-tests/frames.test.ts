import { describe, expect, it } from "vitest";
import { chiSquareGof, uniformExpected } from "@/lib/stats/goodness-of-fit";
import { buildGofFrames } from "./frames";

describe("buildGofFrames", () => {
  const obs = [16, 8, 10, 12, 6, 8];
  const { chi2, cells } = chiSquareGof(obs, uniformExpected(60, 6));
  const frames = buildGofFrames(cells);

  it("カテゴリ数ぶんのフレーム", () => {
    expect(frames).toHaveLength(6);
  });

  it("累積は単調増加", () => {
    const runs = frames.map((f) => f.payload?.running ?? 0);
    for (let i = 1; i < runs.length; i++) expect(runs[i]).toBeGreaterThanOrEqual(runs[i - 1]);
  });

  it("最終フレームの累積が χ² に一致", () => {
    expect(frames[5].payload?.running).toBeCloseTo(chi2, 10);
  });

  it("各フレームにハイライト", () => {
    frames.forEach((f, i) => expect(f.highlights).toContain(`cat-${i}`));
  });
});
