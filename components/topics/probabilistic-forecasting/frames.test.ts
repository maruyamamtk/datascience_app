import { describe, expect, it } from "vitest";
import { STEPPER_SAMPLES } from "@/lib/stats/probabilistic-forecasting";
import { buildBrierScoreFrames } from "./frames";

describe("buildBrierScoreFrames", () => {
  const frames = buildBrierScoreFrames();

  it("フレーム数 = サンプル数 + 1(まとめ)", () => {
    expect(frames).toHaveLength(STEPPER_SAMPLES.length + 1);
  });

  it("先頭フレームはphase=termでrowIndex=0、1件目の二乗誤差が正しい", () => {
    const p = frames[0].payload;
    expect(p?.phase).toBe("term");
    expect(p?.rowIndex).toBe(0);
    const first = STEPPER_SAMPLES[0];
    expect(p?.squaredError).toBeCloseTo((first.predicted - first.outcome) ** 2, 10);
    expect(p?.cumulativeSum).toBeCloseTo(p?.squaredError ?? 0, 10);
  });

  it("累積和はフレームが進むほど単調非減少", () => {
    const sums = frames
      .filter((f) => f.payload?.phase === "term")
      .map((f) => f.payload?.cumulativeSum ?? 0);
    for (let i = 1; i < sums.length; i++) {
      expect(sums[i]).toBeGreaterThanOrEqual(sums[i - 1]);
    }
  });

  it("最終フレームはphase=summaryでrowIndexがnull、runningScoreが全件平均と一致する", () => {
    const last = frames[frames.length - 1];
    expect(last.payload?.phase).toBe("summary");
    expect(last.payload?.rowIndex).toBeNull();
    const totalSquaredError = STEPPER_SAMPLES.reduce(
      (sum, s) => sum + (s.predicted - s.outcome) ** 2,
      0,
    );
    expect(last.payload?.runningScore).toBeCloseTo(totalSquaredError / STEPPER_SAMPLES.length, 10);
  });

  it("各フレームにcalloutが付与されている", () => {
    for (const f of frames) {
      expect(f.callout).toBeDefined();
      expect(f.callout?.body.length).toBeGreaterThan(0);
    }
  });
});
