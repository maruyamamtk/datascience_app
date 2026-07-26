/**
 * SequenceStepper（RNN/LSTMの時間展開を1コマずつ見せるステッパー）のフレーム列ビルダー
 * （計算層・純関数）。ConvPoolStepper と同様に、RnnLstmLab の操作対象（forgetBias 等）とは
 * 切り離した固定パラメータで、5ステップの短い系列を1つずつ処理する様子を追う。
 * LSTM モードでは forget ゲートの重み wf・uf をあえて非ゼロにし、入力 x_t に応じて
 * ゲートが実際に開閉する（値が動く）様子を見せる——RnnLstmLab（forgetBias固定でゲートを一定にする
 * 設定）とは異なる役割を持たせている。副作用なし（Vitest 対象）。
 */

import type { VizFrame } from "@/components/viz";
import {
  type LstmParams,
  type LstmStepResult,
  lstmUnroll,
  type RnnParams,
  type RnnStepResult,
  rnnUnroll,
} from "@/lib/stats/neural-network-models";

export const STEPPER_XS: number[] = [1.5, -1.2, 0.3, -1.8, 1.0];

export const STEPPER_RNN_PARAMS: RnnParams = { wxh: 0.9, whh: 0.7, bh: 0, why: 1, by: 0 };

export const STEPPER_LSTM_PARAMS: LstmParams = {
  wf: 0.9,
  uf: 0.2,
  bf: 0.5,
  wi: 0.7,
  ui: 0.2,
  bi: 0,
  wg: 0.8,
  ug: 0.1,
  bg: 0,
  wo: 0.6,
  uo: 0.3,
  bo: 0,
};

export type SequenceMode = "rnn" | "lstm";

export type SequencePayload = {
  mode: SequenceMode;
  t: number;
  total: number;
  x: number;
  rnn?: RnnStepResult;
  lstm?: LstmStepResult;
};

const fmt = (v: number, d = 3) => v.toFixed(d);

/** SequenceStepper のフレーム列（mode に応じて RNN 5コマ or LSTM 5コマ）。 */
export function buildSequenceFrames(mode: SequenceMode): VizFrame<SequencePayload>[] {
  if (mode === "rnn") {
    const steps = rnnUnroll(STEPPER_XS, 0, STEPPER_RNN_PARAMS);
    return steps.map((s, idx) => ({
      payload: { mode, t: idx + 1, total: steps.length, x: STEPPER_XS[idx], rnn: s },
      highlights: [`x-${idx}`, "h"],
      callout: {
        title: `t=${idx + 1}: 隠れ状態を更新`,
        body: `z_{${idx + 1}}=w_{xh}x_{${idx + 1}}+w_{hh}h_{${idx}}+b_h=${fmt(s.z)}、h_{${idx + 1}}=\\tanh(z_{${idx + 1}})=${fmt(s.h)}。`,
        note:
          idx === 0
            ? "隠れ状態hは«それまでの入力の要約»——次のステップにそのまま持ち越され、新しい入力と混ざり合って上書きされる。"
            : undefined,
      },
    }));
  }

  const steps = lstmUnroll(STEPPER_XS, 0, 0, STEPPER_LSTM_PARAMS);
  return steps.map((s, idx) => ({
    payload: { mode, t: idx + 1, total: steps.length, x: STEPPER_XS[idx], lstm: s },
    highlights: [`x-${idx}`, "h", "c", "gate-f", "gate-i", "gate-o"],
    callout: {
      title: `t=${idx + 1}: 3つのゲートでセル状態を更新`,
      body: `忘却ゲート f=${fmt(s.f)}（${s.f > 0.5 ? "開き気味" : "閉じ気味"}）、入力ゲート i=${fmt(s.i)}、候補 g=${fmt(s.g)} → セル状態 c=f·c_{t-1}+i·g=${fmt(s.c)}。出力ゲート o=${fmt(s.o)} → h=o·tanh(c)=${fmt(s.h)}。`,
      note:
        idx === 0
          ? "忘却ゲートが開いている（1に近い）ほど前のセル状態c_{t-1}が残り、閉じている（0に近い）ほど«忘れる»——このゲートの開閉を学習で決めるのがLSTMの核心。"
          : undefined,
      kind: "supplement",
    },
  }));
}
