import { describe, expect, it } from "vitest";
import { mulberry32 } from "@/lib/stats/random";
import { buildStepwiseFrames } from "./frames";

describe("buildStepwiseFrames", () => {
  // x1 が効く、x2/x3 はノイズ。
  const rng = mulberry32(5);
  const n = 40;
  const x1 = Array.from({ length: n }, (_, i) => i / 5);
  const x2 = Array.from({ length: n }, () => rng());
  const x3 = Array.from({ length: n }, () => rng());
  const y = x1.map((v) => 3 * v + (rng() - 0.5));
  const frames = buildStepwiseFrames([x1, x2, x3], ["x1", "x2", "x3"], y);

  it("変数の数だけフレーム（1..3変数モデル）", () => {
    expect(frames).toHaveLength(3);
    expect(frames[0].payload?.vars).toEqual(["x1"]);
    expect(frames[2].payload?.vars).toEqual(["x1", "x2", "x3"]);
  });

  it("R² は単調非減少", () => {
    const r2 = frames.map((f) => f.payload?.rSquared ?? 0);
    expect(r2[1]).toBeGreaterThanOrEqual(r2[0] - 1e-9);
    expect(r2[2]).toBeGreaterThanOrEqual(r2[1] - 1e-9);
  });

  it("効かない変数を足すと調整済みR²が下がりうる（R²<調整済みの単調性は保証されない）", () => {
    const adj = frames.map((f) => f.payload?.adjustedRSquared ?? 0);
    // 少なくとも一度は «R²増・調整済みR²減» が起きる（ノイズ変数のため）。
    const someDrop = adj[2] < adj[0] || adj[1] < adj[0] || adj[2] < adj[1];
    expect(someDrop).toBe(true);
  });
});
