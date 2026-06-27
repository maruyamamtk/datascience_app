/**
 * 確率関数 PMF を «1 本ずつ» 足し上げて累積分布関数 CDF の階段を作るコマ送りのフレーム列ビルダー
 * （計算層・純関数）。副作用なし（Vitest 対象）。描画（CdfStepper.tsx）はこの結果を購読するだけ。
 */

import type { VizFrame } from "@/components/viz";

/** 各フレームで描画層が使うスナップショット。 */
export type CdfStepPayload = {
  /** いま足す値 k。 */
  k: number;
  /** P(X=k)。 */
  pk: number;
  /** ここまでの累積 F(k)=P(X≤k)。 */
  cdf: number;
};

const pct = (x: number): string => `${(x * 100).toFixed(1)}%`;

/**
 * 確率関数ベクトルから「P(X=k) を順に積んで F(k) になる」フレーム列を作る。
 * フレーム k では値 0..k の確率が積み上がり、最後のフレームで合計が 1（=確率の総和）になる。
 */
export function buildCdfFrames(pmf: readonly number[]): VizFrame<CdfStepPayload>[] {
  let acc = 0;
  return pmf.map((pk, k) => {
    acc += pk;
    return {
      payload: { k, pk, cdf: acc },
      highlights: [`bar-${k}`],
      callout: {
        title: `k = ${k} を足す`,
        body: `P(X=${k}) = ${pct(pk)} を累積に加える → F(${k}) = P(X≤${k}) = ${pct(acc)}。`,
        note:
          k === pmf.length - 1
            ? `最後まで足すと合計は ${pct(acc)}（確率の総和は 1）。これが CDF の «右端は 1»。`
            : `CDF は確率関数の «前から足し上げ»。だから単調に増えていく。`,
        kind: k === pmf.length - 1 ? "supplement" : "explain",
      },
    };
  });
}
