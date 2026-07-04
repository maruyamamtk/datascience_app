import { describe, expect, it } from "vitest";
import { buildPeekingFrames, LOOK_SCHEDULE, PEEK_ALPHA } from "./frames";

describe("buildPeekingFrames", () => {
  const frames = buildPeekingFrames();

  it("スケジュールと同数のフレーム", () => {
    expect(frames.map((f) => f.payload?.looks)).toEqual([...LOOK_SCHEDULE]);
  });

  it("1回だけ見るときの過誤は名目 5% 付近", () => {
    expect(frames[0].payload!.fpRate).toBeLessThan(0.1);
  });

  it("覗く回数が増えるほど実効的な過誤は単調に増える", () => {
    const rates = frames.map((f) => f.payload!.fpRate);
    for (let i = 1; i < rates.length; i++) {
      expect(rates[i]).toBeGreaterThanOrEqual(rates[i - 1]);
    }
    // 最終（20回）は1回のときより明確に大きい
    expect(rates[rates.length - 1]).toBeGreaterThan(rates[0] + 0.05);
  });

  it("alpha は全フレーム共通で PEEK_ALPHA", () => {
    frames.forEach((f) => expect(f.payload?.alpha).toBe(PEEK_ALPHA));
  });

  it("各フレームにコールアウトとハイライト", () => {
    frames.forEach((f) => {
      expect((f.callout?.title ?? "").length).toBeGreaterThan(0);
      expect((f.highlights ?? []).length).toBeGreaterThan(0);
    });
  });
});
