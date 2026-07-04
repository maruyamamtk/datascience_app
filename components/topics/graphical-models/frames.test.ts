import { describe, expect, it } from "vitest";
import { buildStructureFrames } from "./frames";

describe("buildStructureFrames", () => {
  const frames = buildStructureFrames();

  it("5フレーム（連鎖2・分岐1・合流2）", () => {
    expect(frames.map((f) => f.payload?.structure)).toEqual([
      "chain",
      "chain",
      "fork",
      "collider",
      "collider",
    ]);
  });

  it("連鎖：周辺は相関、条件づけで d分離", () => {
    expect(Math.abs(frames[0].payload!.marginal)).toBeGreaterThan(0.4);
    expect(frames[0].payload!.dsep).toBe(false);
    expect(Math.abs(frames[1].payload!.partial)).toBeLessThan(0.1);
    expect(frames[1].payload!.dsep).toBe(true);
  });

  it("合流：周辺は独立（dsep）、条件づけで開く（非dsep・偏相関大）", () => {
    expect(Math.abs(frames[3].payload!.marginal)).toBeLessThan(0.1);
    expect(frames[3].payload!.dsep).toBe(true);
    expect(Math.abs(frames[4].payload!.partial)).toBeGreaterThan(0.3);
    expect(frames[4].payload!.dsep).toBe(false);
  });

  it("各フレームにコールアウトとハイライト", () => {
    frames.forEach((f) => {
      expect((f.callout?.title ?? "").length).toBeGreaterThan(0);
      expect((f.highlights ?? []).length).toBeGreaterThan(0);
    });
  });
});
