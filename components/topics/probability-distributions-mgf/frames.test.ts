import { describe, expect, it } from "vitest";
import { binomialPmfVector } from "@/lib/stats/mass-functions";
import { buildCdfFrames } from "./frames";

describe("buildCdfFrames", () => {
  const pmf = binomialPmfVector(10, 0.5);
  const frames = buildCdfFrames(pmf);

  it("確率関数の要素数だけフレームを作る", () => {
    expect(frames).toHaveLength(pmf.length);
  });

  it("累積は単調増加で末尾が1", () => {
    const cdfs = frames.map((f) => f.payload?.cdf ?? 0);
    for (let i = 1; i < cdfs.length; i++) expect(cdfs[i]).toBeGreaterThanOrEqual(cdfs[i - 1]);
    expect(cdfs[cdfs.length - 1]).toBeCloseTo(1, 12);
  });

  it("各フレームは対応する棒を強調", () => {
    frames.forEach((f, k) => expect(f.highlights).toContain(`bar-${k}`));
  });
});
