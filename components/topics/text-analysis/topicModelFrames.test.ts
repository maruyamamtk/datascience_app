import { describe, expect, it } from "vitest";
import { preprocessCorpus, runSimpleTopicModel, tfIdfMatrix } from "@/lib/stats/text-analysis";
import { buildTopicModelFrames } from "./topicModelFrames";

describe("buildTopicModelFrames", () => {
  const docs = preprocessCorpus();
  const { matrix } = tfIdfMatrix(docs);
  const steps = runSimpleTopicModel(matrix, 2, 3);

  it("フレーム数はイテレーション数と一致する", () => {
    const frames = buildTopicModelFrames(steps);
    expect(frames).toHaveLength(steps.length);
  });

  it("1フレーム目は changedFromPrev が全て false（前回が無いので比較対象なし）", () => {
    const frames = buildTopicModelFrames(steps);
    expect(frames[0].payload?.changedFromPrev.every((c) => c === false)).toBe(true);
  });

  it("全フレームに callout がある", () => {
    buildTopicModelFrames(steps).forEach((f) => expect(f.callout).toBeDefined());
  });
});
