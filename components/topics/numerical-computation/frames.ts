/**
 * 「二分法で根を挟み撃ちする」ステッパーのフレーム列ビルダー（計算層・純関数）。
 * f(x)=x²−2 の根 √2 を、符号が反対の区間 [a,b] を毎回半分に狭めて追い詰める様子を
 * 1 コマずつ見せる（アルゴリズム図鑑スタイル）。副作用なし（Vitest 対象）。
 * 描画は BisectionStepper.tsx が購読する。
 */

import type { VizFrame } from "@/components/viz";
import { bisect1D, type Fn } from "@/lib/stats/numerical-computation";

/** 対象方程式 f(x)=x²−2=0（正の根 √2≈1.41421）。 */
export const STEP_F: Fn = (x) => x * x - 2;
/** 初期区間 [1,2]：f(1)=−1<0, f(2)=2>0 で符号が反対なので中に根がある。 */
export const STEP_A0 = 1;
export const STEP_B0 = 2;
/** 真の根 √2。 */
export const STEP_ROOT = Math.SQRT2;
/** コマ送りする反復数（初期区間を含めて STEP_ITERS+1 コマ）。 */
export const STEP_ITERS = 7;

export type BisectPayload = {
  /** 反復番号 k（0 が初期区間）。 */
  k: number;
  /** 現在の区間左端 a。 */
  a: number;
  /** 現在の区間右端 b。 */
  b: number;
  /** 中点 mid=(a+b)/2。 */
  mid: number;
  /** 中点での値 f(mid)（符号で残す側を決める）。 */
  fmid: number;
  /** 区間幅 b−a（＝根の不確かさ）。 */
  width: number;
  /** 真の根 √2。 */
  root: number;
};

/** 二分法ステッパーのフレーム列を作る。 */
export function buildBisectFrames(): VizFrame<BisectPayload>[] {
  const brackets = bisect1D(STEP_F, STEP_A0, STEP_B0, STEP_ITERS);

  return brackets.map((br, k) => {
    const first = k === 0;
    const isLast = k === brackets.length - 1;
    // 中点の符号から «次にどちら側を残すか»。f(a)<0 固定なので f(mid)>0 なら左半分。
    const keepLeft = br.fmid > 0;
    return {
      payload: {
        k,
        a: br.a,
        b: br.b,
        mid: br.mid,
        fmid: br.fmid,
        width: br.width,
        root: STEP_ROOT,
      },
      highlights: isLast ? ["interval", "converged"] : ["interval", "mid"],
      callout: {
        title: first
          ? `初期区間 [${br.a.toFixed(3)}, ${br.b.toFixed(3)}]（幅 ${br.width.toFixed(3)}）`
          : `反復 ${k}：区間 [${br.a.toFixed(4)}, ${br.b.toFixed(4)}]（幅 ${br.width.toFixed(4)}）`,
        body: first
          ? `f(x)=x²−2 は f(1)=−1<0、f(2)=+2>0 で符号が反対。中間値の定理より、この区間のどこかに根 √2 がある。中点 mid=${br.mid.toFixed(4)} の符号を調べて «根がある半分» に絞る。`
          : isLast
            ? `区間幅が ${br.width.toFixed(4)} まで縮み、中点 ${br.mid.toFixed(5)} は真の根 √2≈${STEP_ROOT.toFixed(5)} に十分近い。二分法は毎回幅が半分になるので、n 回で誤差が 2⁻ⁿ 倍——確実だが 1 桁ごとに約 3.3 回かかる。`
            : `中点 mid=${br.mid.toFixed(4)} で f(mid)=${br.fmid.toFixed(4)}${keepLeft ? "＞0 なので «左半分»" : "＜0 なので «右半分»"}（符号が反対の側）を残し、区間を半分に狭める。`,
        note: isLast
          ? "二分法は微分がいらず必ず収束する «頑健な» 反復法。ただし 1 反復で誤差が半分（線形収束）と遅い。速さが要るならニュートン法（2 次収束）。"
          : "各反復で区間幅が半分になる＝根の «有効数字» が着実に増える。符号の反対側を残す限り、根は常に区間の中にいる。",
        kind: isLast ? "supplement" : "explain",
      },
    };
  });
}
