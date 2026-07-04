/**
 * 帯域幅 h を «過小平滑→最適→過大平滑» と変えたときの KDE 曲線・ISE の変化をコマ送りで見せる
 * フレーム列ビルダー（計算層・純関数）。h が小さいとギザギザ、大きいと潰れ、中間で真の密度に最も近い。
 * 副作用なし（Vitest 対象）。描画（BandwidthStepper.tsx）はこの結果を購読するだけ。
 */

import type { VizFrame } from "@/components/viz";
import { densityCurve, integratedSquaredError, type KernelKind } from "@/lib/stats/kde";
import { KDE_RANGE, trueDensity } from "@/lib/store/kernel-density-estimation";

/** 各フレーム（ある帯域幅）のスナップショット。 */
export type BandwidthPayload = {
  bandwidth: number;
  /** KDE 曲線。 */
  curve: { x: number; y: number }[];
  /** 積分二乗誤差。 */
  ise: number;
  /** 状態ラベル。 */
  regime: "under" | "good" | "over";
};

/**
 * 与えた帯域幅列で KDE 曲線と ISE を評価したフレーム列を作る。
 * ISE が最小のフレームを «最適»、それより小さい帯域幅を過小平滑、大きい帯域幅を過大平滑とラベルする
 * （＝真の密度に最も近い h を基準にする。二峰性ではシルバーマンより小さめが最適になりうる）。
 */
export function buildBandwidthFrames(
  data: readonly number[],
  bandwidths: readonly number[],
  _silverman: number,
  kind: KernelKind = "gaussian",
): VizFrame<BandwidthPayload>[] {
  const ises = bandwidths.map((h) => integratedSquaredError(data, h, kind, trueDensity, KDE_RANGE));
  let bestIdx = 0;
  for (let i = 1; i < ises.length; i++) if (ises[i] < ises[bestIdx]) bestIdx = i;
  const bestH = bandwidths[bestIdx];

  return bandwidths.map((h, i) => {
    const curve = densityCurve(data, h, kind, KDE_RANGE);
    const ise = ises[i];
    const regime: BandwidthPayload["regime"] = h < bestH ? "under" : h > bestH ? "over" : "good";
    const label =
      regime === "under"
        ? "過小平滑（ギザギザ）"
        : regime === "over"
          ? "過大平滑（潰れる）"
          : "ほどよい平滑";
    return {
      payload: { bandwidth: h, curve, ise, regime },
      highlights: ["curve"],
      callout: {
        title: `帯域幅 h=${h.toFixed(2)}：${label}（ISE=${ise.toFixed(3)}）`,
        body:
          regime === "under"
            ? "h が小さすぎると各データ点の山が細く、密度がギザギザに（分散大＝ノイズを拾う）。"
            : regime === "over"
              ? "h が大きすぎると山が広がりすぎ、二峰性がつぶれて平坦に（バイアス大）。"
              : "山の幅がちょうどよく、二峰性を保ちつつ滑らか。真の密度に最も近い。",
        note:
          regime === "good"
            ? "ISE（真の密度との差²の積分）が最小付近。シルバーマンの目安がこの辺り。"
            : "帯域幅は «バイアスと分散のトレードオフ»。小さいと分散大、大きいとバイアス大。",
        kind: regime === "good" ? "supplement" : "explain",
      },
    };
  });
}
