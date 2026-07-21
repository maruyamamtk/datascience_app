import { describe, expect, it } from "vitest";
import { argminBy, DATA_SEED, fitNestedModels, generateDataset } from "@/lib/stats/model-selection-criteria";
import { buildCriteriaFrames } from "./frames";

describe("buildCriteriaFrames", () => {
  const dataset = generateDataset(DATA_SEED);
  const models = fitNestedModels(dataset);
  const frames = buildCriteriaFrames(models);
  const n = models.length;

  it("overview(1)+各モデル(n)+summary(1)のフレーム数になる", () => {
    expect(frames.length).toBe(n + 2);
  });

  it("先頭フレームはoverviewで、revealedは空", () => {
    expect(frames[0].payload?.step).toBe("overview");
    expect(frames[0].payload?.revealed).toEqual([]);
    expect(frames[0].highlights).toEqual([]);
  });

  it("中間フレームはmodelで、highlightsにcriteria-model-kを含み、revealedが1つずつ伸びる", () => {
    for (let k = 0; k < n; k++) {
      const f = frames[k + 1];
      expect(f.payload?.step).toBe("model");
      expect(f.highlights).toEqual([`criteria-model-${k}`]);
      expect(f.payload?.revealed.length).toBe(k + 1);
      expect(f.payload?.current?.k).toBe(k);
    }
  });

  it("最終フレームはsummaryで、aicBest/bicBest/cpBestが計算層のargminByと一致する", () => {
    const last = frames[frames.length - 1];
    expect(last.payload?.step).toBe("summary");
    expect(last.payload?.aicBest).toEqual(argminBy(models, "aic"));
    expect(last.payload?.bicBest).toEqual(argminBy(models, "bic"));
    expect(last.payload?.cpBest).toEqual(argminBy(models, "cp"));
  });

  it("このデータセットではAICとBICの最良モデルが実際に異なる(要約フレームのnoteで説明する分岐の前提)", () => {
    const last = frames[frames.length - 1];
    expect(last.payload?.aicBest?.k).not.toBe(last.payload?.bicBest?.k);
  });

  it("最後のモデルフレームのrevealedは全モデルを含む(summaryのallと一致)", () => {
    const lastModelFrame = frames[n];
    const summary = frames[frames.length - 1];
    expect(lastModelFrame.payload?.revealed).toEqual(summary.payload?.all);
  });

  it("最後のフレームのhighlightsは全criteria-model-kのkeyを含む", () => {
    const last = frames[frames.length - 1];
    for (let k = 0; k < n; k++) {
      expect(last.highlights).toContain(`criteria-model-${k}`);
    }
  });
});
