import { describe, expect, it } from "vitest";
import { buildEigenvectorFrames, DEMO, PROBE_ANGLES } from "./frames";
import { apply2 } from "@/lib/stats/linear-algebra";

describe("buildEigenvectorFrames", () => {
  const frames = buildEigenvectorFrames();

  it("導入 + 探針角度ごとのステップ", () => {
    expect(frames[0].payload?.stepIndex).toBe(-1);
    expect(frames.length).toBe(PROBE_ANGLES.length + 1);
  });

  it("45° と 135° の探針だけが固有方向（像と一直線）", () => {
    const eigenAngles = frames
      .slice(1)
      .filter((f) => f.payload?.isEigen)
      .map((f) => f.payload?.angleDeg);
    expect(eigenAngles).toEqual([45, 135]);
  });

  it("固有方向の伸び率＝固有値（45°→3, 135°→1）", () => {
    const at = (deg: number) => frames.slice(1).find((f) => f.payload?.angleDeg === deg)?.payload;
    expect(at(45)?.scale).toBeCloseTo(3, 6);
    expect(at(135)?.scale).toBeCloseTo(1, 6);
    // A·v = λ·v を満たす
    const p45 = at(45)!;
    const av = apply2(DEMO, p45.probe);
    expect(av.x).toBeCloseTo(3 * p45.probe.x, 6);
    expect(av.y).toBeCloseTo(3 * p45.probe.y, 6);
  });

  it("固有方向でないフレームはなす角 > 0", () => {
    for (const f of frames.slice(1)) {
      if (!f.payload?.isEigen) expect(f.payload!.imageAngle).toBeGreaterThan(1e-3);
    }
  });

  it("各フレームにコールアウトとハイライト", () => {
    frames.forEach((f) => {
      expect((f.callout?.title ?? "").length).toBeGreaterThan(0);
      expect((f.highlights ?? []).length).toBeGreaterThan(0);
    });
  });
});
