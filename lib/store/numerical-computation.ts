import {
  centralDiff,
  classifyRegime,
  diffErrorScan,
  optimalStep,
  roundingError,
  truncationError,
  type ErrPoint,
  type Fn,
  type Regime,
} from "@/lib/stats/numerical-computation";
import { createTopicStore } from "./topicStore";

/** 数値微分ラボの対象関数 f(x)=sin x（x=1 で微分）。真値は cos(1)。 */
export const LAB_F: Fn = Math.sin;
/** 微分する点 x=1。 */
export const LAB_X = 1;
/** 真の導関数値 f'(1)=cos(1)（連動の «正解»）。 */
export const LAB_EXACT = Math.cos(LAB_X);
/** f(x) と f‴(x) の値（誤差モデル・最適刻み幅の計算に使う。f‴=−cos x）。 */
const F_VALUE = Math.sin(LAB_X);
const THIRD_DERIV = -Math.cos(LAB_X);
/** log₁₀h の操作範囲（0=1e0 から −14=1e−14 まで）。 */
export const LOGH_MIN = -14;
export const LOGH_MAX = 0;
/** 誤差カーブのサンプル点数。 */
export const CURVE_N = 72;

/** 数値微分ラボの操作値＝刻み幅の指数 log₁₀h。 */
export type NumControls = { logh: number };

/** 数値微分ラボの派生値。 */
export type NumDerived = {
  /** 刻み幅 h = 10^{logh}。 */
  h: number;
  logh: number;
  /** 中心差分による近似値 (f(x+h)−f(x−h))/(2h)。 */
  approx: number;
  /** 真の導関数値 f'(x)。 */
  exact: number;
  /** 絶対誤差 |approx − exact|。 */
  err: number;
  /** 打ち切り誤差モデル (h²/6)|f‴|。 */
  truncErr: number;
  /** 丸め誤差モデル ε|f|/(2h)。 */
  roundErr: number;
  /** 誤差を最小化する刻み幅 h*（≈ε^{1/3}）。 */
  hOpt: number;
  /** いまの h がどの誤差領域か。 */
  regime: Regime;
  /** log₁₀h に対する実際の絶対誤差カーブ（U 字）。 */
  curve: ErrPoint[];
};

/**
 * 数値計算（A-4）トピックの Zustand ストア（single source of truth）。
 * Control 層（刻み幅の指数 log₁₀h）は action を呼び、Render 層（NumericalDiffLab の
 * 誤差カーブ・近似式 f'(x)≈(f(x+h)−f(x−h))/(2h) の強連動数式）は controls・derived を購読する。
 * h を小さくすると打ち切り誤差は減るが丸め誤差が増え、最適 h*≈ε^{1/3} で総誤差が最小になる。
 * frame は二分法ステッパー（根を挟み撃ちで狭めるコマ送り）が使う。
 */
export const useNumericalComputationStore = createTopicStore<NumControls, NumDerived>({
  initialControls: { logh: -2 },
  derive: ({ logh }) => {
    const h = 10 ** logh;
    const approx = centralDiff(LAB_F, LAB_X, h);
    const hOpt = optimalStep(F_VALUE, THIRD_DERIV);
    return {
      h,
      logh,
      approx,
      exact: LAB_EXACT,
      err: Math.abs(approx - LAB_EXACT),
      truncErr: truncationError(h, THIRD_DERIV),
      roundErr: roundingError(h, F_VALUE),
      hOpt,
      regime: classifyRegime(h, hOpt),
      curve: diffErrorScan(LAB_F, LAB_X, LAB_EXACT, LOGH_MIN, LOGH_MAX, CURVE_N),
    };
  },
});
