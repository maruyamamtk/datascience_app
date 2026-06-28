import { describe, expect, it } from "vitest";
import { buildCommunalityFrames } from "./frames";

describe("buildCommunalityFrames", () => {
  const names = ["A", "B", "C", "D"];
  const loadings = [0.8, 0.7, 0.6, 0.5];
  const frames = buildCommunalityFrames(names, loadings);

  it("変数の数ぶんのフレーム", () => {
    expect(frames).toHaveLength(4);
    expect(frames.map((f) => f.payload?.name)).toEqual(names);
  });

  it("共通性+独自性=1", () => {
    frames.forEach((f) => {
      expect((f.payload?.communality ?? 0) + (f.payload?.uniqueness ?? 0)).toBeCloseTo(1, 12);
    });
  });

  it("共通性は負荷²", () => {
    expect(frames[0].payload?.communality).toBeCloseTo(0.64, 10);
  });

  it("各フレームに変数ハイライト", () => {
    expect(frames[2].highlights).toContain("var-2");
  });
});
