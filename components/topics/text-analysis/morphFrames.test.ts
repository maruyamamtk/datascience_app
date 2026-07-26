import { describe, expect, it } from "vitest";
import { JA_DICTIONARY, greedySegment } from "@/lib/stats/text-analysis";
import { buildMorphFrames } from "./morphFrames";

describe("buildMorphFrames", () => {
  it("フレーム数は分かち書き結果のトークン数と一致する", () => {
    const sentence = "データサイエンスが好き";
    const tokens = greedySegment(sentence, JA_DICTIONARY);
    const frames = buildMorphFrames(sentence, JA_DICTIONARY);
    expect(frames).toHaveLength(tokens.length);
  });

  it("各フレームの payload.chosen は貪欲分かち書きの対応するトークンと一致する", () => {
    const sentence = "統計と機械学習を学ぶ";
    const tokens = greedySegment(sentence, JA_DICTIONARY);
    const frames = buildMorphFrames(sentence, JA_DICTIONARY);
    frames.forEach((f, i) => {
      expect(f.payload?.chosen).toBe(tokens[i]);
    });
  });

  it("全フレームに callout がある（近傍コールアウト必須）", () => {
    const frames = buildMorphFrames("機械学習は面白い", JA_DICTIONARY);
    frames.forEach((f) => expect(f.callout).toBeDefined());
  });
});
