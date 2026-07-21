import { describe, expect, it } from "vitest";
import {
  CLASS_LABELS,
  CONFUSION_MATRIX,
  macroAverageOf,
  microAverageOf,
  perClassMetricsOf,
  weightedAverageOf,
} from "@/lib/stats/multiclass-metrics";
import { buildOvrFrames } from "./frames";

describe("buildOvrFrames", () => {
  const frames = buildOvrFrames(CONFUSION_MATRIX, CLASS_LABELS);
  const n = CLASS_LABELS.length;

  it("overview(1)+各クラス(n)+summary(1)のフレーム数になる", () => {
    expect(frames.length).toBe(n + 2);
  });

  it("先頭フレームはoverviewで、revealedは空", () => {
    expect(frames[0].payload?.step).toBe("overview");
    expect(frames[0].payload?.revealed).toEqual([]);
    expect(frames[0].highlights).toEqual([]);
  });

  it("中間フレームはclassで、highlightsにovr-class-kを含み、revealedが1つずつ伸びる", () => {
    for (let k = 0; k < n; k++) {
      const f = frames[k + 1];
      expect(f.payload?.step).toBe("class");
      expect(f.highlights).toEqual([`ovr-class-${k}`]);
      expect(f.payload?.revealed.length).toBe(k + 1);
      expect(f.payload?.current?.index).toBe(k);
    }
  });

  it("最終フレームはsummaryで、macro/micro/weightedが計算層と一致する", () => {
    const last = frames[frames.length - 1];
    const perClass = perClassMetricsOf(CONFUSION_MATRIX, CLASS_LABELS);
    expect(last.payload?.step).toBe("summary");
    expect(last.payload?.macro).toEqual(macroAverageOf(perClass));
    expect(last.payload?.micro).toEqual(microAverageOf(perClass));
    expect(last.payload?.weighted).toEqual(weightedAverageOf(perClass));
  });

  it("最後のクラスフレームのrevealedは全クラスを含む(summaryのallと一致)", () => {
    const lastClassFrame = frames[n];
    const summary = frames[frames.length - 1];
    expect(lastClassFrame.payload?.revealed).toEqual(summary.payload?.all);
  });

  it("最後のフレームのhighlightsは全ovr-class-kのkeyを含む", () => {
    const last = frames[frames.length - 1];
    for (let k = 0; k < n; k++) {
      expect(last.highlights).toContain(`ovr-class-${k}`);
    }
  });
});
