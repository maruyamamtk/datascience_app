import { describe, expect, it } from "vitest";
import { nonMaxSuppression } from "@/lib/stats/image-analysis";
import { buildNmsFrames, NMS_BOXES, NMS_IOU_THRESHOLD } from "./nmsFrames";

describe("buildNmsFrames", () => {
  const frames = buildNmsFrames();

  it("2つのクラスタから2ステップ（各クラスタの最高スコアを1回ずつ採用）になる", () => {
    expect(frames.length).toBe(2);
  });

  it("1ステップ目はクラスタA最高スコアの候補①（index 0）を採用し、②③を抑制する", () => {
    const f = frames[0];
    expect(f.payload!.keepIndex).toBe(0);
    expect(f.payload!.suppressedIndices.sort()).toEqual([1, 2]);
  });

  it("2ステップ目はクラスタB最高スコアの候補④（index 3）を採用し、⑤を抑制する", () => {
    const f = frames[1];
    expect(f.payload!.keepIndex).toBe(3);
    expect(f.payload!.suppressedIndices).toEqual([4]);
  });

  it("最終ステップの remainingIndices は空", () => {
    expect(frames[frames.length - 1].payload!.remainingIndices).toEqual([]);
  });

  it("highlights に keep-<index> と suppress-<index> が含まれる", () => {
    expect(frames[0].highlights).toContain("keep-0");
    expect(frames[0].highlights).toContain("suppress-1");
    expect(frames[0].highlights).toContain("suppress-2");
  });

  it("nonMaxSuppression の kept と一致する（回帰チェック）", () => {
    const { kept } = nonMaxSuppression(NMS_BOXES, NMS_IOU_THRESHOLD);
    expect(kept).toEqual([0, 3]);
  });

  it("全フレームに callout がある", () => {
    for (const f of frames) expect(f.callout).toBeDefined();
  });
});
