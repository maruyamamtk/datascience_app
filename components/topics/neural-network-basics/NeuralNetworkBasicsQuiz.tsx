"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "隠れ層のユニットが「重み付き和（線形結合）」のあとに活性化関数を通すのはなぜ？",
    choices: [
      { label: "非線形性を入れないと、何層重ねても全体が1つの線形写像にしかならないから", correct: true },
      { label: "計算を速くするため", correct: false },
      { label: "重みの数を減らすため", correct: false },
      { label: "勾配降下法が使えなくなるから", correct: false },
    ],
    explain:
      "線形結合だけを合成しても線形結合にしかならない（行列の積は行列）。活性化関数（ReLU・シグモイド等）という非線形な関数を挟むことで、ネットワークは複雑な非線形関数を表現できるようになる。",
  },
  {
    prompt: "誤差逆伝播法（バックプロパゲーション）で使われる数学的な道具の中心は何？",
    choices: [
      { label: "連鎖律（合成関数の微分）を出力側から入力側へ繰り返し適用する", correct: true },
      { label: "行列の固有値分解", correct: false },
      { label: "ラグランジュ未定乗数法", correct: false },
      { label: "積分による面積計算", correct: false },
    ],
    explain:
      "損失 L はネットワークの合成関数。連鎖律 ∂L/∂w=∂L/∂(上流)×∂(上流)/∂w を出力側から入力側へ繰り返し適用し、各パラメータの勾配を効率よく計算するのが誤差逆伝播法。計算グラフを逆向きにたどる操作そのもの。",
  },
  {
    prompt: "深いネットワークでシグモイドを活性化関数に使うと «勾配消失» が起きやすいのはなぜ？",
    choices: [
      { label: "シグモイドの微分は最大でも0.25で、層を重ねるほどこれを掛け合わせた値が指数的に0へ近づくから", correct: true },
      { label: "シグモイドの出力が負になることがあるから", correct: false },
      { label: "シグモイドは微分不可能だから", correct: false },
      { label: "シグモイドの計算コストが高すぎるから", correct: false },
    ],
    explain:
      "誤差逆伝播は各層で活性化関数の微分を掛け算しながら勾配を伝える。シグモイドの微分は0〜0.25の範囲なので、層数が増えるほど積が急速に小さくなり、入力側の層にはほとんど勾配が届かなくなる——これが勾配消失。ReLU は活性域で微分が1なので緩和されやすい。",
  },
  {
    prompt: "ドロップアウトの «インバーテッド» 実装で、生き残ったユニットの出力を 1/(1−rate) 倍するのはなぜ？",
    choices: [
      { label: "学習時（一部のユニットが0）の出力の期待値を、推論時（全ユニット使用）とそろえるため", correct: true },
      { label: "計算を高速化するため", correct: false },
      { label: "重みが大きくなりすぎるのを防ぐため", correct: false },
      { label: "過学習をわざと起こすため", correct: false },
    ],
    explain:
      "ドロップアウトは学習のたびにランダムなユニットを0にする。何もしないと出力の平均的な大きさが学習時と推論時で変わってしまうため、生き残ったユニットを 1/(1−rate) 倍して底上げし、期待値をそろえる（推論時はドロップアウト自体を無効化する）。",
  },
  {
    prompt: "バッチ正規化がしていることの説明として正しいのは？",
    choices: [
      { label: "ミニバッチの平均・分散で各層の入力を正規化し、学習可能な γ・β でスケール・シフトし直す", correct: true },
      { label: "重みを毎回0に初期化し直す", correct: false },
      { label: "訓練データそのものを標準化して保存し直す", correct: false },
      { label: "ネットワークの層数を自動で減らす", correct: false },
    ],
    explain:
      "バッチ正規化は各層の出力（または入力）をそのミニバッチの平均・分散で正規化し、学習可能なパラメータ γ（スケール）・β（シフト）で表現力を保ったまま分布を整える。学習の安定化・高速化、勾配消失の緩和に役立つ。",
  },
  {
    prompt: "「計算グラフ」というときに指しているものは？",
    choices: [
      { label: "変数・演算をノード、依存関係をエッジとして表した、計算の流れそのものを表す有向グラフ", correct: true },
      { label: "ニューラルネットの学習曲線（損失の推移）を折れ線グラフにしたもの", correct: false },
      { label: "混同行列のようなモデル評価の表", correct: false },
      { label: "パラメータの初期値をランダムに決める手順", correct: false },
    ],
    explain:
      "計算グラフは、入力・重み・中間値・出力・損失といった «値» をノード、演算（掛け算・足し算・活性化関数など）をエッジ/ノードとして繋いだグラフ。順伝播はこのグラフを入力側から出力側へ、逆伝播は出力（損失）側から入力側へ、連鎖律に従ってたどる操作として統一的に理解できる。",
  },
];

function QuestionCard({ q, index }: { q: Question; index: number }) {
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;
  const isCorrect = answered && q.choices[selected].correct;

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-800">
        Q{index + 1}. {q.prompt}
      </p>
      <div className="flex flex-col gap-2">
        {q.choices.map((c, i) => {
          const chosen = selected === i;
          const showState = answered && (chosen || c.correct);
          let cls = "border-slate-300 bg-white text-slate-700 hover:bg-slate-50";
          if (showState) {
            cls = c.correct
              ? "border-green-500 bg-green-50 text-green-800"
              : "border-red-400 bg-red-50 text-red-700";
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(i)}
              aria-pressed={chosen}
              className={`rounded-lg border px-3 py-2 text-left text-sm transition ${cls}`}
            >
              {c.label}
              {showState && c.correct ? " ✓" : null}
              {showState && chosen && !c.correct ? " ✗" : null}
            </button>
          );
        })}
      </div>
      {answered ? (
        <div
          className={`rounded-lg p-3 text-sm leading-relaxed ${
            isCorrect ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900"
          }`}
          role="status"
        >
          <span className="font-semibold">{isCorrect ? "正解！ " : "もう一度考えてみよう。 "}</span>
          {q.explain}
        </div>
      ) : null}
    </div>
  );
}

/** ニューラルネットワークの仕組み 演習（確認問題 → 即時フィードバック → 操作へ戻る）。 */
export function NeuralNetworkBasicsQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#nn-backprop"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 誤差逆伝播ステッパーに戻って、連鎖律が計算グラフをどう遡るか確かめる
      </a>
    </div>
  );
}
