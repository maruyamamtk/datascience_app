import { describe, expect, it } from "vitest";
import { tokenize } from "@/lib/stats/text-analysis";
import { buildPreprocessFrames } from "./preprocessFrames";

describe("buildPreprocessFrames", () => {
  it("フレーム数 = 1(トークン化) + トークン数(ストップワード判定) + 残った語数(ステミング)", () => {
    const sentence = "machine learning is a part of data science";
    const tokens = tokenize(sentence);
    const frames = buildPreprocessFrames(sentence);
    const stopwordFrames = frames.filter((f) => f.payload?.phase === "stopword");
    const stemFrames = frames.filter((f) => f.payload?.phase === "stem");
    expect(stopwordFrames).toHaveLength(tokens.length);
    expect(stemFrames.length).toBeLessThan(tokens.length); // ストップワードが除かれた分だけ少ない
    expect(frames[0].payload?.phase).toBe("tokenize");
  });

  it("全フレームに callout がある", () => {
    const frames = buildPreprocessFrames("data science combines statistics and programming");
    frames.forEach((f) => expect(f.callout).toBeDefined());
  });
});
