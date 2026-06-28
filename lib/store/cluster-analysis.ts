import { initCentroids, kmeansIterate, type KmeansStep } from "@/lib/stats/clustering";
import type { Point2 } from "@/lib/stats/pca";
import { mulberry32 } from "@/lib/stats/random";
import { createTopicStore } from "./topicStore";

/** 4つの自然な塊からなる固定データ（決定的生成）。 */
export const CLUSTER_DATA: Point2[] = (() => {
  const rng = mulberry32(20241301);
  const gauss = () => {
    const u1 = Math.max(1e-12, rng());
    const u2 = rng();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
  const centers: Point2[] = [
    { x: -3, y: 3 },
    { x: 3, y: 3 },
    { x: -3, y: -3 },
    { x: 3, y: -3 },
  ];
  const pts: Point2[] = [];
  for (const c of centers) {
    for (let i = 0; i < 12; i++) pts.push({ x: c.x + gauss() * 0.9, y: c.y + gauss() * 0.9 });
  }
  return pts;
})();

/** クラスター分析ラボの操作値。 */
export type ClusterControls = {
  /** クラスター数 k。 */
  k: number;
};

/** クラスター分析ラボの派生値。 */
export type ClusterDerived = {
  /** データ点。 */
  points: Point2[];
  /** k-means 反復の各ステップ（コマ送り用）。 */
  steps: KmeansStep[];
  /** 収束後の WCSS。 */
  finalWcss: number;
  /** k=1..6 の収束後 WCSS（エルボー用）。 */
  wcssByK: number[];
};

/** 指定 k で決定的初期化して k-means を収束まで回す。 */
function runKmeans(points: readonly Point2[], k: number): KmeansStep[] {
  const init = initCentroids(points, k, mulberry32(1000 + k));
  return kmeansIterate(points, init);
}

/**
 * クラスター分析（H-3）トピックの Zustand ストア（single source of truth）。
 * Control 層（クラスター数 k スライダー）は action を呼び、Render 層（クラスター色分け散布図・重心・WCSS・
 * エルボー曲線・数式）は controls・derived を購読する。k を増やすと WCSS は単調減少（エルボーで適切な k）。
 * データは固定。frame は k-means 反復のステッパーが使う。
 */
export const useClusterStore = createTopicStore<ClusterControls, ClusterDerived>({
  initialControls: { k: 4 },
  derive: ({ k }) => {
    const steps = runKmeans(CLUSTER_DATA, k);
    const finalWcss = steps[steps.length - 1].wcss;
    const wcssByK = [1, 2, 3, 4, 5, 6].map((kk) => {
      const s = runKmeans(CLUSTER_DATA, kk);
      return s[s.length - 1].wcss;
    });
    return { points: CLUSTER_DATA, steps, finalWcss, wcssByK };
  },
});
