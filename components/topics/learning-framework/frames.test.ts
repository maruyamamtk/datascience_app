import { describe, expect, it } from "vitest";
import { STEP_M } from "@/lib/store/learning-framework";
import { buildBiasVarianceFrames } from "./frames";

describe("バイアス分散ステッパーのフレーム列", () => {
  const frames = buildBiasVarianceFrames();

  it("フィット STEP_M 本 ＋ まとめ 1 コマ", () => {
    expect(frames).toHaveLength(STEP_M + 1);
  });

  it("フィットは 1 コマごとに 1 本ずつ増える", () => {
    for (let k = 0; k < STEP_M; k++) {
      expect(frames[k].payload!.drawnFits).toHaveLength(k + 1);
      expect(frames[k].payload!.showDecomp).toBe(false);
      expect(frames[k].payload!.meanFit).toBeNull();
      expect(frames[k].highlights).toContain("fit");
    }
  });

  it("最終コマだけ平均フィットと分解を持つ", () => {
    const last = frames[frames.length - 1].payload!;
    expect(last.showDecomp).toBe(true);
    expect(last.meanFit).not.toBeNull();
    expect(last.drawnFits).toHaveLength(STEP_M);
    expect(last.avgBias2).toBeGreaterThanOrEqual(0);
    expect(last.avgVariance).toBeGreaterThan(0); // 複雑なモデルは分散を持つ
    expect(frames[frames.length - 1].highlights).toContain("mean");
  });

  it("全コマに真の関数曲線とコールアウトがある", () => {
    for (const f of frames) {
      expect(f.payload!.truthCurve.length).toBeGreaterThan(0);
      expect(f.callout).toBeTruthy();
    }
  });
});
