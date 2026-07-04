import { describe, expect, it } from "vitest";
import { buildRddFrames, RDD_TRUE_EFFECT } from "./frames";

describe("buildRddFrames", () => {
  const frames = buildRddFrames();

  it("4段階（scatter→left→right→jump）", () => {
    expect(frames.map((f) => f.payload?.stage)).toEqual(["scatter", "left", "right", "jump"]);
  });

  it("left フィットは② から、right フィットは③ から現れる", () => {
    expect(frames[0].payload?.left).toBeUndefined();
    expect(frames[1].payload?.left).toBeDefined();
    expect(frames[1].payload?.right).toBeUndefined();
    expect(frames[2].payload?.right).toBeDefined();
  });

  it("ジャンプは最終フレームのみ、真の効果に近い", () => {
    expect(frames[3].payload?.jump).toBeDefined();
    expect(Math.abs((frames[3].payload!.jump as number) - RDD_TRUE_EFFECT)).toBeLessThan(1);
  });

  it("各フレームにコールアウトとハイライト", () => {
    frames.forEach((f) => {
      expect((f.callout?.title ?? "").length).toBeGreaterThan(0);
      expect((f.highlights ?? []).length).toBeGreaterThan(0);
    });
  });
});
