import {
  classifyTrajectory,
  gradientDescent1D,
  sampleCurve,
  type Behavior,
  type Fn,
  type Pt,
} from "@/lib/stats/optimization";
import { createTopicStore } from "./topicStore";

/** 勾配降下ラボの目的関数 f(x)=½x²（凸・最小点 x=0）。f'(x)=x。 */
export const OBJ_F: Fn = (x) => 0.5 * x * x;
/** 目的関数の導関数 f'(x)=x（勾配）。 */
export const OBJ_DF: Fn = (x) => x;
/** 最小点（谷底）の x 座標。 */
export const TARGET = 0;
/** 描画・操作の x 範囲。 */
export const X_MIN = -3;
export const X_MAX = 3;
/** 曲線サンプル点数。 */
export const CURVE_N = 96;
/** 軌跡のステップ数（可視化に十分な本数）。 */
export const GD_STEPS = 12;

/** 勾配降下ラボの操作値＝出発点 x0 と学習率 η。 */
export type OptControls = { x0: number; lr: number };

/** 勾配降下ラボの派生値。 */
export type OptDerived = {
  /** 目的関数 f のサンプル点列。 */
  curve: Pt[];
  x0: number;
  lr: number;
  /** 勾配降下の軌跡 [x0, x1, …]。 */
  traj: number[];
  /** 出発点の勾配 f'(x0)=x0。 */
  grad0: number;
  /** 1歩目の到達点 x1 = x0 − η·f'(x0)。 */
  x1: number;
  /** 収束挙動（収束 / 振動収束 / 発散）。 */
  behavior: Behavior;
  /** 発散の閾値 η=2/f''=2（f''=1 のとき）。 */
  threshold: number;
};

/**
 * 最適化（A-3）トピックの Zustand ストア（single source of truth）。
 * Control 層（出発点 x0・学習率 η）は action を呼び、Render 層（GradientDescentLab の
 * 曲線・軌跡・更新式 x₁=x₀−η·f'(x₀) の強連動数式）は controls・derived を購読する。
 * η を大きくすると軌跡が単調収束→振動収束→発散へ変わり、閾値 η=2（f''=1）で切り替わる。
 * frame は勾配降下ステッパー（坂を転がり落ちるコマ送り）が使う。
 */
export const useOptimizationStore = createTopicStore<OptControls, OptDerived>({
  initialControls: { x0: 2.4, lr: 0.6 },
  derive: ({ x0, lr }) => {
    const traj = gradientDescent1D(OBJ_DF, x0, lr, GD_STEPS);
    const grad0 = OBJ_DF(x0);
    return {
      curve: sampleCurve(OBJ_F, X_MIN, X_MAX, CURVE_N),
      x0,
      lr,
      traj,
      grad0,
      x1: x0 - lr * grad0,
      behavior: classifyTrajectory(traj, TARGET),
      threshold: 2,
    };
  },
});
