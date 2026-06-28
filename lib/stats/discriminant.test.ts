import { describe, expect, it } from "vitest";
import {
  centroid,
  classify,
  fisherLda,
  generateTwoClasses,
  pooledWithinCovariance,
  score,
} from "./discriminant";
import type { Point2 } from "./pca";
import { mulberry32 } from "./random";

describe("centroid", () => {
  it("重心は平均", () => {
    const c = centroid([
      { x: 0, y: 0 },
      { x: 2, y: 4 },
    ]);
    expect(c.x).toBeCloseTo(1, 10);
    expect(c.y).toBeCloseTo(2, 10);
  });
});

describe("pooledWithinCovariance", () => {
  it("等しい群の共分散は各群の共分散に一致", () => {
    const g: Point2[] = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 2 },
    ];
    const pooled = pooledWithinCovariance(g, g);
    expect(pooled.sxx).toBeCloseTo(1, 10); // var of 0,2,1 = 1
  });
});

describe("fisherLda", () => {
  it("x方向に分離した2群（等方ノイズ）は判別方向が概ね x 軸", () => {
    const { g1, g2 } = generateTwoClasses({
      nPerClass: 200,
      separation: 6,
      spread: 1,
      rng: mulberry32(1),
    });
    const lda = fisherLda(g1, g2);
    expect(Math.abs(lda.direction[0])).toBeGreaterThan(Math.abs(lda.direction[1]));
  });

  it("しきい値は2群の射影平均の中点", () => {
    const { g1, g2 } = generateTwoClasses({
      nPerClass: 100,
      separation: 5,
      spread: 1,
      rng: mulberry32(2),
    });
    const lda = fisherLda(g1, g2);
    const s1 = score(lda.mean1, lda.direction);
    const s2 = score(lda.mean2, lda.direction);
    expect(lda.threshold).toBeCloseTo((s1 + s2) / 2, 10);
  });
});

describe("classify（誤判別率）", () => {
  it("よく分離した群は誤判別率が低い", () => {
    const { g1, g2 } = generateTwoClasses({
      nPerClass: 200,
      separation: 8,
      spread: 1,
      rng: mulberry32(3),
    });
    const lda = fisherLda(g1, g2);
    const conf = classify(g1, g2, lda);
    expect(conf.errorRate).toBeLessThan(0.02);
  });

  it("重なった群は誤判別率が高い", () => {
    const { g1, g2 } = generateTwoClasses({
      nPerClass: 200,
      separation: 0.5,
      spread: 2,
      rng: mulberry32(4),
    });
    const lda = fisherLda(g1, g2);
    const conf = classify(g1, g2, lda);
    expect(conf.errorRate).toBeGreaterThan(0.2);
  });

  it("混同行列の合計は標本数に一致", () => {
    const { g1, g2 } = generateTwoClasses({
      nPerClass: 50,
      separation: 4,
      spread: 1,
      rng: mulberry32(5),
    });
    const lda = fisherLda(g1, g2);
    const c = classify(g1, g2, lda);
    expect(c.correct1 + c.wrong1).toBe(50);
    expect(c.correct2 + c.wrong2).toBe(50);
  });

  it("分離を上げると誤判別率は下がる", () => {
    const lda1 = (() => {
      const { g1, g2 } = generateTwoClasses({
        nPerClass: 150,
        separation: 2,
        spread: 1.5,
        rng: mulberry32(6),
      });
      return classify(g1, g2, fisherLda(g1, g2)).errorRate;
    })();
    const lda2 = (() => {
      const { g1, g2 } = generateTwoClasses({
        nPerClass: 150,
        separation: 6,
        spread: 1.5,
        rng: mulberry32(6),
      });
      return classify(g1, g2, fisherLda(g1, g2)).errorRate;
    })();
    expect(lda2).toBeLessThan(lda1);
  });
});
