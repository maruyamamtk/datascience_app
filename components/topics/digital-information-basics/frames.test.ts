import { describe, expect, it } from "vitest";
import { buildBinaryFrames, STEP_BINARY, STEP_N } from "./frames";

describe("2 進数変換ステッパーのフレーム", () => {
  const frames = buildBinaryFrames();

  it("フレーム数は割り算の行数（13 → 4 回）", () => {
    expect(frames).toHaveLength(STEP_BINARY.length);
    expect(frames).toHaveLength(4);
  });

  it("すべてのコマに payload と callout がある", () => {
    for (const f of frames) {
      expect(f.payload).toBeDefined();
      expect(f.callout).toBeDefined();
      expect(f.highlights).toContain("row");
    }
  });

  it("revealed は 1,2,3,… と増える", () => {
    frames.forEach((f, i) => {
      expect(f.payload!.revealed).toBe(i + 1);
    });
  });

  it("binarySoFar が最終的に STEP_BINARY（1101）になる", () => {
    expect(frames.at(-1)!.payload!.binarySoFar).toBe(STEP_BINARY);
    expect(STEP_BINARY).toBe("1101");
    expect(STEP_N).toBe(13);
  });

  it("最後のコマだけ result をハイライト", () => {
    expect(frames.at(-1)!.highlights).toContain("result");
    for (const f of frames.slice(0, -1)) {
      expect(f.highlights).not.toContain("result");
    }
  });
});
