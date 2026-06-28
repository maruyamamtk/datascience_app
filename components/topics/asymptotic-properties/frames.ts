/**
 * 最尤推定量の漸近正規性を «n を増やしながら» 見せるコマ送りのフレーム列ビルダー（計算層・純関数）。
 * n を増やすと λ̂ の標本分布が N(λ, λ²/n) の正規曲線に重なる（漸近正規性）。
 * 副作用なし（Vitest 対象）。描画（AsymptoticStepper.tsx）はこの結果を購読するだけ。
 */

import type { VizFrame } from "@/components/viz";
import { mleAsymptoticVariance, simulateMleSampling } from "@/lib/stats/asymptotics";
import { mulberry32 } from "@/lib/stats/random";

/** 各フレーム（ある n での λ̂ の標本分布と漸近正規）のスナップショット。 */
export type AsymptoticPayload = {
  /** 標本サイズ n。 */
  n: number;
  /** λ̂ の推定値列（標本分布）。 */
  estimates: number[];
  /** 真の率 λ。 */
  trueLambda: number;
  /** 漸近標準偏差 √(λ²/n)。 */
  asympSd: number;
  /** 実測の標本標準偏差。 */
  empiricalSd: number;
};

/** n のリストに沿って «λ̂ の標本分布が正規へ近づく» フレーム列を作る。 */
export function buildAsymptoticFrames(
  ns: readonly number[],
  trueLambda = 1.5,
  trials = 2000,
): VizFrame<AsymptoticPayload>[] {
  return ns.map((n, idx) => {
    const { estimates, variance } = simulateMleSampling({
      trueLambda,
      n,
      trials,
      rng: mulberry32(2000 + idx),
    });
    const asympSd = Math.sqrt(mleAsymptoticVariance(trueLambda, n));
    const empiricalSd = Math.sqrt(variance);
    return {
      payload: { n, estimates, trueLambda, asympSd, empiricalSd },
      highlights: [`n-${n}`],
      callout: {
        title: `n = ${n}`,
        body: `最尤推定 λ̂=1/x̄ の標本分布。漸近 SD √(λ²/n)=${asympSd.toFixed(
          3,
        )}、実測 SD=${empiricalSd.toFixed(3)}。`,
        note:
          n >= ns[ns.length - 1]
            ? `n を増やすと λ̂ は N(λ, λ²/n) に重なる＝漸近正規性。分散は «フィッシャー情報量の逆数» で決まる。`
            : `小標本では右に歪むが、n を増やすと左右対称な正規に近づく。`,
        kind: n >= ns[ns.length - 1] ? "supplement" : "explain",
      },
    };
  });
}
