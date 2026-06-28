/**
 * 各観測変数の分散を «共通性（共通因子）＋独自性（独自因子）» に分解する過程をコマ送りで見せる
 * フレーム列ビルダー（計算層・純関数）。変数を1つずつめくり、λ²＋(1−λ²)=1 の分解を提示する。
 * 副作用なし（Vitest 対象）。描画（CommunalityStepper.tsx）はこの結果を購読するだけ。
 */

import type { VizFrame } from "@/components/viz";
import { communality, uniqueness } from "@/lib/stats/factor-analysis";

/** 各フレーム（ある変数）のスナップショット。 */
export type CommunalityPayload = {
  /** 変数の通し番号。 */
  index: number;
  /** 変数名。 */
  name: string;
  /** 因子負荷 λ。 */
  loading: number;
  /** 共通性 h²=λ²。 */
  communality: number;
  /** 独自性 ψ=1−λ²。 */
  uniqueness: number;
};

/** 観測変数ごとの共通性分解フレーム列を作る。 */
export function buildCommunalityFrames(
  names: readonly string[],
  loadings: readonly number[],
): VizFrame<CommunalityPayload>[] {
  return names.map((name, i) => {
    const h2 = communality(loadings[i]);
    const psi = uniqueness(loadings[i]);
    return {
      payload: { index: i, name, loading: loadings[i], communality: h2, uniqueness: psi },
      highlights: [`var-${i}`],
      callout: {
        title: `${name}：負荷 λ=${loadings[i].toFixed(2)}`,
        body: `分散1 = 共通性 ${h2.toFixed(2)}（共通因子が説明）＋ 独自性 ${psi.toFixed(
          2,
        )}（その変数固有＋誤差）。`,
        note:
          h2 >= 0.5
            ? "共通性が高い＝この変数は共通因子でよく説明できる（因子と強く結びつく）。"
            : "共通性が低い＝独自の成分が多く、共通因子だけでは説明しきれない。",
        kind: "explain",
      },
    };
  });
}
