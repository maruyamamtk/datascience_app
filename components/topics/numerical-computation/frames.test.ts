import { describe, expect, it } from "vitest";
import { buildBisectFrames, STEP_ITERS, STEP_ROOT } from "./frames";

describe("buildBisectFrames", () => {
  const frames = buildBisectFrames();

  it("フレーム数は反復数+1（初期区間を含む）", () => {
    expect(frames).toHaveLength(STEP_ITERS + 1);
  });

  it("最初のコマは初期区間 [1,2]", () => {
    const p = frames[0].payload!;
    expect(p.a).toBeCloseTo(1, 12);
    expect(p.b).toBeCloseTo(2, 12);
    expect(p.k).toBe(0);
  });

  it("区間幅は毎コマ半分になる", () => {
    for (let i = 1; i < frames.length; i++) {
      expect(frames[i].payload!.width).toBeCloseTo(frames[i - 1].payload!.width / 2, 12);
    }
  });

  it("中点は根 √2 に近づき、根は常に区間内にある", () => {
    for (const f of frames) {
      const p = f.payload!;
      expect(p.a).toBeLessThanOrEqual(STEP_ROOT);
      expect(p.b).toBeGreaterThanOrEqual(STEP_ROOT);
    }
    const last = frames.at(-1)!.payload!;
    expect(Math.abs(last.mid - STEP_ROOT)).toBeLessThan(0.01);
  });

  it("全コマに callout と中点 payload がある", () => {
    for (const f of frames) {
      expect(f.callout).toBeTruthy();
      expect(Number.isFinite(f.payload!.mid)).toBe(true);
    }
  });

  it("最終コマは converged ハイライト", () => {
    expect(frames.at(-1)!.highlights).toContain("converged");
  });
});
