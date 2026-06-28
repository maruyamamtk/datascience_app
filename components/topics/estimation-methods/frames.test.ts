import { describe, expect, it } from "vitest";
import { exponentialMle } from "@/lib/stats/estimation";
import { buildAscentFrames } from "./frames";

const SAMPLE = [0.5, 1.2, 2.0, 0.8, 3.1, 1.5, 0.9, 2.4];

describe("buildAscentFrames", () => {
  const frames = buildAscentFrames(SAMPLE, 0.2, 0.2, 50);

  it("iters+1 フレーム", () => {
    expect(frames).toHaveLength(51);
  });

  it("最終フレームは MLE 付近で勾配≈0", () => {
    const last = frames[frames.length - 1].payload;
    expect(last?.lambda).toBeCloseTo(exponentialMle(SAMPLE), 1);
    expect(Math.abs(last?.score ?? 1)).toBeLessThan(0.1);
  });

  it("対数尤度は出発点より上がる", () => {
    expect((frames[50].payload?.logLik ?? -1) > (frames[0].payload?.logLik ?? 0)).toBe(true);
  });

  it("各フレームにハイライト", () => {
    frames.forEach((f, i) => expect(f.highlights).toContain(`step-${i}`));
  });
});
