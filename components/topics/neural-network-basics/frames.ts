/**
 * 誤差逆伝播ステッパー（計算グラフを前向き→後ろ向きに辿るコマ送り）のフレーム列ビルダー
 * （計算層・純関数）。入力2→隠れ2→出力1の小さなネットワークを、順伝播（入力→隠れ→出力→損失）
 * →逆伝播（損失→出力の勾配→隠れ層への逆伝播→入力層の重みの勾配）の順に1ノードずつ見せる
 * （アルゴリズム図鑑スタイル）。副作用なし（Vitest 対象）。描画は BackpropStepper.tsx が購読する。
 */

import type { VizFrame } from "@/components/viz";
import {
  backwardPass,
  type ActivationName,
  forwardPass,
  type NetParams,
} from "@/lib/stats/neural-network-basics";

export type BackpropPayload = {
  phase: "forward" | "backward";
  /** 1..9（表示用の通し番号）。 */
  step: number;
};

const fmt = (v: number, d = 3) => v.toFixed(d);

const ACT_LABEL: Record<ActivationName, string> = {
  relu: "ReLU",
  sigmoid: "シグモイド",
  rbf: "動径基底関数",
};

/**
 * 誤差逆伝播ステッパーのフレーム列を作る。x・y・活性化関数を指定すると、その具体的な数値で
 * 順伝播5コマ→逆伝播4コマの計9コマを組み立てる。ネットワークの重みは呼び出し側が渡す
 * （lib/store/neural-network-basics.ts の NET_PARAMS を使う想定）。
 */
export function buildBackpropFrames(
  x0: number,
  x1: number,
  y: number,
  activation: ActivationName,
  params: NetParams,
): VizFrame<BackpropPayload>[] {
  const trace = forwardPass([x0, x1], y, params, activation);
  const grads = backwardPass(trace, params, activation);
  const actName = ACT_LABEL[activation];

  const frames: VizFrame<BackpropPayload>[] = [
    {
      payload: { phase: "forward", step: 1 },
      highlights: ["x0", "x1"],
      callout: {
        title: "① 入力を計算グラフに流す",
        body: `入力ノードに x₀=${fmt(x0)}, x₁=${fmt(x1)} をセットする。これが計算グラフの出発点。`,
        note: "計算グラフはノード（値）とエッジ（重み・演算）の有向グラフ。順伝播はこのグラフを入力側から出力側へたどる。",
      },
    },
    {
      payload: { phase: "forward", step: 2 },
      highlights: ["x0", "x1", "h0", "e-x0-h0", "e-x1-h0"],
      callout: {
        title: "② 隠れユニット1: 重み付き和→活性化",
        body: `z₁₍₀₎=w·x+b=${fmt(trace.z1[0])} を計算し、${actName}で a₁₍₀₎=${fmt(trace.a1[0])} に変換する。`,
        note: "各エッジの重みが «シナプス結合»。重み付き和（線形結合）のあとに活性化関数を通すのが1つの隠れユニットの仕事。",
      },
    },
    {
      payload: { phase: "forward", step: 3 },
      highlights: ["x0", "x1", "h1", "e-x0-h1", "e-x1-h1"],
      callout: {
        title: "③ 隠れユニット2",
        body: `同じ入力から別の重みで z₁₍₁₎=${fmt(trace.z1[1])}、a₁₍₁₎=${fmt(trace.a1[1])} を計算する。`,
        note: "隠れユニットごとに異なる重みを持つので、同じ入力からでも違う «特徴» を検出できる。",
      },
    },
    {
      payload: { phase: "forward", step: 4 },
      highlights: ["h0", "h1", "out", "e-h0-out", "e-h1-out"],
      callout: {
        title: "④ 出力層（線形結合）",
        body: `隠れ層の出力 a₁₍₀₎, a₁₍₁₎ を重み付き和して ŷ=z₂=${fmt(trace.z2)}。`,
        note: "出力層は活性化なし（線形）——回帰の予測値としてそのまま使う設定。",
      },
    },
    {
      payload: { phase: "forward", step: 5 },
      highlights: ["out", "loss"],
      callout: {
        title: "⑤ 損失を計算",
        body: `目標 y=${fmt(trace.y)} と予測 ŷ=${fmt(trace.yhat)} の二乗誤差 L=½(y−ŷ)²=${fmt(trace.loss)}。`,
        note: "順伝播はここで終わり。ここから «誤差逆伝播» で loss を出発点に逆向きへ勾配を伝える。",
        kind: "supplement",
      },
    },
    {
      payload: { phase: "backward", step: 6 },
      highlights: ["loss", "out"],
      callout: {
        title: "⑥ 逆伝播スタート: ∂L/∂ŷ",
        body: `∂L/∂ŷ=−(y−ŷ)=${fmt(grads.dYhat)}。出力が線形なので ∂ŷ/∂z₂=1、よって ∂L/∂z₂=${fmt(grads.dZ2)}も同じ値。`,
        note: "誤差逆伝播法は連鎖律の繰り返し適用。各ノードで «自分の出力に対する上流の勾配 × 自分の局所的な微分» を計算し、さらに上流へ渡す。",
      },
    },
    {
      payload: { phase: "backward", step: 7 },
      highlights: ["out", "e-h0-out", "e-h1-out"],
      callout: {
        title: "⑦ 出力層の重み勾配",
        body: `∂L/∂W2=[${fmt(grads.dW2[0])}, ${fmt(grads.dW2[1])}]（=∂L/∂z₂ × a₁）、∂L/∂b2=${fmt(grads.dB2)}。`,
        note: "重みの勾配は «上流の勾配 × その重みに入ってきた値（ここでは a₁）»——これがどの重みでも共通の形。",
      },
    },
    {
      payload: { phase: "backward", step: 8 },
      highlights: ["h0", "h1", "out"],
      callout: {
        title: "⑧ 隠れ層へ逆伝播（活性化関数の微分が掛かる）",
        body: `∂L/∂a₁=[${fmt(grads.dA1[0])}, ${fmt(grads.dA1[1])}] を W2 経由で受け取り、${actName}の微分を掛けて ∂L/∂z₁=[${fmt(grads.dZ1[0])}, ${fmt(grads.dZ1[1])}] にする。`,
        note: "ここが «勾配消失» の入口。シグモイドの微分は最大0.25なので、層を重ねるほどこの掛け算で勾配が急速に縮む（ReLU は活性域で1なので縮みにくい）。",
        kind: "supplement",
      },
    },
    {
      payload: { phase: "backward", step: 9 },
      highlights: ["x0", "x1", "h0", "h1", "e-x0-h0", "e-x1-h0", "e-x0-h1", "e-x1-h1"],
      callout: {
        title: "⑨ 入力層の重み勾配",
        body: `∂L/∂W1=[[${fmt(grads.dW1[0][0])}, ${fmt(grads.dW1[0][1])}], [${fmt(grads.dW1[1][0])}, ${fmt(grads.dW1[1][1])}]]、∂L/∂b1=[${fmt(grads.dB1[0])}, ${fmt(grads.dB1[1])}]。`,
        note: "全パラメータの勾配が揃った。確率的勾配降下法はこの勾配で params ← params − η·grad と1歩更新し、これをミニバッチごとに繰り返す。",
      },
    },
  ];

  return frames;
}
