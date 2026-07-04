import { classicalMDS, distanceMatrix, distortDistances, kruskalStress } from "@/lib/stats/mds";
import type { Point2 } from "@/lib/stats/pca";
import { createTopicStore } from "./topicStore";

/** 真の «都市» 配置（この座標は MDS には渡さず、距離だけから復元する）。 */
export const TRUE_CITIES: { name: string; point: Point2 }[] = [
  { name: "A", point: { x: -3, y: 2 } },
  { name: "B", point: { x: 0, y: 3 } },
  { name: "C", point: { x: 3, y: 1.5 } },
  { name: "D", point: { x: 2.5, y: -2 } },
  { name: "E", point: { x: -1, y: -2.5 } },
  { name: "F", point: { x: -3, y: -0.5 } },
];

/** その他の多変量解析ラボの操作値。 */
export type MdsControls = {
  /** 距離に加える歪み distortion（大きいほど MDS の復元が崩れる）。 */
  distortion: number;
};

/** その他の多変量解析ラボの派生値。 */
export type MdsDerived = {
  /** 真の配置（表示・比較用）。 */
  cities: { name: string; point: Point2 }[];
  /** （歪ませた）距離行列。 */
  distances: number[][];
  /** 2次元 MDS の復元座標。 */
  coords: number[][];
  /** 復元のストレス。 */
  stress: number;
  /** 固有値（次元の寄与）。 */
  eigenvalues: number[];
};

/**
 * その他の多変量解析（H-5）トピックの Zustand ストア（single source of truth）。
 * Control 層（歪み distortion スライダー）は action を呼び、Render 層（距離行列ヒートマップ・MDS復元地図・
 * ストレス・数式）は controls・derived を購読する。歪みを増やすと復元がぼやけストレスが上がる。
 * frame は «距離→1次元→2次元復元» のステッパーが使う。
 */
export const useMdsStore = createTopicStore<MdsControls, MdsDerived>({
  initialControls: { distortion: 0 },
  derive: ({ distortion }) => {
    const base = distanceMatrix(TRUE_CITIES.map((c) => c.point));
    const distances = distortDistances(base, distortion);
    const { coords, eigenvalues } = classicalMDS(distances, 2);
    return {
      cities: TRUE_CITIES,
      distances,
      coords,
      stress: kruskalStress(distances, coords),
      eigenvalues,
    };
  },
});
