import {
  activate,
  activateDerivative,
  type ActivationName,
  applyDropout,
  backwardPass,
  batchNormalize,
  type BatchNormResult,
  cumulativeGradientProfile,
  dropoutMask,
  forwardPass,
  type ForwardTrace,
  type Gradients,
  linspace,
  type NetParams,
} from "@/lib/stats/neural-network-basics";
import { mulberry32 } from "@/lib/stats/random";
import { createTopicStore } from "./topicStore";

/**
 * ラボ全体で使う «小さなネットワーク»: 入力2 → 隠れ2（活性化関数は controls.activation で切替）
 * → 出力1（線形）。重みは手計算でも追える程度のきれいな値に固定する。
 */
export const NET_PARAMS: NetParams = {
  w1: [
    [0.5, -0.3],
    [0.4, 0.6],
  ],
  b1: [0.1, -0.2],
  w2: [0.8, -0.5],
  b2: 0.05,
};

/** 活性化関数比較（ActivationLab）で曲線を描く x の範囲。 */
export const ACT_X_MIN = -4;
export const ACT_X_MAX = 4;
export const ACT_CURVE_N = 81;

/** バッチ正規化の説明で使う «ミニバッチ»（隠れ層の生の重み付き和を想定した6サンプル）。 */
export const BN_BATCH = [2, 5, 1, 8, 3, 6];

/** ドロップアウトの説明で使う隠れ層ユニット数（可視化しやすい小さめの数）。 */
export const DROPOUT_N = 8;
/** ドロップアウトマスク生成のシード（毎回同じ乱数列＝再現可能、SSR/CSR一致）。 */
const DROPOUT_SEED = 20260726;
/** ドロップアウトの説明で使う «一定の活性化»（差が分かりやすいよう全ユニット同値）。 */
export const DROPOUT_ACTIVATIONS = Array(DROPOUT_N).fill(2);

/** 勾配消失チェーンで使う代表点 z（シグモイドは微分最大の z=0、ReLU は活性域の z=1）。 */
export const CHAIN_Z: Record<ActivationName, number> = { sigmoid: 0, relu: 1, rbf: 0 };

export type NnControls = {
  /** 順伝播・誤差逆伝播で使う入力 x0, x1 と目標値 y。 */
  x0: number;
  x1: number;
  y: number;
  /** 隠れ層の活性化関数（Lab 全体で共通）。 */
  activation: ActivationName;
  /** 活性化関数比較グラフで動かす x（曲線上の着目点）。 */
  actX: number;
  /** 勾配消失チェーンの層数。 */
  depth: number;
  /** ドロップアウト率。 */
  dropoutRate: number;
  /** バッチ正規化のスケール γ・シフト β。 */
  bnGamma: number;
  bnBeta: number;
};

export type NnDerived = {
  x0: number;
  x1: number;
  y: number;
  activation: ActivationName;
  /** 順伝播の全中間値（計算グラフのノード値）。 */
  trace: ForwardTrace;
  /** 誤差逆伝播で求めた勾配。 */
  grads: Gradients;
  /** 活性化関数の曲線（描画用サンプル点）。 */
  actCurve: { x: number; y: number }[];
  /** 活性化関数の微分の曲線。 */
  derivCurve: { x: number; y: number }[];
  actX: number;
  actValue: number;
  derivValue: number;
  depth: number;
  /** 勾配消失チェーン: 層を重ねるごとの累積勾配 [1, d, d², …]。 */
  gradProfile: number[];
  dropoutRate: number;
  dropoutMaskArr: number[];
  droppedActivations: number[];
  bnGamma: number;
  bnBeta: number;
  bnResult: BatchNormResult;
};

/**
 * ニューラルネットワークの仕組み（Q-1）トピックの Zustand ストア（single source of truth）。
 * Control 層（入力 x0/x1・目標 y・活性化関数・比較グラフの着目点・勾配消失の層数・
 * ドロップアウト率・バッチ正規化の γ/β）は action を呼び、Render 層（ForwardLab・ActivationLab・
 * BackpropStepper・DropoutBatchNormLab）は controls・derived を購読する。
 * frame は誤差逆伝播ステッパー（計算グラフを前向き→後ろ向きに辿るコマ送り）が使う。
 */
export const useNeuralNetworkBasicsStore = createTopicStore<NnControls, NnDerived>({
  initialControls: {
    x0: 1,
    x1: 0.5,
    y: 1,
    activation: "sigmoid",
    actX: 0,
    depth: 4,
    dropoutRate: 0.3,
    bnGamma: 1,
    bnBeta: 0,
  },
  derive: ({ x0, x1, y, activation, actX, depth, dropoutRate, bnGamma, bnBeta }) => {
    const trace = forwardPass([x0, x1], y, NET_PARAMS, activation);
    const grads = backwardPass(trace, NET_PARAMS, activation);

    const xs = linspace(ACT_X_MIN, ACT_X_MAX, ACT_CURVE_N);
    const actCurve = xs.map((x) => ({ x, y: activate(activation, x) }));
    const derivCurve = xs.map((x) => ({ x, y: activateDerivative(activation, x) }));

    const gradProfile = cumulativeGradientProfile(depth, activation, CHAIN_Z[activation]);

    const rng = mulberry32(DROPOUT_SEED);
    const dropoutMaskArr = dropoutMask(DROPOUT_N, dropoutRate, rng);
    const droppedActivations = applyDropout(DROPOUT_ACTIVATIONS, dropoutMaskArr, dropoutRate);

    const bnResult = batchNormalize(BN_BATCH, bnGamma, bnBeta);

    return {
      x0,
      x1,
      y,
      activation,
      trace,
      grads,
      actCurve,
      derivCurve,
      actX,
      actValue: activate(activation, actX),
      derivValue: activateDerivative(activation, actX),
      depth,
      gradProfile,
      dropoutRate,
      dropoutMaskArr,
      droppedActivations,
      bnGamma,
      bnBeta,
      bnResult,
    };
  },
});
