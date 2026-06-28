import { describe, expect, it } from "vitest";
import { fisherLda, generateTwoClasses } from "@/lib/stats/discriminant";
import { mulberry32 } from "@/lib/stats/random";
import { buildFisherFrames } from "./frames";

describe("buildFisherFrames", () => {
  const { g1, g2 } = generateTwoClasses({
    nPerClass: 200,
    separation: 6,
    spread: 1.2,
    rng: mulberry32(1),
  });
  const frames = buildFisherFrames(g1, g2, 19);

  it("steps ぶんのフレーム", () => {
    expect(frames).toHaveLength(19);
  });

  it("ちょうど1つの isBest フレーム", () => {
    expect(frames.filter((f) => f.payload?.isBest).length).toBe(1);
  });

  it("分離度の最大角度はフィッシャー判別軸の向きに近い（mod π）", () => {
    const best = frames.find((f) => f.payload?.isBest)!;
    const lda = fisherLda(g1, g2);
    const ldaAngle = Math.atan2(lda.direction[1], lda.direction[0]);
    const norm = (a: number) => ((a % Math.PI) + Math.PI) % Math.PI;
    const diff = Math.abs(norm(best.payload!.angle) - norm(ldaAngle));
    const d = Math.min(diff, Math.PI - diff);
    expect(d).toBeLessThan(0.25);
  });

  it("分離度は非負", () => {
    frames.forEach((f) => expect(f.payload?.criterion).toBeGreaterThanOrEqual(0));
  });
});
