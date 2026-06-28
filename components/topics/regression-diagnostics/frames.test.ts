import { describe, expect, it } from "vitest";
import { buildPatternFrames } from "./frames";

describe("buildPatternFrames", () => {
  const frames = buildPatternFrames();

  it("4シナリオ（good/nonlinear/hetero/outlier）", () => {
    expect(frames).toHaveLength(4);
    expect(frames.map((f) => f.payload?.kind)).toEqual(["good", "nonlinear", "hetero", "outlier"]);
  });

  it("各フレームに残差点列がある", () => {
    frames.forEach((f) => {
      expect(f.payload?.points.length ?? 0).toBeGreaterThan(10);
    });
  });

  it("非線形シナリオは残差にU字（端の残差が中央より大きい傾向）", () => {
    const pts = frames[1].payload?.points ?? [];
    const sorted = [...pts].sort((a, b) => a.fitted - b.fitted);
    const edgeAvg = (sorted[0].residual + sorted[sorted.length - 1].residual) / 2;
    const midAvg = sorted[Math.floor(sorted.length / 2)].residual;
    expect(edgeAvg).toBeGreaterThan(midAvg);
  });

  it("外れ値シナリオは |残差| が大きい点を含む", () => {
    const pts = frames[3].payload?.points ?? [];
    expect(Math.max(...pts.map((p) => Math.abs(p.residual)))).toBeGreaterThan(5);
  });
});
