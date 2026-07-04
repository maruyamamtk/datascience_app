import { describe, expect, it } from "vitest";
import { classicalMDS, distanceMatrix, distortDistances, kruskalStress } from "./mds";
import type { Point2 } from "./pca";

const SQUARE: Point2[] = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 3 },
  { x: 0, y: 3 },
];

describe("distanceMatrix", () => {
  it("対称・対角0・既知の距離", () => {
    const D = distanceMatrix(SQUARE);
    expect(D[0][0]).toBe(0);
    expect(D[0][1]).toBeCloseTo(4, 10);
    expect(D[0][2]).toBeCloseTo(5, 10); // 3-4-5
    expect(D[1][3]).toBeCloseTo(D[3][1], 12);
  });
});

describe("classicalMDS", () => {
  it("2次元配置は距離をほぼ完全再現（ストレス≈0）", () => {
    const D = distanceMatrix(SQUARE);
    const { coords } = classicalMDS(D, 2);
    expect(kruskalStress(D, coords)).toBeLessThan(1e-6);
  });

  it("復元座標間の距離が元の距離に一致（回転・鏡映は不問）", () => {
    const D = distanceMatrix(SQUARE);
    const { coords } = classicalMDS(D, 2);
    const d01 = Math.hypot(coords[0][0] - coords[1][0], coords[0][1] - coords[1][1]);
    expect(d01).toBeCloseTo(4, 4);
    const d02 = Math.hypot(coords[0][0] - coords[2][0], coords[0][1] - coords[2][1]);
    expect(d02).toBeCloseTo(5, 4);
  });

  it("1次元に落とすと（本来2次元の配置は）ストレスが増える", () => {
    const D = distanceMatrix(SQUARE);
    const s1 = kruskalStress(D, classicalMDS(D, 1).coords);
    const s2 = kruskalStress(D, classicalMDS(D, 2).coords);
    expect(s1).toBeGreaterThan(s2);
  });

  it("固有値は降順（第1が最大）", () => {
    const D = distanceMatrix(SQUARE);
    const { eigenvalues } = classicalMDS(D, 2);
    expect(eigenvalues[0]).toBeGreaterThanOrEqual(eigenvalues[1]);
  });
});

describe("kruskalStress", () => {
  it("完全一致の座標でストレス0", () => {
    const D = distanceMatrix(SQUARE);
    const coords = SQUARE.map((p) => [p.x, p.y]);
    expect(kruskalStress(D, coords)).toBeCloseTo(0, 10);
  });
});

describe("distortDistances", () => {
  it("歪みを加えると MDS のストレスが増える", () => {
    const D = distanceMatrix(SQUARE);
    const clean = kruskalStress(D, classicalMDS(D, 2).coords);
    const dirty = distortDistances(D, 1.5);
    const distorted = kruskalStress(dirty, classicalMDS(dirty, 2).coords);
    expect(distorted).toBeGreaterThan(clean);
  });
  it("scale=0 なら元の距離のまま", () => {
    const D = distanceMatrix(SQUARE);
    const same = distortDistances(D, 0);
    expect(same[0][2]).toBeCloseTo(D[0][2], 12);
  });
});
