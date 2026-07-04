import { describe, expect, it } from "vitest";
import { buildImputationFrames, TRUE_MEAN } from "./frames";

describe("buildImputationFrames", () => {
  const frames = buildImputationFrames();

  it("5段階（missing→complete→mean→regression→stochastic）", () => {
    expect(frames.map((f) => f.payload?.stage)).toEqual([
      "missing",
      "complete",
      "mean",
      "regression",
      "stochastic",
    ]);
  });

  it("完全ケースは平均が下振れ（MAR バイアス）", () => {
    expect(frames[1].payload!.meanBias).toBeLessThan(-0.3);
  });

  it("平均代入は SD 比が1未満（ばらつき縮小）", () => {
    expect(frames[2].payload!.sdRatio).toBeLessThan(1);
  });

  it("回帰代入は完全ケースより平均バイアスが小さい", () => {
    expect(Math.abs(frames[3].payload!.meanBias)).toBeLessThan(Math.abs(frames[1].payload!.meanBias));
  });

  it("確率的回帰代入は SD 比が回帰代入より1に近い", () => {
    const reg = Math.abs(frames[3].payload!.sdRatio - 1);
    const stoch = Math.abs(frames[4].payload!.sdRatio - 1);
    expect(stoch).toBeLessThan(reg);
  });

  it("真の平均は全フレーム共通", () => {
    frames.forEach((f) => expect(f.payload?.trueMean).toBeCloseTo(TRUE_MEAN, 8));
  });

  it("各フレームにコールアウトとハイライト", () => {
    frames.forEach((f) => {
      expect((f.callout?.title ?? "").length).toBeGreaterThan(0);
      expect((f.highlights ?? []).length).toBeGreaterThan(0);
    });
  });
});
