import { describe, expect, it } from "vitest";
import { naturalFrequencies } from "@/lib/stats/bayes";
import { buildBayesFrames } from "./frames";

describe("buildBayesFrames", () => {
  const freq = naturalFrequencies({ prior: 0.01, sensitivity: 0.9, specificity: 0.91 }, 1000);
  const frames = buildBayesFrames(freq);

  it("4段階（母集団→病気→検査→事後）のフレームを作る", () => {
    expect(frames).toHaveLength(4);
    expect(frames.map((f) => f.payload?.stage)).toEqual([
      "population",
      "disease",
      "test",
      "posterior",
    ]);
  });

  it("各フレームにコールアウトとハイライトが付く", () => {
    for (const f of frames) {
      expect(f.callout?.body).toBeTruthy();
      expect((f.highlights ?? []).length).toBeGreaterThan(0);
    }
  });

  it("事後確率は陽性者の中の真陽性割合 TP/(TP+FP)", () => {
    const post = frames[3].payload?.posterior ?? Number.NaN;
    expect(post).toBeCloseTo(freq.tp / freq.positives, 10);
    // 有病率1%・感度90%・特異度91% は陽性的中率が約9%（条件付き確率の罠）。
    expect(post).toBeGreaterThan(0.05);
    expect(post).toBeLessThan(0.15);
  });

  it("最終フレームは真陽性・偽陽性を強調する", () => {
    expect(frames[3].highlights).toContain("tp");
    expect(frames[3].highlights).toContain("fp");
  });
});
