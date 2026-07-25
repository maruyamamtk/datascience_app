import { describe, expect, it } from "vitest";
import { AB_OBSERVATIONS, UNIFORM_PRIOR, sequentialAbUpdates } from "@/lib/stats/bayesian-applications";
import { buildAbObservationFrames } from "./frames";

describe("buildAbObservationFrames", () => {
  const steps = sequentialAbUpdates(UNIFORM_PRIOR, AB_OBSERVATIONS, 500);
  const frames = buildAbObservationFrames(steps);

  it("ステップ数と同じ長さのフレーム列を返す", () => {
    expect(frames.length).toBe(steps.length);
  });

  it("すべてのフレームが数式のハイライト対象を持つ", () => {
    frames.forEach((f) => {
      expect(f.highlights).toContain("pHat");
    });
  });

  it("先頭フレームは観測前のcalloutを持つ", () => {
    expect(frames[0].callout?.title).toContain("観測前");
  });

  it("2件目以降のフレームは観測したバリアント名をcalloutに含む", () => {
    const frame = frames[1];
    const step = steps[1];
    expect(frame.callout?.title).toContain(step.observation?.variant);
  });

  it("payloadは元のstepそのもの", () => {
    frames.forEach((f, i) => {
      expect(f.payload).toBe(steps[i]);
    });
  });
});
