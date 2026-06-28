import { describe, expect, it } from "vitest";
import { buildFamilyFrames } from "./frames";

describe("buildFamilyFrames", () => {
  const frames = buildFamilyFrames();

  it("3族（gaussian/binomial/poisson）", () => {
    expect(frames).toHaveLength(3);
    expect(frames.map((f) => f.payload?.family)).toEqual(["gaussian", "binomial", "poisson"]);
  });

  it("二項の μ は0〜1に収まる（確率）", () => {
    const curve = frames[1].payload?.curve ?? [];
    curve.forEach((p) => {
      expect(p.mu).toBeGreaterThanOrEqual(0);
      expect(p.mu).toBeLessThanOrEqual(1);
    });
  });

  it("ポアソンの μ は常に正（カウント平均）かつ単調増加（b1>0）", () => {
    const curve = frames[2].payload?.curve ?? [];
    curve.forEach((p) => expect(p.mu).toBeGreaterThan(0));
    expect(curve[curve.length - 1].mu).toBeGreaterThan(curve[0].mu);
  });

  it("ガウスの μ は線形（恒等リンク）", () => {
    const curve = frames[0].payload?.curve ?? [];
    // 等間隔 x で μ の差分が一定（直線）。
    const d1 = curve[1].mu - curve[0].mu;
    const d2 = curve[2].mu - curve[1].mu;
    expect(d2).toBeCloseTo(d1, 10);
  });
});
