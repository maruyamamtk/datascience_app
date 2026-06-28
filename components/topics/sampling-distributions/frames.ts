/**
 * t 分布 → 標準正規分布の収束を «自由度 ν を増やしながら» 見せるコマ送りのフレーム列ビルダー
 * （計算層・純関数）。ν→∞ で t は標準正規に重なる（標本標準偏差の «ぶれ» が消える）。
 * 副作用なし（Vitest 対象）。描画（TtoNormalStepper.tsx）はこの結果を購読するだけ。
 */

import type { VizFrame } from "@/components/viz";
import { normalPdf, tPdf } from "@/lib/stats/sampling-distributions";

/** 各フレーム（ある ν での t 曲線と標準正規）のスナップショット。 */
export type TtoNormalPayload = {
  /** 自由度 ν。 */
  nu: number;
  /** t 分布の曲線点列。 */
  tCurve: { x: number; y: number }[];
  /** 標準正規の曲線点列（全フレーム共通）。 */
  normal: { x: number; y: number }[];
  /** 中心 x=0 での t と正規の差（裾の重さの指標）。 */
  centerGap: number;
};

const XR = 5;

/** 自由度のリストに沿って «t が標準正規へ近づく» フレーム列を作る。 */
export function buildTtoNormalFrames(
  nus: readonly number[],
  samples = 120,
): VizFrame<TtoNormalPayload>[] {
  const normal: { x: number; y: number }[] = [];
  for (let i = 0; i <= samples; i++) {
    const x = -XR + (i / samples) * (2 * XR);
    normal.push({ x, y: normalPdf(x, 0, 1) });
  }

  return nus.map((nu) => {
    const tCurve: { x: number; y: number }[] = [];
    for (let i = 0; i <= samples; i++) {
      const x = -XR + (i / samples) * (2 * XR);
      tCurve.push({ x, y: tPdf(x, nu) });
    }
    const centerGap = Math.abs(normalPdf(0, 0, 1) - tPdf(0, nu));
    return {
      payload: { nu, tCurve, normal, centerGap },
      highlights: [`nu-${nu}`],
      callout: {
        title: `自由度 ν = ${nu}`,
        body: `t(ν=${nu}) と標準正規の中心の差は ${centerGap.toFixed(
          4,
        )}。ν が小さいほど t は «中心が低く裾が重い»。`,
        note:
          nu >= nus[nus.length - 1]
            ? `ν→∞ で t は標準正規に一致する（標本標準偏差 s のぶれが消える）。`
            : `自由度＝«s の確からしさ»。小さいほど s のぶれを織り込んで裾が重くなる。`,
        kind: nu >= nus[nus.length - 1] ? "supplement" : "explain",
      },
    };
  });
}
