/**
 * ニューラルネットワークの仕組み（Q-1）トピックの計算層（純関数）。
 * 「入力→隠れ層→出力」の小さな2入力・2隠れユニット・1出力のネットワークで、順伝播・誤差逆伝播
 * （連鎖律による勾配計算）・活性化関数（ReLU・シグモイド・動径基底）とその微分・勾配消失・
 * ドロップアウト・バッチ正規化・確率的勾配降下の更新を扱う。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。乱数は呼び出し側の Rng に閉じる
 * （tasks/lessons.md: 疑似乱数は整数演算の LCG/mulberry32 を使い hydration mismatch を回避）。
 * 学習率つきパラメータ更新は[最適化](optimization)トピックの勾配降下法 x←x−η·∇f と同じ骨格。
 */

import { sigmoid } from "./logistic";
import type { Rng } from "./random";

// ---------------------------------------------------------------------------
// 活性化関数とその微分
// ---------------------------------------------------------------------------

export { sigmoid };

/** シグモイドの微分 σ'(z)=σ(z)(1−σ(z))。最大値は z=0 で 0.25（層を重ねるほど積が縮む＝勾配消失の主因）。 */
export function sigmoidDerivative(z: number): number {
  const s = sigmoid(z);
  return s * (1 - s);
}

/** ReLU（正規化線形関数）f(z)=max(0,z)。 */
export function relu(z: number): number {
  return Math.max(0, z);
}

/** ReLU の微分（z=0 では未定義だが慣例的に 0 を採用）。z>0 で常に 1 のため勾配が縮みにくい。 */
export function reluDerivative(z: number): number {
  return z > 0 ? 1 : 0;
}

/** 動径基底関数（ガウス型 RBF）f(z)=exp(−γz²)。z は中心からの距離。 */
export function rbf(z: number, gamma = 1): number {
  return Math.exp(-gamma * z * z);
}

/** RBF の微分 f'(z)=−2γz·exp(−γz²)。中心から離れるほど 0 に近づく（局所的にしか反応しない）。 */
export function rbfDerivative(z: number, gamma = 1): number {
  return -2 * gamma * z * rbf(z, gamma);
}

export type ActivationName = "relu" | "sigmoid" | "rbf";

/** 活性化関数を名前で呼び出す（Lab の切り替え用ディスパッチャ）。 */
export function activate(name: ActivationName, z: number, gamma = 1): number {
  if (name === "relu") return relu(z);
  if (name === "sigmoid") return sigmoid(z);
  return rbf(z, gamma);
}

/** 活性化関数の微分を名前で呼び出す。 */
export function activateDerivative(name: ActivationName, z: number, gamma = 1): number {
  if (name === "relu") return reluDerivative(z);
  if (name === "sigmoid") return sigmoidDerivative(z);
  return rbfDerivative(z, gamma);
}

// ---------------------------------------------------------------------------
// 小さなネットワーク: 入力2 → 隠れ2（活性化関数を切替可能）→ 出力1（線形・二乗誤差）
// ---------------------------------------------------------------------------

/** ネットワークの全パラメータ（シナプス結合の重みとバイアス）。 */
export type NetParams = {
  /** w1[j][i]: 入力 i → 隠れユニット j への重み。 */
  w1: [[number, number], [number, number]];
  b1: [number, number];
  /** w2[j]: 隠れユニット j → 出力への重み。 */
  w2: [number, number];
  b2: number;
};

/** 順伝播の全中間値（計算グラフの各ノードの値）。 */
export type ForwardTrace = {
  x: [number, number];
  y: number;
  /** 隠れ層の重み付き和（活性化前）。 */
  z1: [number, number];
  /** 隠れ層の活性化後の出力。 */
  a1: [number, number];
  /** 出力層の重み付き和（線形出力なのでこれがそのまま予測値）。 */
  z2: number;
  yhat: number;
  /** 二乗誤差損失 L=½(y−ŷ)²。 */
  loss: number;
};

/** 順伝播: x → 隠れ層（重み付き和→活性化）→ 出力（線形）→ 損失。 */
export function forwardPass(
  x: [number, number],
  y: number,
  params: NetParams,
  activation: ActivationName,
  gamma = 1,
): ForwardTrace {
  const z1: [number, number] = [0, 0];
  const a1: [number, number] = [0, 0];
  for (let j = 0; j < 2; j++) {
    z1[j] = params.w1[j][0] * x[0] + params.w1[j][1] * x[1] + params.b1[j];
    a1[j] = activate(activation, z1[j], gamma);
  }
  const z2 = params.w2[0] * a1[0] + params.w2[1] * a1[1] + params.b2;
  const yhat = z2; // 出力層は線形（活性化なし）
  const loss = 0.5 * (y - yhat) * (y - yhat);
  return { x, y, z1, a1, z2, yhat, loss };
}

/** 誤差逆伝播で求めた各パラメータ・中間値に対する勾配（∂L/∂・）。 */
export type Gradients = {
  dYhat: number;
  dZ2: number;
  dW2: [number, number];
  dB2: number;
  dA1: [number, number];
  dZ1: [number, number];
  dW1: [[number, number], [number, number]];
  dB1: [number, number];
};

