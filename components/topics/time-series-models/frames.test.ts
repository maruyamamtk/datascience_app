import { describe, expect, it } from "vitest";
import { buildModelFrames, GALLERY_MAXLAG } from "./frames";

describe("buildModelFrames", () => {
  const frames = buildModelFrames();

  it("4モデル（white/ar/ma/walk）の順", () => {
    expect(frames).toHaveLength(4);
    expect(frames.map((f) => f.payload?.kind)).toEqual(["white", "ar", "ma", "walk"]);
  });

  it("各フレームは ρ(0)=1、長さ maxLag+1 のACF", () => {
    frames.forEach((f) => {
      expect(f.payload?.acf).toHaveLength(GALLERY_MAXLAG + 1);
      expect(f.payload?.acf[0]).toBeCloseTo(1, 10);
    });
  });

  it("AR(1) のACFはMA(1)よりラグ4で強い（だらだら減衰 vs 早く切れる）", () => {
    const ar = frames[1].payload!.acf;
    const ma = frames[2].payload!.acf;
    expect(Math.abs(ar[4])).toBeGreaterThan(Math.abs(ma[4]));
  });

  it("MA(1) はラグ2以降ほぼ0（記憶が有限）", () => {
    const ma = frames[2].payload!.acf;
    expect(Math.abs(ma[3])).toBeLessThan(0.15);
  });

  it("ランダムウォークは非定常、ACFが減衰しにくい（ラグ8でも高い）", () => {
    const walk = frames[3].payload!;
    expect(walk.stationary).toBe(false);
    expect(Math.abs(walk.acf[8])).toBeGreaterThan(0.4);
  });

  it("ホワイトノイズのみ定常でラグ1がほぼ0", () => {
    expect(frames[0].payload?.stationary).toBe(true);
    expect(Math.abs(frames[0].payload!.acf[1])).toBeLessThan(0.2);
  });

  it("各フレームにコールアウトとハイライト", () => {
    frames.forEach((f) => {
      expect((f.callout?.title ?? "").length).toBeGreaterThan(0);
      expect((f.highlights ?? []).length).toBeGreaterThan(0);
    });
  });
});
