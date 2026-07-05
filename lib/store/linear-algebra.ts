import {
  columns2,
  det2,
  eigen2,
  matrixRank,
  norm2,
  trace2,
  transformPoints,
  unitCirclePoints,
  type Eigen2,
  type Mat2,
  type Vec2,
} from "@/lib/stats/linear-algebra";
import { createTopicStore } from "./topicStore";

/** 単位円を近似する点数（描画用）。 */
export const CIRCLE_N = 72;

/** 線形変換ラボの操作値＝2×2 行列の4成分。 */
export type LinAlgControls = {
  a: number;
  b: number;
  c: number;
  d: number;
};

/** 線形変換ラボの派生値。 */
export type LinAlgDerived = {
  matrix: Mat2;
  /** 変換後の単位円（＝楕円）の点列。 */
  ellipse: Vec2[];
  /** 基底ベクトルの行き先（列ベクトル）。 */
  columns: [Vec2, Vec2];
  det: number;
  trace: number;
  eigen: Eigen2;
  /** 階数（2＝正則、1以下＝つぶれる）。 */
  rank: number;
};

/**
 * 線形代数（A-1）トピックの Zustand ストア（single source of truth）。
 * Control 層（行列の4成分 a,b,c,d）は action を呼び、Render 層（LinearTransformLab の
 * 単位円→楕円・基底ベクトルの行き先・固有ベクトル方向・行列式=面積の強連動数式）は controls・derived を購読する。
 * a,d を大きくすると引き伸ばし、b,c でせん断、det<0 で «裏返し»、det=0 で線につぶれる（rank1）のを体感する。
 * frame は固有ベクトル探索ステッパーが使う。
 */
export const useLinearAlgebraStore = createTopicStore<LinAlgControls, LinAlgDerived>({
  initialControls: { a: 1.4, b: 0.6, c: 0.4, d: 1.2 },
  derive: ({ a, b, c, d }) => {
    const matrix: Mat2 = { a, b, c, d };
    return {
      matrix,
      ellipse: transformPoints(matrix, unitCirclePoints(CIRCLE_N)),
      columns: columns2(matrix),
      det: det2(matrix),
      trace: trace2(matrix),
      eigen: eigen2(matrix),
      rank: matrixRank([
        [a, b],
        [c, d],
      ]),
    };
  },
});

/** ベクトルの長さ（描画で軸スケールを決めるときに再利用）。 */
export { norm2 };
