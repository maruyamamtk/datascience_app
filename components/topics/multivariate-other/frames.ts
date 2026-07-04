/**
 * 多次元尺度構成法（MDS）が «距離だけ» から地図を復元する過程をコマ送りで見せるフレーム列ビルダー
 * （計算層・純関数）。①距離のみ ②1次元復元 ③2次元復元 と段階的に次元を増やし、ストレスが下がるのを提示。
 * 副作用なし（Vitest 対象）。描画（MdsBuildStepper.tsx）はこの結果を購読するだけ。
 */

import type { VizFrame } from "@/components/viz";
import { classicalMDS, kruskalStress } from "@/lib/stats/mds";

/** 各フレーム（ある復元段階）のスナップショット。 */
export type MdsStagePayload = {
  /** 復元に使った次元数（0=距離のみ）。 */
  dim: number;
  /** 復元座標（dim=0 のときは空）。各点 [x] または [x,y]。 */
  coords: number[][];
  /** ストレス（dim>=1 のとき）。 */
  stress: number;
};

/** 距離行列から «距離のみ→1D→2D» の3フレームを作る。 */
export function buildMdsFrames(
  distances: readonly (readonly number[])[],
): VizFrame<MdsStagePayload>[] {
  const mds1 = classicalMDS(distances, 1);
  const mds2 = classicalMDS(distances, 2);
  const s1 = kruskalStress(distances, mds1.coords);
  const s2 = kruskalStress(distances, mds2.coords);

  return [
    {
      payload: { dim: 0, coords: [], stress: Number.NaN },
      highlights: ["distance"],
      callout: {
        title: "① 分かっているのは «点どうしの距離» だけ",
        body: "各ペアの距離（非類似度）の表。座標は分からない。ここから «地図» を復元するのが多次元尺度構成法（MDS）。",
        note: "二重中心化した距離行列を固有値分解すると、距離を再現する座標が得られる。",
        kind: "explain",
      },
    },
    {
      payload: { dim: 1, coords: mds1.coords, stress: s1 },
      highlights: ["dim1"],
      callout: {
        title: `② 1次元に復元：ストレス ${s1.toFixed(3)}`,
        body: "第1主座標だけ（点を1本の直線上に並べる）。距離をある程度は反映するが、平面的な位置関係はつぶれる。",
        note: "ストレス＝元の距離と復元距離のずれ。1次元では大きめ。",
        kind: "explain",
      },
    },
    {
      payload: { dim: 2, coords: mds2.coords, stress: s2 },
      highlights: ["dim2"],
      callout: {
        title: `③ 2次元に復元：ストレス ${s2.toFixed(3)}`,
        body: "第2主座標も加えると平面の地図になり、距離をほぼ再現できる（歪みがなければストレス≈0）。",
        note: "次元を増やすほどストレスは下がる。固有値の落ち方で «何次元で足りるか» を判断する。",
        kind: "supplement",
      },
    },
  ];
}
