/**
 * 時系列モデル（M-2）の計算層（純関数）。
 * AR（自己回帰）・MA（移動平均）・ARMA・和分（ARIMA の I＝ランダムウォーク）の生成と、
 * AR(1) の理論自己相関 ρ(k)=φ^k・Yule-Walker による φ 推定・AR(1) の逐次予測を扱う。
 * 「前の値・前のショックから次の値を作る」漸化式として時系列モデルを理解する土台。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。乱数は呼び出し側の Rng に閉じる。
 */

import type { Rng } from "./random";
import { autocorrelation } from "./time-series";

/** ボックス–ミュラー法で標準正規。 */
function gauss(rng: Rng): number {
  const u1 = Math.max(1e-12, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * AR(1) 過程 x_t = φ·x_{t-1} + e_t（e_t〜N(0,σ²)）を長さ n で生成。x_0=0 から出発。
 * |φ|<1 で定常。φ が1に近いほど «前の値» を強く引きずる（持続性が高い）。
 */
export function simulateAR1(params: { phi: number; sigma: number; n: number; rng: Rng }): number[] {
  const { phi, sigma, n, rng } = params;
  const out: number[] = [0];
  for (let t = 1; t < n; t++) out.push(phi * out[t - 1] + sigma * gauss(rng));
  return out;
}

/**
 * MA(1) 過程 x_t = e_t + θ·e_{t-1}。直近2つのショックの重ね合わせ。
 * 自己相関はラグ1のみ非0でラグ2以降ぴたりと0になる（«有限の記憶»）。
 */
export function simulateMA1(params: { theta: number; sigma: number; n: number; rng: Rng }): number[] {
  const { theta, sigma, n, rng } = params;
  const eps: number[] = Array.from({ length: n }, () => sigma * gauss(rng));
  const out: number[] = [eps[0]];
  for (let t = 1; t < n; t++) out.push(eps[t] + theta * eps[t - 1]);
  return out;
}

/**
 * ランダムウォーク x_t = x_{t-1} + e_t（＝AR(1) の φ=1、ARIMA(0,1,0)）。
 * 非定常：分散が t に比例して増える。階差を取るとホワイトノイズ（定常）になる。
 */
export function simulateRandomWalk(params: { sigma: number; n: number; rng: Rng }): number[] {
  const { sigma, n, rng } = params;
  const out: number[] = [0];
  for (let t = 1; t < n; t++) out.push(out[t - 1] + sigma * gauss(rng));
  return out;
}

/** AR(1) の理論自己相関 ρ(k)=φ^k（k≥0）。φ>0 は滑らかに減衰、φ<0 は符号が交互。 */
export function theoreticalAcfAR1(phi: number, maxLag: number): number[] {
  return Array.from({ length: maxLag + 1 }, (_, k) => phi ** k);
}

/** AR(1) の理論分散 Var[x]=σ²/(1−φ²)（|φ|<1）。 */
export function ar1Variance(phi: number, sigma: number): number {
  const d = 1 - phi * phi;
  return d > 0 ? (sigma * sigma) / d : Infinity;
}

/**
 * Yule-Walker による AR(1) の φ 推定：φ̂ = ρ̂(1)（標本ラグ1自己相関）。
 * «漸化式の係数は、1期ずれの相関に等しい» という AR(1) の関係を使う。
 */
export function fitAR1(series: readonly number[]): number {
  return autocorrelation(series, 1);
}

/**
 * AR(1) の h 期先予測 x̂_{t+h}=φ^h·x_t。ショック e の期待値0のため «φ^h で0（平均）へ減衰»。
 * 返り値は h=1..steps の予測列。
 */
export function forecastAR1(lastValue: number, phi: number, steps: number): number[] {
  return Array.from({ length: steps }, (_, i) => lastValue * phi ** (i + 1));
}
