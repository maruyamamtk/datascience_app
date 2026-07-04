/**
 * 回帰不連続デザイン（RDD）の «散布→左を線形フィット→右を線形フィット→閾値のジャンプを測る»
 * をコマ送りで見せるフレーム列ビルダー（計算層・純関数）。固定シードの例で «閾値の段差＝効果» を追う
 * （アルゴリズム図鑑スタイル）。副作用なし（Vitest 対象）。描画は RddStepper.tsx が購読する。
 */

import type { VizFrame } from "@/components/viz";
import {
  generateRddPoints,
  rddEstimate,
  type RddPoint,
  type RddSideFit,
} from "@/lib/stats/identification";
import { mulberry32 } from "@/lib/stats/random";

/** ステッパーの固定例：閾値50、真の効果+4、傾き1.5。 */
export const RDD_CUTOFF = 50;
export const RDD_TRUE_EFFECT = 4;
export const RDD_HALF_WIDTH = 10;

/** 表示用の固定データ（点数を絞って見やすく）。 */
export const RDD_POINTS: RddPoint[] = generateRddPoints({
  n: 60,
  tau: RDD_TRUE_EFFECT,
  slope: 1.5,
  cutoff: RDD_CUTOFF,
  halfWidth: RDD_HALF_WIDTH,
  noise: 1.2,
  rng: mulberry32(20250063),
});

const EST = rddEstimate(RDD_POINTS, RDD_CUTOFF);

/** RDD の手順ステージ。 */
export type RddStage = "scatter" | "left" | "right" | "jump";

/** 各フレームのスナップショット。 */
export type RddFramePayload = {
  stage: RddStage;
  points: RddPoint[];
  cutoff: number;
  /** left/right フィット（stage に応じて出す）。 */
  left?: RddSideFit;
  right?: RddSideFit;
  /** 閾値でのジャンプ（jump ステージのみ）。 */
  jump?: number;
  trueEffect: number;
};

/** RDD の手順フレーム列を作る。 */
export function buildRddFrames(): VizFrame<RddFramePayload>[] {
  const base = { points: RDD_POINTS, cutoff: RDD_CUTOFF, trueEffect: RDD_TRUE_EFFECT };
  return [
    {
      payload: { ...base, stage: "scatter" },
      highlights: ["cutoff"],
      callout: {
        title: "① 割り当て変数と閾値",
        body: "点数・スコアなど «連続な割り当て変数 x» が閾値（点線）を超えると処置が入る（例：合格点で奨学金）。閾値のすぐ両側の個体はほぼ «そっくりさん»——処置の有無だけが違う。",
        note: "閾値付近では «処置される/されない» がほぼ偶然で決まる＝局所的な無作為化とみなせる。",
        kind: "explain",
      },
    },
    {
      payload: { ...base, stage: "left", left: EST.left },
      highlights: ["left"],
      callout: {
        title: "② 閾値の «左»（対照側）を線形フィット",
        body: `閾値より下（処置なし）の点だけで結果 y と x の関係を直線に当てはめ、閾値まで外挿する。閾値での予測値は ${EST.left.atCutoff.toFixed(2)}。これは «もし処置がなかったら閾値の人はどうなるか» の反事実。`,
        note: "境界のすぐ下の水準を推定する。局所線形回帰（閾値近くの点を重視）が実務の定番。",
        kind: "supplement",
      },
    },
    {
      payload: { ...base, stage: "right", left: EST.left, right: EST.right },
      highlights: ["right"],
      callout: {
        title: "③ 閾値の «右»（処置側）を線形フィット",
        body: `今度は閾値より上（処置あり）の点で同じことをして、閾値での予測値 ${EST.right.atCutoff.toFixed(2)} を得る。これは «処置を受けた閾値の人» の水準。`,
        note: "割り当て変数 x 以外は境界で連続なので、ジャンプの原因は処置しかない。",
        kind: "supplement",
      },
    },
    {
      payload: { ...base, stage: "jump", left: EST.left, right: EST.right, jump: EST.jump },
      highlights: ["jump"],
      callout: {
        title: `④ 閾値での «ジャンプ» ＝ 効果：${EST.jump.toFixed(2)}`,
        body: `右の予測値 ${EST.right.atCutoff.toFixed(2)} − 左の予測値 ${EST.left.atCutoff.toFixed(2)} = ${EST.jump.toFixed(2)}。真の効果 +${RDD_TRUE_EFFECT} をほぼ復元。連続な傾向の上に閾値でだけ段差が乗るので、その段差が因果効果。`,
        note: "識別できるのは «閾値ぎりぎりの人» の効果（局所処置効果）。閾値から離れた人へ一般化できるとは限らない。",
        kind: "explain",
      },
    },
  ];
}
