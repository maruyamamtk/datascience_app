import { describe, expect, it } from "vitest";
import { buildKaplanMeierFrames, DEMO } from "./frames";
import { kaplanMeier } from "@/lib/stats/survival";

describe("buildKaplanMeierFrames", () => {
  const frames = buildKaplanMeierFrames();
  const steps = kaplanMeier(DEMO);

  it("導入 + イベント時刻ごとのステップ", () => {
    expect(frames[0].payload?.stepIndex).toBe(-1);
    expect(frames.length).toBe(steps.length + 1);
  });

  it("イベント時刻は 2,3,5,8（打ち切り 4 は段差なし）", () => {
    const times = frames.slice(1).map((f) => f.payload?.time);
    expect(times).toEqual([2, 3, 5, 8]);
  });

  it("生存確率が積・極限で単調減少", () => {
    const surv = frames.slice(1).map((f) => f.payload!.survival);
    for (let i = 1; i < surv.length; i++) {
      expect(surv[i]).toBeLessThanOrEqual(surv[i - 1]);
    }
    // t=2: 5/6, t=3: 5/6·4/5=2/3
    expect(surv[0]).toBeCloseTo(5 / 6, 10);
    expect(surv[1]).toBeCloseTo(2 / 3, 10);
  });

  it("t=5 のリスク集合は3（打ち切り 4 が除外済み）", () => {
    expect(frames[3].payload?.time).toBe(5);
    expect(frames[3].payload?.atRisk).toBe(3);
  });

  it("各フレームにコールアウトとハイライト", () => {
    frames.forEach((f) => {
      expect((f.callout?.title ?? "").length).toBeGreaterThan(0);
      expect((f.highlights ?? []).length).toBeGreaterThan(0);
    });
  });
});
