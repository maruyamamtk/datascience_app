"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { NET_PARAMS, useNeuralNetworkBasicsStore } from "@/lib/store/neural-network-basics";
import { buildBackpropFrames } from "./frames";
import { NetworkDiagram } from "./NetworkDiagram";

/**
 * 誤差逆伝播ステッパー（描画層）。小さな計算グラフ（入力2→隠れ2→出力1→損失）を
 * 順伝播（青）→逆伝播（橙）の順に1ノードずつコマ送りでたどる（アルゴリズム図鑑スタイル）。
 * ForwardLab/ActivationLab と同じ入力(x0,x1,y)・活性化関数を共有し、フレーム位置は共有ストアの frame。
 */
export function BackpropStepper() {
  const { x0, x1, y, activation, trace, grads } = useNeuralNetworkBasicsStore((s) => s.derived);
  const index = useNeuralNetworkBasicsStore((s) => s.frame.index);
  const count = useNeuralNetworkBasicsStore((s) => s.frame.count);
  const playing = useNeuralNetworkBasicsStore((s) => s.frame.playing);
  const nextFrame = useNeuralNetworkBasicsStore((s) => s.nextFrame);
  const prevFrame = useNeuralNetworkBasicsStore((s) => s.prevFrame);
  const goToFrame = useNeuralNetworkBasicsStore((s) => s.goToFrame);
  const setPlaying = useNeuralNetworkBasicsStore((s) => s.setPlaying);
  const setFrameCount = useNeuralNetworkBasicsStore((s) => s.setFrameCount);

  const frames = useMemo(
    () => buildBackpropFrames(x0, x1, y, activation, NET_PARAMS),
    [x0, x1, y, activation],
  );
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 2200 });

  const frame = frameAt(frames, index);
  const phase = frame?.payload?.phase ?? "forward";
  const accent = phase === "forward" ? "#2563eb" : "#ea580c";

  return (
    <div id="nn-backprop" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        誤差逆伝播法（計算グラフを前向き→後ろ向きに1ノードずつたどる、x=({x0.toFixed(2)},{x1.toFixed(2)})・y=
        {y.toFixed(2)}）
      </p>

      <NetworkDiagram
        values={{ x0, x1, z1: trace.z1, a1: trace.a1, yhat: trace.yhat, loss: trace.loss }}
        activeNodes={frame?.highlights ?? []}
        activeEdges={frame?.highlights ?? []}
        accent={accent}
      />

      {frame ? (
        <p className="text-center font-mono text-xs text-slate-500">
          フェーズ: {phase === "forward" ? "順伝播（青）" : "逆伝播（橙）"} ／ ステップ {frame.payload?.step}/9
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
        1〜5コマ目が順伝播（入力→隠れ層→出力→損失）、6〜9コマ目が逆伝播（損失から連鎖律で各重みの勾配を求める）。
        最終的な勾配 ∂L/∂W1={`[[${grads.dW1[0][0].toFixed(2)}, ${grads.dW1[0][1].toFixed(2)}], [${grads.dW1[1][0].toFixed(2)}, ${grads.dW1[1][1].toFixed(2)}]]`}
        を使って、確率的勾配降下法が params ← params − η·∇L と更新する。
      </p>
    </div>
  );
}
