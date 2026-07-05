/**
 * 「リーマン和で面積を詰める」ステッパーのフレーム列ビルダー（計算層・純関数）。
 * 曲線の下の面積を、短冊（矩形）の本数 n を 1→32 と倍にしながら詰めていき、
 * 総和が定積分（真の面積）へ収束する様子を1コマずつ見せる（アルゴリズム図鑑スタイル）。
 * 副作用なし（Vitest 対象）。描画は RiemannStepper.tsx が購読する。
 */

import type { VizFrame } from "@/components/viz";
import { riemannRects, type Fn, type Rect } from "@/lib/stats/calculus";

/** 面積を詰める対象の関数 g(x)=0.4x²+0.3（[0,2] で正）。 */
export const AREA_F: Fn = (x) => 0.4 * x * x + 0.3;
export const A = 0;
export const B = 2;
/** 真の定積分 ∫₀² (0.4x²+0.3) dx = 0.4·(8/3)+0.3·2。 */
export const EXACT_AREA = (0.4 * (B ** 3 - A ** 3)) / 3 + 0.3 * (B - A);

/** 短冊の本数（1→32 と倍々に増やす）。 */
export const RECT_COUNTS = [1, 2, 4, 8, 16, 32];

export type RiemannPayload = {
  /** −1=導入、0..=RECT_COUNTS の index。 */
  stepIndex: number;
  /** 短冊の本数（導入では 0）。 */
  n: number;
  rects: Rect[];
  /** リーマン和（近似面積）。 */
  sum: number;
  /** 真の面積（定積分）。 */
  exact: number;
  /** 近似の誤差 |sum − exact|。 */
  error: number;
};

function payloadFor(n: number, stepIndex: number): RiemannPayload {
  const rects = riemannRects(AREA_F, A, B, n, "mid");
  const sum = rects.reduce((s, r) => s + r.area, 0);
  return { stepIndex, n, rects, sum, exact: EXACT_AREA, error: Math.abs(sum - EXACT_AREA) };
}

/** リーマン和ステッパーのフレーム列を作る。 */
export function buildRiemannFrames(): VizFrame<RiemannPayload>[] {
  const intro: VizFrame<RiemannPayload> = {
    payload: payloadFor(1, -1),
    highlights: ["intro"],
    callout: {
      title: "① 積分＝曲線の下の «面積»",
      body: "定積分 ∫ₐᵇ f(x) dx は、曲線 f と x 軸で挟まれた領域の面積。これを «幅の等しい短冊（矩形）» で埋め、その面積を足し合わせて近づける。短冊を細かくするほど、すき間が減って真の面積に近づく。",
      note: "▶ 再生で短冊の本数 n を 1→2→4→… と倍にしていく。中点の高さで矩形を立てる（中点則）。",
      kind: "explain",
    },
  };

  const steps: VizFrame<RiemannPayload>[] = RECT_COUNTS.map((n, i) => {
    const p = payloadFor(n, i);
    const isLast = i === RECT_COUNTS.length - 1;
    return {
      payload: p,
      highlights: isLast ? ["rects", "converged"] : ["rects"],
      callout: {
        title: `n=${n} 本：近似面積 ${p.sum.toFixed(3)}（真値との差 ${p.error.toFixed(3)}）`,
        body: `幅 ${((B - A) / n).toFixed(3)} の短冊を ${n} 本立て、面積を合計すると ${p.sum.toFixed(3)}。真の面積 ${p.exact.toFixed(3)} との差は ${p.error.toFixed(3)}。${
          isLast
            ? "本数を倍にするたび誤差がほぼ 1/4 に減り、リーマン和は定積分へ収束した。これが «積分＝面積» の意味。"
            : "短冊を細くすると曲線とのすき間（誤差）が小さくなる。"
        }`,
        note: isLast
          ? "n→∞ の極限がちょうど定積分 ∫ₐᵇ f(x) dx。微分（接線）と積分（面積）は互いに逆の操作（微積分学の基本定理）。"
          : "はみ出し（過大）と足りない部分（過少）が中点則では打ち消し合い、収束が速い。",
        kind: isLast ? "supplement" : "explain",
      },
    };
  });

  return [intro, ...steps];
}
