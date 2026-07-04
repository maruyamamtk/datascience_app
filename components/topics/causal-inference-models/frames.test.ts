import { describe, expect, it } from "vitest";
import { buildCausalFrames, DEMO_UNITS, TRUE_ATE } from "./frames";

describe("buildCausalFrames", () => {
  const frames = buildCausalFrames();

  it("5段階（god→observed→assignment→naive→adjust）", () => {
    expect(frames.map((f) => f.payload?.stage)).toEqual([
      "god",
      "observed",
      "assignment",
      "naive",
      "adjust",
    ]);
  });

  it("真の ATE は 2、全個体の ITE=2", () => {
    expect(frames[0].payload?.trueAte).toBe(TRUE_ATE);
    for (const u of DEMO_UNITS) expect(u.y1 - u.y0).toBe(2);
  });

  it("素朴比較は真値2から過小評価（交絡バイアス）", () => {
    const naive = frames[3].payload!.naive;
    expect(naive).toBeLessThan(2);
    expect(naive).not.toBeCloseTo(2, 1);
  });

  it("層別調整は真の ATE=2 を回復", () => {
    expect(frames[4].payload?.adjusted).toBeCloseTo(2, 8);
  });

  it("調整後は素朴比較より真値に近い", () => {
    const p = frames[4].payload!;
    expect(Math.abs(p.adjusted - 2)).toBeLessThan(Math.abs(p.naive - 2));
  });

  it("各フレームにコールアウトとハイライト", () => {
    frames.forEach((f) => {
      expect((f.callout?.title ?? "").length).toBeGreaterThan(0);
      expect((f.highlights ?? []).length).toBeGreaterThan(0);
    });
  });
});
