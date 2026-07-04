import { describe, expect, it } from "vitest";
import { buildProcessFrames } from "./frames";

describe("buildProcessFrames", () => {
  const frames = buildProcessFrames();

  it("3過程（walk/brownian/poisson）", () => {
    expect(frames).toHaveLength(3);
    expect(frames.map((f) => f.payload?.kind)).toEqual(["walk", "brownian", "poisson"]);
  });

  it("ランダムウォークの各ステップは±1", () => {
    const p = frames[0].payload?.path ?? [];
    for (let i = 1; i < p.length; i++) expect(Math.abs(p[i] - p[i - 1])).toBeCloseTo(1, 10);
  });

  it("ポアソン過程は単調非減少・階段状フラグ", () => {
    const p = frames[2].payload?.path ?? [];
    for (let i = 1; i < p.length; i++) expect(p[i]).toBeGreaterThanOrEqual(p[i - 1]);
    expect(frames[2].payload?.stepped).toBe(true);
  });

  it("各過程に増分の説明とハイライト", () => {
    frames.forEach((f) => {
      expect((f.payload?.increment ?? "").length).toBeGreaterThan(0);
    });
    expect(frames[1].highlights).toContain("proc-brownian");
  });
});
