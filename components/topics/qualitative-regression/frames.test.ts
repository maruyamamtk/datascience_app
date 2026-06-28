import { describe, expect, it } from "vitest";
import { generateBinaryData } from "@/lib/stats/logistic";
import { mulberry32 } from "@/lib/stats/random";
import { buildLogitFitFrames } from "./frames";

describe("buildLogitFitFrames", () => {
  const { x, y } = generateBinaryData({
    n: 300,
    b0: -1,
    b1: 2,
    xMin: -2,
    xMax: 3,
    rng: mulberry32(1),
  });
  const frames = buildLogitFitFrames(x, y, [0, 20, 100, 400]);

  it("steps ぶんのフレーム", () => {
    expect(frames).toHaveLength(4);
    expect(frames.map((f) => f.payload?.step)).toEqual([0, 20, 100, 400]);
  });

  it("対数尤度は単調に増える（登っている）", () => {
    const lls = frames.map((f) => f.payload?.logLik ?? -Infinity);
    for (let i = 1; i < lls.length; i++) expect(lls[i]).toBeGreaterThanOrEqual(lls[i - 1] - 1e-6);
  });

  it("最終フレームは正の傾きを復元（真b1=2）", () => {
    expect(frames[3].payload?.b1 ?? 0).toBeGreaterThan(1);
  });

  it("各フレームに curve ハイライト", () => {
    frames.forEach((f) => expect(f.highlights).toContain("curve"));
  });
});
