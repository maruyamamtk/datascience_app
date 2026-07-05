import {
  numDerivative,
  sampleCurve,
  tangentAt,
  type Fn,
  type Pt,
} from "@/lib/stats/calculus";
import { createTopicStore } from "./topicStore";

/** 接線ラボで使う関数 f(x)=x³/3 − x（極値 x=±1、f'(x)=x²−1）。 */
export const DEMO_F: Fn = (x) => x ** 3 / 3 - x;
/** 描画・操作の x 範囲。 */
export const X_MIN = -2.2;
export const X_MAX = 2.2;
/** 曲線サンプル点数（折れ線描画用）。 */
export const CURVE_N = 96;
/** 極値とみなす |f'(x0)| の閾値（緑ハイライト用）。 */
const EXTREMUM_TOL = 0.05;

/** 接線ラボの操作値＝接点の x 座標。 */
export type CalcControls = { x0: number };

/** 接線ラボの派生値。 */
export type CalcDerived = {
  /** 曲線 f(x) のサンプル点列。 */
  curve: Pt[];
  x0: number;
  /** 接点の高さ f(x0)。 */
  fx0: number;
  /** 微分係数 f'(x0)＝接線の傾き。 */
  dfx0: number;
  /** 接線 y = m·x + b の係数。 */
  tangent: { slope: number; intercept: number };
  /** |f'(x0)| がほぼ 0（極値）か。 */
  isExtremum: boolean;
  /** f'(x0)>0（増加中）か。 */
  increasing: boolean;
};

/**
 * 微分積分（A-2）トピックの Zustand ストア（single source of truth）。
 * Control 層（接点 x0）は action を呼び、Render 層（DerivativeLab の曲線・接線・
 * 微分係数 f'(x0) の強連動数式）は controls・derived を購読する。
 * x0 を動かすと接線の傾き＝f'(x0)＝x0²−1 が実時間で追従し、x0=±1 で傾き 0（極値）になる。
 * frame はリーマン和ステッパー（積分＝面積）が使う。
 */
export const useCalculusStore = createTopicStore<CalcControls, CalcDerived>({
  initialControls: { x0: 0.5 },
  derive: ({ x0 }) => {
    const dfx0 = numDerivative(DEMO_F, x0);
    return {
      curve: sampleCurve(DEMO_F, X_MIN, X_MAX, CURVE_N),
      x0,
      fx0: DEMO_F(x0),
      dfx0,
      tangent: tangentAt(DEMO_F, x0),
      isExtremum: Math.abs(dfx0) < EXTREMUM_TOL,
      increasing: dfx0 > 0,
    };
  },
});
