import { describe, expect, it } from "vitest";
import { buildEdgeFrames, STEPPER_OUTPUT } from "./edgeFrames";

describe("buildEdgeFrames", () => {
  const frames = buildEdgeFrames();

  it("5x5入力・3x3フィルタで3x3=9コマになる", () => {
    expect(frames.length).toBe(9);
  });

  it("各フレームは入力9マス+出力1マス=10個のハイライトを持つ", () => {
    for (const f of frames) {
      expect(f.highlights?.length).toBe(10);
    }
  });

  it("フレームのpayload.valueはSTEPPER_OUTPUTと一致する", () => {
    for (const f of frames) {
      const { row, col, value } = f.payload!;
      expect(value).toBeCloseTo(STEPPER_OUTPUT[row][col], 8);
    }
  });

  it("最初と最後のフレームにcalloutがある", () => {
    expect(frames[0].callout).toBeDefined();
    expect(frames[frames.length - 1].callout).toBeDefined();
  });

  it("左端の窓（境界を含まない）は0に近い値になる", () => {
    // 入力: 列0,1が暗(10)・列2-4が明(200)。左端窓(0,0)は列0-2で境界を含む。
    // 一方 col=2（右端窓、列2-4）は完全に明るい領域内で一様なので0になるはず。
    const rightmost = frames.filter((f) => f.payload!.col === 2);
    for (const f of rightmost) {
      expect(f.payload!.value).toBeCloseTo(0, 8);
    }
  });

  it("境界をまたぐ窓（col=0）は正の大きな値になる", () => {
    const leftmost = frames.filter((f) => f.payload!.col === 0);
    for (const f of leftmost) {
      expect(f.payload!.value).toBeGreaterThan(0);
    }
  });
});
