import { describe, expect, it } from "vitest";
import { evolve, totalVariationToStationary } from "@/lib/stats/markov";
import {
  buildTransition,
  INITIAL_DISTRIBUTION,
  STATES,
  EVOLVE_STEPS,
} from "@/lib/store/markov-chains";
import { buildDistributionFrames } from "./frames";

describe("buildDistributionFrames", () => {
  const P = buildTransition(0.6);
  const evolution = evolve(P, INITIAL_DISTRIBUTION, EVOLVE_STEPS);
  const tv = totalVariationToStationary(P, INITIAL_DISTRIBUTION, EVOLVE_STEPS);
  const frames = buildDistributionFrames(evolution, tv, STATES);

  it("ステップ数+1ぶんのフレーム", () => {
    expect(frames).toHaveLength(EVOLVE_STEPS + 1);
    expect(frames[0].payload?.step).toBe(0);
  });

  it("各フレームの分布は和1", () => {
    frames.forEach((f) => {
      expect((f.payload?.dist ?? []).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 8);
    });
  });

  it("総変動距離は単調に減り、最後は収束", () => {
    const tvs = frames.map((f) => f.payload?.tv ?? 1);
    expect(tvs[0]).toBeGreaterThan(tvs[tvs.length - 1]);
    expect(frames[frames.length - 1].payload?.converged).toBe(true);
  });

  it("初期フレームは収束していない", () => {
    expect(frames[0].payload?.converged).toBe(false);
  });
});
