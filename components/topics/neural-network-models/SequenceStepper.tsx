"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { useNeuralNetworkModelsStore, useSequenceFrameStore } from "@/lib/store/neural-network-models";
import { buildSequenceFrames, STEPPER_XS, type SequencePayload } from "./sequenceFrames";

/** 0(閉)〜1(開)の値を赤→緑へ線形補間した色にする（ゲートの開閉ハイライト用）。 */
function gateColor(v: number): string {
  const clamped = Math.max(0, Math.min(1, v));
  const closed = { r: 0xdc, g: 0x26, b: 0x26 };
  const open = { r: 0x16, g: 0xa3, b: 0x4a };
  const r = Math.round(closed.r + (open.r - closed.r) * clamped);
  const g = Math.round(closed.g + (open.g - closed.g) * clamped);
  const b = Math.round(closed.b + (open.b - closed.b) * clamped);
  return `rgb(${r},${g},${b})`;
}

function GateBox({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="flex h-14 w-16 flex-col items-center justify-center rounded-lg border-2 text-white shadow-sm transition-colors"
      style={{ backgroundColor: gateColor(value), borderColor: gateColor(value) }}
    >
      <span className="text-[10px] font-semibold opacity-90">{label}</span>
      <span className="font-mono text-xs font-bold">{value.toFixed(2)}</span>
    </div>
  );
}

/**
 * RNN/LSTM の時間展開ステッパー（描画層・アルゴリズム図鑑スタイル）。固定の5ステップ系列を
 * 1コマずつ処理し、RNNなら隠れ状態の更新を、LSTMなら3つのゲート（忘却・入力・出力）の開閉
 * （赤=閉じている〜緑=開いている）とセル状態・隠れ状態の更新を近傍コールアウトとともに見せる。
 * rnnMode（RNN⇄LSTM切替）は RnnLstmLab と共有する主ストアの controls から読む
 * （どちらのコンポーネントで切り替えても両方に反映される single source of truth）。
 * フレーム位置は本ステッパー専用の空ストアが持つ（tasks/lessons.md #76）。
 */
export function SequenceStepper() {
  const rnnMode = useNeuralNetworkModelsStore((s) => s.derived.rnnMode);
  const setControl = useNeuralNetworkModelsStore((s) => s.setControl);

  const index = useSequenceFrameStore((s) => s.frame.index);
  const count = useSequenceFrameStore((s) => s.frame.count);
  const playing = useSequenceFrameStore((s) => s.frame.playing);
  const nextFrame = useSequenceFrameStore((s) => s.nextFrame);
  const prevFrame = useSequenceFrameStore((s) => s.prevFrame);
  const goToFrame = useSequenceFrameStore((s) => s.goToFrame);
  const setPlaying = useSequenceFrameStore((s) => s.setPlaying);
  const setFrameCount = useSequenceFrameStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildSequenceFrames(rnnMode), [rnnMode]);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 2000 });

  const frame = frameAt<SequencePayload>(frames, index);
  const t = frame?.payload?.t ?? 1;

  return (
    <div id="nnm-sequence-stepper" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-700">系列を1ステップずつ処理する（t=1→5）</p>
        <div className="flex overflow-hidden rounded-lg border border-slate-300 text-xs">
          <button
            type="button"
            onClick={() => setControl("rnnMode", "rnn")}
            className={`px-3 py-1.5 ${rnnMode === "rnn" ? "bg-blue-600 text-white" : "bg-white text-slate-600"}`}
          >
            通常のRNN
          </button>
          <button
            type="button"
            onClick={() => setControl("rnnMode", "lstm")}
            className={`px-3 py-1.5 ${rnnMode === "lstm" ? "bg-emerald-600 text-white" : "bg-white text-slate-600"}`}
          >
            LSTM
          </button>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {STEPPER_XS.map((x, i) => {
          const active = i + 1 === t;
          return (
            <div
              key={i}
              className={`flex h-12 w-14 flex-col items-center justify-center rounded-lg border font-mono text-xs ${
                active ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-500"
              }`}
            >
              <span>x{i + 1}={x.toFixed(1)}</span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 overflow-x-auto py-2">
        {rnnMode === "lstm" && frame?.payload?.lstm ? (
          <>
            <GateBox label="忘却 f" value={frame.payload.lstm.f} />
            <GateBox label="入力 i" value={frame.payload.lstm.i} />
            <GateBox label="出力 o" value={frame.payload.lstm.o} />
            <div className="flex h-14 w-16 flex-col items-center justify-center rounded-lg border-2 border-violet-400 bg-violet-50 text-violet-800">
              <span className="text-[10px] font-semibold">セル c</span>
              <span className="font-mono text-xs font-bold">{frame.payload.lstm.c.toFixed(2)}</span>
            </div>
            <div className="flex h-14 w-16 flex-col items-center justify-center rounded-lg border-2 border-slate-700 bg-slate-800 text-white">
              <span className="text-[10px] font-semibold">隠れ h</span>
              <span className="font-mono text-xs font-bold">{frame.payload.lstm.h.toFixed(2)}</span>
            </div>
          </>
        ) : frame?.payload?.rnn ? (
          <div className="flex h-14 w-20 flex-col items-center justify-center rounded-lg border-2 border-slate-700 bg-slate-800 text-white">
            <span className="text-[10px] font-semibold">隠れ h（記憶）</span>
            <span className="font-mono text-xs font-bold">{frame.payload.rnn.h.toFixed(3)}</span>
          </div>
        ) : null}
      </div>

      {frame ? (
        <p className="text-center font-mono text-xs text-slate-500">
          {rnnMode === "lstm" ? "LSTM" : "RNN"} ／ ステップ {frame.payload?.t}/{frame.payload?.total}
        </p>
      ) : null}

      {frame?.callout ? <Callout {...frame.callout} /> : null}

      <StepPlayer
        count={count}
        index={index}
        playing={playing}
        onPrev={prevFrame}
        onNext={nextFrame}
        onSeek={goToFrame}
        onTogglePlay={() => setPlaying(!playing)}
      />

      <p className="text-xs leading-relaxed text-slate-500">
        {rnnMode === "lstm"
          ? "ゲートの色は赤（閉じている≈0）〜緑（開いている≈1）で表す。忘却ゲートが赤いステップでは前のセル状態がほぼ捨てられ、緑のステップでは残される——xの符号に応じてゲートが実際に開閉している様子を確かめよう。"
          : "RNNには«忘れる/覚える»を選ぶ仕組みがなく、隠れ状態は毎回同じ式で上書きされる——古い情報は活性化関数を通るたびに指数的に薄まっていく（LSTMタブに切り替えて比較）。"}
      </p>
    </div>
  );
}
