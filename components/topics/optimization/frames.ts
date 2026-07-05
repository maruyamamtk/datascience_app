/**
 * 「勾配降下で坂を転がり落ちる」ステッパーのフレーム列ビルダー（計算層・純関数）。
 * 固定の学習率で1歩ずつ x_{k+1}=x_k−η·f'(x_k) を進め、点が谷底（最小点）へ
 * 近づく様子を1コマずつ見せる（アルゴリズム図鑑スタイル）。
 * 副作用なし（Vitest 対象）。描画は DescentStepper.tsx が購読する。
 */

import type { VizFrame } from "@/components/viz";
import { gradientDescent1D, type Fn } from "@/lib/stats/optimization";

/** 面積ではなく «坂» を転がすので目的関数 f(x)=½x²（最小点 x=0）。 */
export const STEP_F: Fn = (x) => 0.5 * x * x;
/** 勾配 f'(x)=x。 */
export const STEP_DF: Fn = (x) => x;
/** 出発点と学習率（収束が見える良い値）。 */
export const STEP_X0 = 2.4;
export const STEP_LR = 0.6;
/** 谷底（最小点）。 */
export const STEP_TARGET = 0;
/** コマ送りするステップ数。 */
export const STEP_COUNT = 8;

export type DescentPayload = {
  /** ステップ番号 k（0 が出発点）。 */
  k: number;
  /** 現在位置 x_k。 */
  x: number;
  /** 現在の高さ f(x_k)。 */
  fx: number;
  /** 現在の勾配 f'(x_k)=x_k。 */
  grad: number;
  /** 次の到達点 x_{k+1}=x_k−η·f'(x_k)。 */
  xNext: number;
  /** 学習率 η。 */
  lr: number;
  /** 谷底 x。 */
  target: number;
};

/** 勾配降下ステッパーのフレーム列を作る。 */
export function buildDescentFrames(): VizFrame<DescentPayload>[] {
  const traj = gradientDescent1D(STEP_DF, STEP_X0, STEP_LR, STEP_COUNT);

  return traj.slice(0, STEP_COUNT).map((x, k) => {
    const grad = STEP_DF(x);
    const xNext = traj[k + 1];
    const isLast = k === STEP_COUNT - 1;
    const first = k === 0;
    return {
      payload: { k, x, fx: STEP_F(x), grad, xNext, lr: STEP_LR, target: STEP_TARGET },
      highlights: isLast ? ["point", "converged"] : ["point", "step"],
      callout: {
        title: first
          ? `出発点 x₀=${x.toFixed(2)}（勾配 f'(x₀)=${grad.toFixed(2)}）`
          : `ステップ ${k}：x=${x.toFixed(3)}（谷まで ${Math.abs(x - STEP_TARGET).toFixed(3)}）`,
        body: first
          ? `勾配 f'(x)=x は «坂の傾き»。傾きが正なら右上がりなので、左（勾配の逆）へ η=${STEP_LR} の歩幅で下る：x₁=x₀−η·f'(x₀)=${x.toFixed(2)}−${STEP_LR}×${grad.toFixed(2)}=${xNext.toFixed(3)}。`
          : isLast
            ? `勾配が小さくなるほど歩幅も自動で縮み、点は谷底 x=0 に落ち着く。これが勾配降下の収束。学習率 η がこの関数の閾値 2 より小さいので安定して収束した。`
            : `坂の傾き f'(x)=${grad.toFixed(3)} の逆へ η=${STEP_LR} だけ進む：x−η·f'(x)=${x.toFixed(3)}−${STEP_LR}×${grad.toFixed(3)}=${xNext.toFixed(3)}。谷に近いほど傾きが緩み、歩幅が縮む。`,
        note: isLast
          ? "谷底では勾配 f'(x)=0（接線が水平）。«勾配 0» が最適点の条件——1変数の f'=0、多変数の ∇f=0。"
          : "勾配降下は «勾配の逆向きに一定の歩幅で進む» を繰り返すだけ。歩幅を決める η（学習率）が大きすぎると行き過ぎて振動・発散する。",
        kind: isLast ? "supplement" : "explain",
      },
    };
  });
}
