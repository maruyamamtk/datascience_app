"use client";

import { useNeuralNetworkModelsStore } from "@/lib/store/neural-network-models";

const LAYER_LABELS = ["畳み込み層1", "畳み込み層2", "畳み込み層3", "全結合層1", "全結合層2（出力）"];

/**
 * 転移学習の概念図（描画層・簡易版）。事前学習ずみネットワークの層を模した5つのブロックをクリックすると
 * 凍結（青、重みを固定してそのまま使う）⇄再学習（橙、新しいタスクのデータで重みを更新する）を切り替えられる。
 * CNN/RNN本体のような深い数式導出は持たず、«どの層を凍結し、どの層を再学習するか» という設計判断を
 * 直感的に触って確かめる位置づけ（issueのスコープ: 概念図は簡易でよい）。
 */
export function TransferLearningDiagram() {
  const frozenLayers = useNeuralNetworkModelsStore((s) => s.derived.frozenLayers);
  const setControl = useNeuralNetworkModelsStore((s) => s.setControl);

  const toggle = (i: number) => {
    const next = [...frozenLayers];
    next[i] = !next[i];
    setControl("frozenLayers", next);
  };

  const frozenCount = frozenLayers.filter(Boolean).length;

  return (
    <div id="nnm-transfer-learning" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        大きなデータセットで事前学習したネットワークを、レイヤーをクリックして «凍結»（青、重みをそのまま使う）と
        «再学習»（橙、手元の小さなデータで重みを更新する）に振り分けてみよう。
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3 overflow-x-auto py-2">
        {LAYER_LABELS.map((label, i) => {
          const frozen = frozenLayers[i] ?? false;
          return (
            <button
              key={label}
              type="button"
              onClick={() => toggle(i)}
              aria-pressed={frozen}
              className={`flex h-20 w-24 flex-col items-center justify-center gap-1 rounded-xl border-2 text-xs font-semibold transition ${
                frozen
                  ? "border-blue-500 bg-blue-50 text-blue-800"
                  : "border-amber-500 bg-amber-50 text-amber-800"
              }`}
            >
              <span>{label}</span>
              <span>{frozen ? "🧊 凍結" : "🔥 再学習"}</span>
            </button>
          );
        })}
      </div>

      <p className="text-center text-xs text-slate-500">
        {frozenCount}/{LAYER_LABELS.length} 層を凍結中——入力に近い層ほど«エッジ・色・簡単な模様»のような
        タスクに依存しない特徴を学びやすく、出力に近い層ほど«そのタスク固有»の特徴を学ぶ。
      </p>

      <div className="grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-600 sm:grid-cols-2">
        <div>
          <p className="font-semibold text-slate-700">凍結層を増やすと…</p>
          <p>学習するパラメータが減り、少ないデータ・短い時間で済む。事前学習に使ったタスクと新タスクが似ているほど有利。</p>
        </div>
        <div>
          <p className="font-semibold text-slate-700">再学習層を増やすと…</p>
          <p>新タスクに合わせて柔軟に調整できる反面、必要なデータ・計算量が増え、データが少ないと過学習しやすくなる。</p>
        </div>
      </div>
    </div>
  );
}
