import { describe, expect, it } from "vitest";
import { compareEstimates, DEFAULT_GROUPS, grandMean, pooledWithinVariance } from "@/lib/stats/hierarchical-bayes";
import { buildShrinkageFrames } from "./frames";

const sigma2 = pooledWithinVariance(DEFAULT_GROUPS);
const mu = grandMean(DEFAULT_GROUPS);
const estimates = compareEstimates(DEFAULT_GROUPS, 36, sigma2, mu);

describe("buildShrinkageFrames", () => {
  it("グループ数と同じ数のフレームを作る", () => {
    const frames = buildShrinkageFrames(estimates);
    expect(frames.length).toBe(estimates.length);
  });

  it("各フレームのpayloadは対応するGroupEstimateそのもの", () => {
    const frames = buildShrinkageFrames(estimates);
    frames.forEach((f, i) => {
      expect(f.payload).toBe(estimates[i]);
    });
  });

  it("全フレームでhighlightsに主要な数式項idが含まれる", () => {
    const frames = buildShrinkageFrames(estimates);
    frames.forEach((f) => {
      expect(f.highlights).toContain("thetaHat");
      expect(f.highlights).toContain("mu");
    });
  });

  it("最初のフレーム(最小サンプルサイズ)のcalloutは«もっとも少ない»という趣旨を含む", () => {
    const frames = buildShrinkageFrames(estimates);
    expect(frames[0].callout?.note).toContain("もっとも少ない");
  });

  it("最後のフレーム(最大サンプルサイズ)のcalloutは«もっとも多い»という趣旨を含む", () => {
    const frames = buildShrinkageFrames(estimates);
    const last = frames[frames.length - 1];
    expect(last.callout?.note).toContain("もっとも多い");
  });
});
