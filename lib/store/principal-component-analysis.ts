import {
  covariance2,
  eigenDecomposition2,
  explainedVarianceRatio,
  generateCorrelatedData,
  type Cov2,
  type Point2,
  type PrincipalComponent,
} from "@/lib/stats/pca";
import { mulberry32 } from "@/lib/stats/random";
import { createTopicStore } from "./topicStore";

const N = 80;
const SX = 2.4;
const SY = 1.1;

/** 主成分分析ラボの操作値。 */
export type PcaControls = {
  /** 2変数の相関 corr（大きいほど第1主成分に集中）。 */
  corr: number;
};

/** 主成分分析ラボの派生値。 */
export type PcaDerived = {
  /** 2次元データ点。 */
  points: Point2[];
  /** 共分散行列。 */
  cov: Cov2;
  /** 第1・第2主成分。 */
  pc1: PrincipalComponent;
  pc2: PrincipalComponent;
  /** 寄与率 [r1, r2]。 */
  ratios: number[];
};

/**
 * 主成分分析（H-1）トピックの Zustand ストア（single source of truth）。
 * Control 層（相関 corr スライダー）は action を呼び、Render 層（散布図・主成分軸・寄与率・数式）は
 * controls・derived を購読する。相関を上げると第1主成分軸にデータが集中し寄与率が上がる。
 * データは固定シードの決定的生成で corr にのみ依存して再現可能。frame は分散最大方向探索のステッパーが使う。
 */
export const usePcaStore = createTopicStore<PcaControls, PcaDerived>({
  initialControls: { corr: 0.8 },
  derive: ({ corr }) => {
    const points = generateCorrelatedData({
      n: N,
      corr,
      sx: SX,
      sy: SY,
      rng: mulberry32(20241101),
    });
    const cov = covariance2(points);
    const [pc1, pc2] = eigenDecomposition2(cov);
    return { points, cov, pc1, pc2, ratios: explainedVarianceRatio([pc1, pc2]) };
  },
});
