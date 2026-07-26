import { describe, expect, it } from "vitest";
import { buildConvPoolFrames, STEPPER_CONV_OUT, STEPPER_POOL_OUT } from "./convPoolFrames";

describe("buildConvPoolFrames", () => {
  const frames = buildConvPoolFrames();

  it("畳み込み9コマ（3×3特徴マップ）+ プーリング4コマ（2×2出力）= 13コマを返す", () => {
    expect(STEPPER_CONV_OUT.length).toBe(3);
    expect(STEPPER_CONV_OUT[0].length).toBe(3);
    expect(STEPPER_POOL_OUT.length).toBe(2);
    expect(STEPPER_POOL_OUT[0].length).toBe(2);
    expect(frames).toHaveLength(13);
    expect(frames.filter((f) => f.payload?.phase === "conv")).toHaveLength(9);
    expect(frames.filter((f) => f.payload?.phase === "pool")).toHaveLength(4);
  });

  it("前半9コマがconv、後半4コマがpoolの順に並ぶ", () => {
    const phases = frames.map((f) => f.payload?.phase);
    expect(phases.slice(0, 9)).toEqual(Array(9).fill("conv"));
    expect(phases.slice(9)).toEqual(Array(4).fill("pool"));
  });

  it("全フレームに highlights と callout がある", () => {
    for (const f of frames) {
      expect(f.highlights && f.highlights.length).toBeGreaterThan(0);
      expect(f.callout?.body).toBeTruthy();
    }
  });

  it("最初のconvフレームは入力の3×3窓（9マス）+ 出力1マスをハイライトする", () => {
    const highlights = frames[0].highlights ?? [];
    expect(highlights.filter((h) => h.startsWith("in-"))).toHaveLength(9);
    expect(highlights.filter((h) => h.startsWith("out-"))).toHaveLength(1);
    expect(highlights).toContain("out-0-0");
  });

  it("最初のpoolフレームはconv出力の2×2窓（4マス）+ pool出力1マスをハイライトする", () => {
    const highlights = frames[9].highlights ?? [];
    expect(highlights.filter((h) => h.startsWith("out-"))).toHaveLength(4);
    expect(highlights.filter((h) => h.startsWith("pool-"))).toHaveLength(1);
    expect(highlights).toContain("pool-0-0");
  });

  it("最後のconvフレーム(9コマ目)は出力の右下(2,2)をハイライトする", () => {
    const highlights = frames[8].highlights ?? [];
    expect(highlights).toContain("out-2-2");
  });

  it("最後のpoolフレーム(13コマ目)はpool出力の右下(1,1)をハイライトする", () => {
    const highlights = frames[12].highlights ?? [];
    expect(highlights).toContain("pool-1-1");
  });
});