/**
 * 誤差逆伝播法（連鎖律）: 損失から出力層→隠れ層→入力の重みへ、勾配を後ろ向きに伝える。
 * L=½(y−ŷ)² → ∂L/∂ŷ=−(y−ŷ) → ∂L/∂z2=∂L/∂ŷ（線形出力） → ∂L/∂W2,b2 は a1 との積
 * → ∂L/∂a1=W2·∂L/∂z2 → ∂L/∂z1=∂L/∂a1·活性化'(z1)（ここで活性化関数の微分が掛かる＝勾配消失の入口）
 * → ∂L/∂W1,b1 は x との積。
 */
export function backwardPass(
  trace: ForwardTrace,
  params: NetParams,
  activation: ActivationName,
  gamma = 1,
): Gradients {
  const dYhat = -(trace.y - trace.yhat);
  const dZ2 = dYhat; // d(yhat)/d(z2) = 1（線形出力）
  const dW2: [number, number] = [dZ2 * trace.a1[0], dZ2 * trace.a1[1]];
  const dB2 = dZ2;
  const dA1: [number, number] = [dZ2 * params.w2[0], dZ2 * params.w2[1]];
  const dZ1: [number, number] = [
    dA1[0] * activateDerivative(activation, trace.z1[0], gamma),
    dA1[1] * activateDerivative(activation, trace.z1[1], gamma),
  ];
  const dW1: [[number, number], [number, number]] = [
    [dZ1[0] * trace.x[0], dZ1[0] * trace.x[1]],
    [dZ1[1] * trace.x[0], dZ1[1] * trace.x[1]],
  ];
  const dB1: [number, number] = [dZ1[0], dZ1[1]];
  return { dYhat, dZ2, dW2, dB2, dA1, dZ1, dW1, dB1 };
}

/** 確率的勾配降下の1歩: params ← params − η·grads（[最適化]の x←x−η∇f と同じ更新則）。 */
export function sgdUpdate(params: NetParams, grads: Gradients, lr: number): NetParams {
  return {
    w1: [
      [params.w1[0][0] - lr * grads.dW1[0][0], params.w1[0][1] - lr * grads.dW1[0][1]],
      [params.w1[1][0] - lr * grads.dW1[1][0], params.w1[1][1] - lr * grads.dW1[1][1]],
    ],
    b1: [params.b1[0] - lr * grads.dB1[0], params.b1[1] - lr * grads.dB1[1]],
    w2: [params.w2[0] - lr * grads.dW2[0], params.w2[1] - lr * grads.dW2[1]],
    b2: params.b2 - lr * grads.dB2,
  };
}

// ---------------------------------------------------------------------------
// 勾配消失: 層を重ねるほど活性化関数の微分の積が縮む/縮まないことを見せる
// ---------------------------------------------------------------------------

/**
 * 深さ depth の層を貫通する勾配の大きさの累積積 [1, d, d², …, d^depth] を返す
 * （各層で同じ局所微分 d=活性化'(z) が掛かる単純化モデル）。
 * シグモイドは d≤0.25 なので層を重ねるほど急速に 0 へ近づく（勾配消失）。
 * ReLU は活性域（z>0）で d=1 なので積が縮まない。
 */
export function cumulativeGradientProfile(
  depth: number,
  activation: ActivationName,
  z = 0,
  gamma = 1,
): number[] {
  const d = activateDerivative(activation, z, gamma);
  const out: number[] = [1];
  for (let k = 1; k <= depth; k++) out.push(out[k - 1] * d);
  return out;
}

// ---------------------------------------------------------------------------
// ドロップアウト
// ---------------------------------------------------------------------------

/** ドロップアウトマスク: 各ユニットを確率 rate で 0（落とす）、それ以外は 1（残す）。 */
export function dropoutMask(n: number, rate: number, rng: Rng): number[] {
  return Array.from({ length: n }, () => (rng() < rate ? 0 : 1));
}

/**
 * インバーテッドドロップアウト: 残ったユニットの出力を 1/(1−rate) 倍し、
 * 学習時の期待出力を推論時（ドロップアウトなし）と揃える。
 */
export function applyDropout(activations: readonly number[], mask: readonly number[], rate: number): number[] {
  const keepProb = 1 - rate;
  if (keepProb <= 0) return activations.map(() => 0);
  return activations.map((a, i) => (a * mask[i]) / keepProb);
}

// ---------------------------------------------------------------------------
// バッチ正規化
// ---------------------------------------------------------------------------

export type BatchNormResult = {
  mean: number;
  variance: number;
  /** 平均0・分散1に正規化した値。 */
  normalized: number[];
  /** 学習可能パラメータ γ・β でスケール・シフトし直した最終出力。 */
  scaled: number[];
};

/** バッチ正規化: ミニバッチの平均・分散で正規化し、γ でスケール・β でシフトし直す。 */
export function batchNormalize(values: readonly number[], gamma = 1, beta = 0, eps = 1e-5): BatchNormResult {
  const n = values.length;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const denom = Math.sqrt(variance + eps);
  const normalized = values.map((v) => (v - mean) / denom);
  const scaled = normalized.map((v) => gamma * v + beta);
  return { mean, variance, normalized, scaled };
}

// ---------------------------------------------------------------------------
// 描画用の小道具
// ---------------------------------------------------------------------------

/** 区間 [a, b] を n 等分した端点込みの数列。 */
export function linspace(a: number, b: number, n: number): number[] {
  if (n < 2) return [a];
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(a + ((b - a) * i) / (n - 1));
  return out;
}
