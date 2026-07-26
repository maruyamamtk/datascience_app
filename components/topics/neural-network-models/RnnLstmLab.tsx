"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { useNeuralNetworkModelsStore } from "@/lib/store/neural-network-models";

const RNN_FORMULA = `h_t=\\tanh(w_{xh}x_t+w_{hh}h_{t-1}+b_h)=\\tanh(${term("nnr_z", "?")})=${term("nnr_h", "?")}`;

const LSTM_FORMULA = `\\begin{aligned}
f_t&=\\sigma(w_f x_t+u_f h_{t-1}+b_f)=${term("nnr_f", "?")}\\\\
i_t&=\\sigma(w_i x_t+u_i h_{t-1}+b_i)=${term("nnr_i", "?")}\\\\
g_t&=\\tanh(w_g x_t+u_g h_{t-1}+b_g)=${term("nnr_g", "?")}\\\\
c_t&=f_t\\,c_{t-1}+i_t\\,g_t=${term("nnr_c", "?")}\\\\
o_t&=\\sigma(w_o x_t+u_o h_{t-1}+b_o)=${term("nnr_o", "?")}\\\\
h_t&=o_t\\tanh(c_t)=${term("nnr_h", "?")}
\\end{aligned}`;

function GradBars({ rnn, lstm }: { rnn: number[]; lstm: number[] }) {
  const maxAbs = Math.max(1e-6, ...rnn.map(Math.abs), ...lstm.map(Math.abs));
  return (
    <div className="flex items-end gap-3 overflow-x-auto rounded-xl bg-slate-50 px-4 py-3" style={{ height: 120 }}>
      {rnn.map((v, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <div className="flex items-end gap-1" style={{ height: 80 }}>
            <div
              title={`RNN t=${i}`}
              className="w-3 rounded-t bg-blue-500"
              style={{ height: `${Math.max(2, (Math.abs(v) / maxAbs) * 70)}px` }}
            />
            <div
              title={`LSTM t=${i}`}
              className="w-3 rounded-t bg-emerald-500"
              style={{ height: `${Math.max(2, (Math.abs(lstm[i]) / maxAbs) * 70)}px` }}
            />
          </div>
          <span className="text-[10px] text-slate-400">t={i}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * RNN/LSTM の実時間操作ラボ（L0/L1 Interact）。RNN⇄LSTMを切り替えると同じ<MathFormula>の
 * tex だけが差し替わる（条件付きマウント切替はしない——tasks/lessons.md #79）。
 * forgetBias（LSTMの忘却ゲートのバイアス）を動かすと、セル状態を通る勾配プロファイルの棒グラフが
 * 実時間で伸び縮みし、«ゲートを開けたままにすると勾配が長く残る» ことを直接確かめられる。
 */
export function RnnLstmLab() {
  const { xs, rnnSteps, lstmSteps, rnnGradProfile, lstmGradProfile, rnnMode, seqT, forgetBias } =
    useNeuralNetworkModelsStore((s) => s.derived);
  const setControl = useNeuralNetworkModelsStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);

  const rnnAtT = seqT === 0 ? { z: NaN, h: 0 } : rnnSteps[seqT - 1];
  const lstmAtT = seqT === 0 ? { f: NaN, i: NaN, g: NaN, o: NaN, c: 0, h: 0 } : lstmSteps[seqT - 1];

  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    if (rnnMode === "rnn") {
      m.setValue("nnr_z", formatNumber(rnnAtT.z, 2));
      m.setValue("nnr_h", formatNumber(rnnAtT.h, 3));
      m.setHighlight("nnr_h", true, "#2563eb");
    } else {
      m.setValue("nnr_f", formatNumber(lstmAtT.f, 3));
      m.setValue("nnr_i", formatNumber(lstmAtT.i, 3));
      m.setValue("nnr_g", formatNumber(lstmAtT.g, 3));
      m.setValue("nnr_c", formatNumber(lstmAtT.c, 3));
      m.setValue("nnr_o", formatNumber(lstmAtT.o, 3));
      m.setValue("nnr_h", formatNumber(lstmAtT.h, 3));
      m.setHighlight("nnr_f", true, lstmAtT.f > 0.5 ? "#16a34a" : "#dc2626");
      m.setHighlight("nnr_h", true, "#2563eb");
    }
  }, [rnnMode, seqT, forgetBias, rnnAtT.z, rnnAtT.h, lstmAtT.f, lstmAtT.i, lstmAtT.g, lstmAtT.c, lstmAtT.o, lstmAtT.h]);

  return (
    <div id="nnm-rnn-lab" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        RNN/LSTMを切り替え、時刻 t のつまみを動かすと、その時刻の隠れ状態（LSTMならゲートも）が実時間で再計算される。
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="nnm-rnn-mode" className="text-xs font-semibold text-slate-700">
            セルの種類
          </label>
          <select
            id="nnm-rnn-mode"
            value={rnnMode}
            onChange={(e) => setControl("rnnMode", e.target.value as "rnn" | "lstm")}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="rnn">通常のRNN</option>
            <option value="lstm">LSTM</option>
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="nnm-seqt" className="font-mono text-xs font-semibold text-slate-700">
            時刻 t = {seqT === 0 ? "0（初期状態）" : seqT}
          </label>
          <input
            id="nnm-seqt"
            type="range"
            min={0}
            max={xs.length}
            step={1}
            value={seqT}
            onChange={(e) => setControl("seqT", Number(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {xs.map((x, i) => {
          const t = i + 1;
          const active = t === seqT;
          return (
            <div
              key={i}
              className={`flex h-12 w-14 flex-col items-center justify-center rounded-lg border font-mono text-xs ${
                active ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-500"
              }`}
            >
              <span>x{t}={formatNumber(x, 2)}</span>
            </div>
          );
        })}
      </div>

      <div className="space-y-1">
        <label htmlFor="nnm-forget-bias" className="font-mono text-xs font-semibold text-slate-700">
          LSTM忘却ゲートのバイアス b_f = {formatNumber(forgetBias, 2)}（ゲート値 f=σ(b_f) ≈{" "}
          {formatNumber(1 / (1 + Math.exp(-forgetBias)), 3)}）
        </label>
        <input
          id="nnm-forget-bias"
          type="range"
          min={-4}
          max={5}
          step={0.5}
          value={forgetBias}
          onChange={(e) => setControl("forgetBias", Number(e.target.value))}
          className="w-full accent-emerald-600"
        />
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={rnnMode === "rnn" ? RNN_FORMULA : LSTM_FORMULA} display />
      </div>

      <p className="text-xs font-semibold text-slate-700">
        セル状態/隠れ状態を通る勾配プロファイル（青=RNN、緑=LSTM、tが進むほど|勾配|は縮む）
      </p>
      <GradBars rnn={rnnGradProfile} lstm={lstmGradProfile} />

      <Callout
        title={forgetBias > 1.5 ? "忘却ゲートを開けたまま（f≈1）にすると勾配が長く残る" : "忘却ゲートを閉じると（f≈0）LSTMでも勾配はすぐ消える"}
        body="RNNの勾配は各ステップで «重み×活性化関数の微分» を掛け算しながら縮む。LSTMのセル状態は c_t=f_t・c_{t-1}+i_t・g_t という«足し算»の経路を持ち、忘却ゲート f_t を1に近く保てればこの経路の勾配はほとんど縮まない——バイアスb_fを大きくして試してみよう。"
        note="ただし忘却ゲートを常に1にすると«何も忘れない»ことになり、学習で調整すべきは«いつ忘れ、いつ覚えるか»そのもの——LSTMは«勾配を残す道»を用意しつつ、その道の使い方はデータから学習する。"
      />
    </div>
  );
}
