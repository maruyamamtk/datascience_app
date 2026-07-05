import { describe, expect, it } from "vitest";
import {
  angleBetweenDeg,
  apply2,
  columns2,
  det2,
  eigen2,
  matrixRank,
  norm2,
  normalize2,
  trace2,
  transformPoints,
  unitCirclePoints,
  type Mat2,
} from "./linear-algebra";

describe("apply2 / det2 / trace2", () => {
  it("恒等行列はベクトルを変えない", () => {
    const I: Mat2 = { a: 1, b: 0, c: 0, d: 1 };
    expect(apply2(I, { x: 3, y: -2 })).toEqual({ x: 3, y: -2 });
    expect(det2(I)).toBe(1);
    expect(trace2(I)).toBe(2);
  });

  it("行列とベクトルの積が定義通り", () => {
    const M: Mat2 = { a: 2, b: 1, c: 0, d: 3 };
    // [[2,1],[0,3]]·(1,1) = (3,3)
    expect(apply2(M, { x: 1, y: 1 })).toEqual({ x: 3, y: 3 });
  });

  it("行列式 = ad − bc（面積拡大率）", () => {
    expect(det2({ a: 2, b: 0, c: 0, d: 3 })).toBe(6); // 2×3 に引き伸ばす → 面積6倍
    expect(det2({ a: 1, b: 2, c: 2, d: 4 })).toBe(0); // 特異（つぶれる）
    expect(det2({ a: 0, b: -1, c: 1, d: 0 })).toBe(1); // 90°回転は面積保存
  });
});

describe("columns2", () => {
  it("列 = 基底ベクトルの行き先", () => {
    const M: Mat2 = { a: 2, b: 1, c: -1, d: 3 };
    const [e1, e2] = columns2(M);
    expect(e1).toEqual({ x: 2, y: -1 }); // (1,0) の行き先
    expect(e2).toEqual({ x: 1, y: 3 }); // (0,1) の行き先
    // 列ベクトルの張る平行四辺形の（符号付き）面積 = det
    expect(e1.x * e2.y - e1.y * e2.x).toBe(det2(M));
  });
});

describe("unitCirclePoints / transformPoints", () => {
  it("単位円上の点はすべて長さ1", () => {
    for (const p of unitCirclePoints(16)) {
      expect(norm2(p)).toBeCloseTo(1, 10);
    }
  });

  it("対角行列は円を軸方向に引き伸ばして楕円にする", () => {
    const M: Mat2 = { a: 3, b: 0, c: 0, d: 1 };
    const out = transformPoints(M, unitCirclePoints(4));
    // (1,0)→(3,0), (0,1)→(0,1)
    expect(out[0].x).toBeCloseTo(3, 10);
    expect(out[1].y).toBeCloseTo(1, 10);
  });
});

describe("angleBetweenDeg", () => {
  it("直交ベクトルは90°、平行は0°、反平行は180°", () => {
    expect(angleBetweenDeg({ x: 1, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(90, 10);
    expect(angleBetweenDeg({ x: 1, y: 0 }, { x: 5, y: 0 })).toBeCloseTo(0, 10);
    expect(angleBetweenDeg({ x: 1, y: 0 }, { x: -3, y: 0 })).toBeCloseTo(180, 10);
  });

  it("零ベクトルは NaN", () => {
    expect(angleBetweenDeg({ x: 0, y: 0 }, { x: 1, y: 0 })).toBeNaN();
  });
});

describe("normalize2", () => {
  it("長さ1に正規化する", () => {
    expect(norm2(normalize2({ x: 3, y: 4 }))).toBeCloseTo(1, 10);
  });
});

describe("eigen2", () => {
  it("対称行列 [[2,1],[1,2]] は固有値 3,1・固有ベクトル ±45°", () => {
    const e = eigen2({ a: 2, b: 1, c: 1, d: 2 });
    expect(e.real).toBe(true);
    expect(e.values[0]).toBeCloseTo(3, 10);
    expect(e.values[1]).toBeCloseTo(1, 10);
    // λ=3 の固有ベクトルは (1,1)/√2、λ=1 は (1,-1)/√2 の向き
    expect(Math.abs(e.vectors[0].x)).toBeCloseTo(Math.SQRT1_2, 10);
    expect(Math.abs(e.vectors[0].y)).toBeCloseTo(Math.SQRT1_2, 10);
    // 固有方程式 A·v = λ·v を満たす
    const av = apply2({ a: 2, b: 1, c: 1, d: 2 }, e.vectors[0]);
    expect(av.x).toBeCloseTo(3 * e.vectors[0].x, 10);
    expect(av.y).toBeCloseTo(3 * e.vectors[0].y, 10);
  });

  it("対角行列は対角成分が固有値", () => {
    const e = eigen2({ a: 5, b: 0, c: 0, d: 2 });
    expect(e.values).toEqual([5, 2]);
  });

  it("固有値の和 = トレース、積 = 行列式", () => {
    const M: Mat2 = { a: 4, b: 1, c: 2, d: 3 };
    const e = eigen2(M);
    expect(e.values[0] + e.values[1]).toBeCloseTo(trace2(M), 10);
    expect(e.values[0] * e.values[1]).toBeCloseTo(det2(M), 10);
  });

  it("回転行列（判別式<0）は実固有値を持たない", () => {
    // 90°回転 [[0,-1],[1,0]]: tr=0, det=1, disc=-4
    const e = eigen2({ a: 0, b: -1, c: 1, d: 0 });
    expect(e.real).toBe(false);
    expect(e.discriminant).toBeLessThan(0);
  });
});

describe("matrixRank", () => {
  it("正則行列はフルランク", () => {
    expect(matrixRank([[1, 0], [0, 1]])).toBe(2);
    expect(matrixRank([[2, 1], [1, 3]])).toBe(2);
  });

  it("行が従属だと階数が落ちる", () => {
    expect(matrixRank([[1, 2], [2, 4]])).toBe(1); // 2行目 = 2×1行目
    expect(matrixRank([[0, 0], [0, 0]])).toBe(0);
  });

  it("3×3 でも従属を検出する", () => {
    // 3行目 = 1行目 + 2行目 → 階数2
    expect(
      matrixRank([
        [1, 0, 1],
        [0, 1, 1],
        [1, 1, 2],
      ]),
    ).toBe(2);
    expect(
      matrixRank([
        [1, 2, 3],
        [0, 1, 4],
        [5, 6, 0],
      ]),
    ).toBe(3);
  });
});
