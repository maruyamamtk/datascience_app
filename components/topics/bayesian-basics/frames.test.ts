import { describe, expect, it } from "vitest";
import { COIN_SEQUENCE, DEFAULT_PRIOR, sequentialUpdates } from "@/lib/stats/bayesian-basics";
import { buildPosteriorFrames } from "./frames";

describe("buildPosteriorFrames", () => {
  const steps = sequentialUpdates(DEFAULT_PRIOR, COIN_SEQUENCE);
  const frames = buildPosteriorFrames(steps, DEFAULT_PRIOR.alpha, DEFAULT_PRIOR.beta);

  it("フレーム数はobservations+1(先頭が事前分布のみ)", () => {
    expect(frames.length).toBe(COIN_SEQUENCE.length + 1);
  });

  it("先頭フレームは事前分布のみでhighlightsがalpha0/beta0", () => {
    expect(frames[0].payload?.index).toBe(0);
    expect(frames[0].highlights).toEqual(["alpha0", "beta0"]);
    expect(frames[0].callout?.title).toContain("観測前");
  });

  it("各フレームのpayloadは対応するsequentialUpdatesの結果と一致する", () => {
    frames.forEach((f, i) => {
      expect(f.payload).toEqual(steps[i]);
    });
  });

  it("2フレーム目以降はhighlightsにPosteriorUpdateLabの実際の項id(k/m/alphaPost/betaPost)を含む", () => {
    for (let i = 1; i < frames.length; i++) {
      expect(frames[i].highlights).toEqual(["k", "m", "alphaPost", "betaPost"]);
    }
  });

  it("最初の3ステップ(index<=3)のcalloutは解説(explain)、それ以降は補足(supplement)", () => {
    for (let i = 1; i <= 3; i++) expect(frames[i].callout?.kind).toBe("explain");
    for (let i = 4; i < frames.length; i++) expect(frames[i].callout?.kind).toBe("supplement");
  });
});
