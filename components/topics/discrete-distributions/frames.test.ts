import { describe, expect, it } from "vitest";
import { buildPoissonLimitFrames } from "./frames";

describe("buildPoissonLimitFrames", () => {
  const frames = buildPoissonLimitFrames(3, [5, 10, 50, 500]);

  it("n のリストぶんフレームを作る", () => {
    expect(frames).toHaveLength(4);
    expect(frames.map((f) => f.payload?.n)).toEqual([5, 10, 50, 500]);
  });

  it("n が増えると二項とポアソンの最大差は単調に縮む", () => {
    const diffs = frames.map((f) => f.payload?.maxDiff ?? 1);
    for (let i = 1; i < diffs.length; i++) expect(diffs[i]).toBeLessThanOrEqual(diffs[i - 1]);
  });

  it("最終フレーム（n大）では二項がポアソンにほぼ一致", () => {
    expect(frames[3].payload?.maxDiff ?? 1).toBeLessThan(0.01);
  });

  it("p = λ/n", () => {
    expect(frames[1].payload?.p).toBeCloseTo(3 / 10, 12);
  });
});
