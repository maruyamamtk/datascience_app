import { describe, expect, it } from "vitest";
import { buildAcfFrames, MAX_LAG, STEP_PERIOD } from "./frames";

describe("buildAcfFrames", () => {
  const frames = buildAcfFrames();

  it("ラグ 0..MAX_LAG のフレーム", () => {
    expect(frames).toHaveLength(MAX_LAG + 1);
    expect(frames[0].payload?.lag).toBe(0);
    expect(frames[frames.length - 1].payload?.lag).toBe(MAX_LAG);
  });

  it("ラグ0の自己相関は1", () => {
    expect(frames[0].payload?.rho).toBeCloseTo(1, 10);
  });

  it("acfSoFar はラグとともに1本ずつ伸びる", () => {
    frames.forEach((f, k) => {
      expect(f.payload?.acfSoFar).toHaveLength(k + 1);
    });
  });

  it("季節周期(12)のラグは正で有意", () => {
    const f = frames[STEP_PERIOD];
    expect(f.payload?.rho).toBeGreaterThan(0);
    expect(f.payload?.significant).toBe(true);
  });

  it("半周期(6)のラグは負", () => {
    expect(frames[STEP_PERIOD / 2].payload?.rho).toBeLessThan(0);
  });

  it("各フレームにコールアウトとハイライト", () => {
    frames.forEach((f) => {
      expect((f.callout?.title ?? "").length).toBeGreaterThan(0);
      expect((f.highlights ?? []).length).toBeGreaterThan(0);
    });
  });
});
