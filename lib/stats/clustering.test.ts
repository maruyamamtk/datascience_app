import { describe, expect, it } from "vitest";
import {
  assignClusters,
  dist2,
  initCentroids,
  kmeansIterate,
  kmeansStep,
  singleLinkageMerges,
  updateCentroids,
  withinClusterSumOfSquares,
} from "./clustering";
import type { Point2 } from "./pca";
import { mulberry32 } from "./random";

const THREE_BLOBS: Point2[] = [
  // 3つの離れた塊。
  { x: 0, y: 0 },
  { x: 0.5, y: 0.3 },
  { x: 0.2, y: -0.4 },
  { x: 10, y: 10 },
  { x: 10.5, y: 9.7 },
  { x: 9.8, y: 10.3 },
  { x: 0, y: 10 },
  { x: 0.4, y: 9.6 },
  { x: -0.3, y: 10.2 },
];

describe("assignClusters", () => {
  it("各点を最も近い重心に割り当てる", () => {
    const a = assignClusters(
      [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ],
      [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ],
    );
    expect(a).toEqual([0, 1]);
  });
});

describe("updateCentroids", () => {
  it("クラスターの平均が新しい重心", () => {
    const c = updateCentroids(
      [
        { x: 0, y: 0 },
        { x: 2, y: 4 },
      ],
      [0, 0],
      1,
      [{ x: 0, y: 0 }],
    );
    expect(c[0].x).toBeCloseTo(1, 10);
    expect(c[0].y).toBeCloseTo(2, 10);
  });
  it("空クラスターは前の重心を維持", () => {
    const c = updateCentroids([{ x: 1, y: 1 }], [0], 2, [
      { x: 0, y: 0 },
      { x: 9, y: 9 },
    ]);
    expect(c[1]).toEqual({ x: 9, y: 9 });
  });
});

describe("kmeansIterate", () => {
  it("WCSS はステップごとに減少（非増加）", () => {
    const init = initCentroids(THREE_BLOBS, 3, mulberry32(1));
    const steps = kmeansIterate(THREE_BLOBS, init);
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i].wcss).toBeLessThanOrEqual(steps[i - 1].wcss + 1e-9);
    }
  });

  it("3つの塊を3クラスターに正しく分ける（各塊が同一ラベル）", () => {
    const init = initCentroids(THREE_BLOBS, 3, mulberry32(7));
    const steps = kmeansIterate(THREE_BLOBS, init);
    const final = steps[steps.length - 1].assignments;
    // 塊1 (0,1,2) は同じラベル、塊2 (3,4,5) は同じ、塊3 (6,7,8) は同じ。
    expect(final[0]).toBe(final[1]);
    expect(final[1]).toBe(final[2]);
    expect(final[3]).toBe(final[4]);
    expect(final[6]).toBe(final[8]);
    // 異なる塊は異なるラベル。
    expect(final[0]).not.toBe(final[3]);
    expect(final[3]).not.toBe(final[6]);
  });

  it("収束したら割り当てが変化しない", () => {
    const init = initCentroids(THREE_BLOBS, 3, mulberry32(3));
    const steps = kmeansIterate(THREE_BLOBS, init);
    const last = steps[steps.length - 1];
    const again = kmeansStep(THREE_BLOBS, last.centroids);
    expect(again.assignments).toEqual(last.assignments);
  });
});

describe("withinClusterSumOfSquares", () => {
  it("重心に集まるほど小さい", () => {
    const tight = withinClusterSumOfSquares(
      [
        { x: 0, y: 0 },
        { x: 0.1, y: 0 },
      ],
      [0, 0],
      [{ x: 0.05, y: 0 }],
    );
    const loose = withinClusterSumOfSquares(
      [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
      ],
      [0, 0],
      [{ x: 2.5, y: 0 }],
    );
    expect(tight).toBeLessThan(loose);
  });
});

describe("singleLinkageMerges", () => {
  it("併合は n−1 回、距離は記録される", () => {
    const merges = singleLinkageMerges(THREE_BLOBS);
    expect(merges).toHaveLength(THREE_BLOBS.length - 1);
    merges.forEach((m) => expect(m.distance).toBeGreaterThanOrEqual(0));
  });
  it("最初の併合は最も近い2点", () => {
    const pts: Point2[] = [
      { x: 0, y: 0 },
      { x: 0.1, y: 0 },
      { x: 10, y: 10 },
    ];
    const merges = singleLinkageMerges(pts);
    // 最初は点0と点1（距離0.1）。
    expect(merges[0].distance).toBeCloseTo(0.1, 10);
  });
});

describe("dist2", () => {
  it("距離の二乗", () => {
    expect(dist2({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(25);
  });
});
