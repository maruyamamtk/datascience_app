import { describe, expect, it } from "vitest";
import {
  buildDescentFrames,
  STEP_COUNT,
  STEP_DF,
  STEP_LR,
  STEP_TARGET,
  STEP_X0,
} from "./frames";

describe("buildDescentFrames", () => {
  const frames = buildDescentFrames();

  it("STEP_COUNT 個のフレームを作る", () => {
    expect(frames).toHaveLength(STEP_COUNT);
  });

  it("最初のフレームは出発点 x0", () => {
    expect(frames[0].payload!.x).toBeCloseTo(STEP_X0, 12);
    expect(frames[0].payload!.k).toBe(0);
  });

  it("各フレームの xNext = x − η·f'(x)（勾配降下の更新式）", () => {
    for (const f of frames) {
      const p = f.payload!;
      expect(p.xNext).toBeCloseTo(p.x - STEP_LR * STEP_DF(p.x), 10);
      expect(p.grad).toBeCloseTo(STEP_DF(p.x), 12);
    }
  });

  it("谷底 target への距離が単調に縮む（収束）", () => {
    for (let i = 1; i < frames.length; i++) {
      const prev = Math.abs(frames[i - 1].payload!.x - STEP_TARGET);
      const cur = Math.abs(frames[i].payload!.x - STEP_TARGET);
      expect(cur).toBeLessThan(prev);
    }
  });

  it("最後のフレームは谷底にほぼ到達し converged ハイライト", () => {
    const last = frames.at(-1)!;
    expect(Math.abs(last.payload!.x - STEP_TARGET)).toBeLessThan(0.1);
    expect(last.highlights).toContain("converged");
  });

  it("全フレームに callout と point ハイライトがある", () => {
    for (const f of frames) {
      expect(f.callout).toBeTruthy();
      expect(f.highlights).toContain("point");
    }
  });
});
