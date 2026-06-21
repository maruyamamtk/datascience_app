import { describe, expect, it } from "vitest";
import {
  frameAt,
  isFirstFrame,
  isHighlighted,
  isLastFrame,
  stepTick,
  type VizFrame,
} from "./frame";

describe("isFirstFrame / isLastFrame", () => {
  it("先頭・末尾を判定する", () => {
    expect(isFirstFrame(0)).toBe(true);
    expect(isFirstFrame(1)).toBe(false);
    expect(isLastFrame(2, 3)).toBe(true);
    expect(isLastFrame(1, 3)).toBe(false);
  });

  it("負の index や count<=0 をクランプ相当で扱う", () => {
    expect(isFirstFrame(-1)).toBe(true);
    expect(isLastFrame(0, 0)).toBe(true); // フレームなし
  });
});

describe("stepTick", () => {
  it("末尾でなければ次フレームへ進む", () => {
    expect(stepTick(0, 3)).toEqual({ nextIndex: 1, reachedEnd: false });
    expect(stepTick(1, 3)).toEqual({ nextIndex: 2, reachedEnd: false });
  });

  it("末尾では index を据え置き reachedEnd=true を返す", () => {
    expect(stepTick(2, 3)).toEqual({ nextIndex: 2, reachedEnd: true });
  });

  it("フレームが無い場合も停止扱い", () => {
    expect(stepTick(0, 0)).toEqual({ nextIndex: 0, reachedEnd: true });
  });
});

describe("frameAt", () => {
  const frames: VizFrame<number>[] = [{ payload: 10, highlights: ["a"] }, { payload: 20 }];

  it("範囲内は該当フレーム、範囲外は undefined", () => {
    expect(frameAt(frames, 0)?.payload).toBe(10);
    expect(frameAt(frames, 1)?.payload).toBe(20);
    expect(frameAt(frames, 2)).toBeUndefined();
    expect(frameAt(frames, -1)).toBeUndefined();
  });
});

describe("isHighlighted", () => {
  const frame: VizFrame = { highlights: ["cur", "best"] };

  it("highlights に含まれるキーのみ true", () => {
    expect(isHighlighted(frame, "cur")).toBe(true);
    expect(isHighlighted(frame, "best")).toBe(true);
    expect(isHighlighted(frame, "other")).toBe(false);
  });

  it("frame や highlights が無ければ false", () => {
    expect(isHighlighted(undefined, "cur")).toBe(false);
    expect(isHighlighted({}, "cur")).toBe(false);
  });
});
