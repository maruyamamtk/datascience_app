import { describe, expect, it } from "vitest";
import { buildSequenceFrames, STEPPER_XS } from "./sequenceFrames";

describe("buildSequenceFrames", () => {
  it("RNNモード: 系列長と同じ数のフレームを返し、全てrnnペイロードを持つ", () => {
    const frames = buildSequenceFrames("rnn");
    expect(frames).toHaveLength(STEPPER_XS.length);
    for (const f of frames) {
      expect(f.payload?.mode).toBe("rnn");
      expect(f.payload?.rnn).toBeDefined();
      expect(f.payload?.lstm).toBeUndefined();
    }
  });

  it("LSTMモード: 系列長と同じ数のフレームを返し、全てlstmペイロードを持つ", () => {
    const frames = buildSequenceFrames("lstm");
    expect(frames).toHaveLength(STEPPER_XS.length);
    for (const f of frames) {
      expect(f.payload?.mode).toBe("lstm");
      expect(f.payload?.lstm).toBeDefined();
      expect(f.payload?.rnn).toBeUndefined();
    }
  });

  it("各フレームのtは1から始まり1ずつ増える", () => {
    const frames = buildSequenceFrames("rnn");
    expect(frames.map((f) => f.payload?.t)).toEqual([1, 2, 3, 4, 5]);
  });

  it("LSTMモードのforgetゲートはステップごとに異なる値を取る（xの符号に応じて開閉する）", () => {
    const frames = buildSequenceFrames("lstm");
    const fValues = frames.map((f) => f.payload?.lstm?.f ?? -1);
    // 全部同じ値ではない（実際にゲートが動いている）ことを確認。
    const uniqueRounded = new Set(fValues.map((v) => v.toFixed(3)));
    expect(uniqueRounded.size).toBeGreaterThan(1);
    // 正のxで開き気味・負のxで閉じ気味という設計どおりの傾向になっているか（wf=0.9>0のため）。
    expect(fValues[0]).toBeGreaterThan(fValues[3]); // x=1.5 (idx0) vs x=-1.8 (idx3)
  });

  it("全フレームに highlights と callout がある", () => {
    for (const mode of ["rnn", "lstm"] as const) {
      for (const f of buildSequenceFrames(mode)) {
        expect(f.highlights && f.highlights.length).toBeGreaterThan(0);
        expect(f.callout?.body).toBeTruthy();
      }
    }
  });
});
