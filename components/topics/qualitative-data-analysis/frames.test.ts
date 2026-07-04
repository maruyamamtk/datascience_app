import { describe, expect, it } from "vitest";
import { buildQuant1Frames, PRED_VALUE } from "./frames";

describe("buildQuant1Frames", () => {
  const frames = buildQuant1Frames();

  it("4段階（raw→dummy→scores→predict）", () => {
    expect(frames.map((f) => f.payload?.stage)).toEqual(["raw", "dummy", "scores", "predict"]);
  });

  it("推定スコアは各アイテム平均0・高い説明力", () => {
    const p = frames[2].payload!;
    p.scores.forEach((s) => {
      const m = s.reduce((a, b) => a + b, 0) / s.length;
      expect(Math.abs(m)).toBeLessThan(1e-9);
    });
    expect(p.rSquared).toBeGreaterThan(0.5);
  });

  it("予測は定数+スコア和に一致（晴×週末）", () => {
    const p = frames[3].payload!;
    const expected = p.constant + p.scores[0][0] + p.scores[1][1];
    expect(p.predValue).toBeCloseTo(expected, 8);
    expect(p.predValue).toBeCloseTo(PRED_VALUE, 8);
  });

  it("各フレームにコールアウトとハイライト", () => {
    frames.forEach((f) => {
      expect((f.callout?.title ?? "").length).toBeGreaterThan(0);
      expect((f.highlights ?? []).length).toBeGreaterThan(0);
    });
  });
});
