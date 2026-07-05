import { describe, expect, it } from "vitest";
import { AREA_F, buildRiemannFrames, EXACT_AREA, RECT_COUNTS } from "./frames";

describe("buildRiemannFrames", () => {
  const frames = buildRiemannFrames();

  it("導入 + 短冊本数ぶんのフレームを作る", () => {
    expect(frames).toHaveLength(1 + RECT_COUNTS.length);
    expect(frames[0].payload?.stepIndex).toBe(-1);
  });

  it("各ステップの短冊本数が RECT_COUNTS と一致し、面積の総和＝sum", () => {
    RECT_COUNTS.forEach((n, i) => {
      const p = frames[i + 1].payload!;
      expect(p.n).toBe(n);
      expect(p.rects).toHaveLength(n);
      const total = p.rects.reduce((s, r) => s + r.area, 0);
      expect(p.sum).toBeCloseTo(total, 12);
    });
  });

  it("本数を倍にすると誤差が単調に減り、真値へ収束する", () => {
    const errs = RECT_COUNTS.map((_, i) => frames[i + 1].payload!.error);
    for (let i = 1; i < errs.length; i++) expect(errs[i]).toBeLessThan(errs[i - 1]);
    // 最終フレーム（n=32）はほぼ真値
    expect(frames.at(-1)!.payload!.sum).toBeCloseTo(EXACT_AREA, 3);
  });

  it("中点則の誤差は本数を倍にするとおよそ 1/4 になる", () => {
    const e1 = frames[1 + 2].payload!.error; // n=4
    const e2 = frames[1 + 3].payload!.error; // n=8
    expect(e1 / e2).toBeCloseTo(4, 0);
  });

  it("真値は解析解 ∫₀² (0.4x²+0.3) dx と一致", () => {
    expect(EXACT_AREA).toBeCloseTo(0.4 * (8 / 3) + 0.6, 12);
    expect(AREA_F(0)).toBeCloseTo(0.3, 12);
  });

  it("全フレームに callout と highlights がある", () => {
    for (const f of frames) {
      expect(f.callout).toBeTruthy();
      expect(f.highlights?.length).toBeGreaterThan(0);
    }
  });
});
