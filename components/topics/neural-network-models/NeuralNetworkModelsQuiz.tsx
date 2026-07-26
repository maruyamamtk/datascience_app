"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "畳み込み層が全結合層と比べてパラメータ数を大きく減らせる理由は？",
    choices: [
      { label: "同じフィルタ（重み）を入力全体の全位置で使い回す（パラメータ共有）から", correct: true },
      { label: "活性化関数を使わないから", correct: false },
      { label: "出力層のユニット数を減らしているから", correct: false },
      { label: "入力を毎回ランダムに間引いているから", correct: false },
    ],
    explain:
      "全結合層は入力の全ユニットと出力の全ユニットを別々の重みで結ぶが、畳み込み層は«同じ小さなフィルタ»を入力全体にスライドさせて使い回す（パラメータ共有）。これにより遠く離れたピクセル同士を直接結ぶ重みを持たず、局所的な特徴（エッジなど）だけに着目する構造上の仮定を置いている。",
  },
  {
    prompt: "入力サイズ n=7、フィルタサイズ f=3、ストライド s=2、パディング p=0 のときの畳み込み出力サイズは？",
    choices: [
      { label: "floor((7+0−3)/2)+1 = 3", correct: true },
      { label: "7", correct: false },
      { label: "4", correct: false },
      { label: "2", correct: false },
    ],
    explain:
      "出力サイズの公式 floor((n+2p−f)/s)+1 に代入すると floor((7−3)/2)+1=floor(2)+1=3。ストライドを大きくすると窓の間隔が広がり出力は粗くなる（計算量は減る）。",
  },
  {
    prompt: "Maxプーリングがしていることの説明として正しいのは？",
    choices: [
      { label: "窓の中の最大値だけを残して特徴マップを縮約する（学習パラメータは持たない）", correct: true },
      { label: "窓の中の値をすべて0に置き換える", correct: false },
      { label: "フィルタの重みを最大化するように学習する", correct: false },
      { label: "入力画像そのものの解像度を上げる", correct: false },
    ],
    explain:
      "プーリング層は各窓の値を1つの代表値（Maxなら最大値、Averageなら平均値）に要約する操作で、畳み込み層と違って学習可能な重みを持たない。位置の多少のズレに対して出力が変わりにくくなる効果もある。",
  },
  {
    prompt: "RNNの隠れ状態の更新式 h_t=tanh(w_xh x_t + w_hh h_{t-1} + b_h) が表しているものは？",
    choices: [
      { label: "«それまでの入力の要約»である前の隠れ状態と、新しい入力を混ぜ合わせて次の隠れ状態を作る再帰計算", correct: true },
      { label: "系列の全ステップを一度に並列処理する計算", correct: false },
      { label: "画像の空間的な近傍だけを見る計算", correct: false },
      { label: "重みを毎ステップランダムに初期化し直す計算", correct: false },
    ],
    explain:
      "RNNは同じ重み(w_xh, w_hh)を時間方向に使い回しながら、直前の隠れ状態h_{t-1}（記憶）と新しい入力x_tを混ぜ合わせて次の隠れ状態h_tを作る——これを系列の先頭から末尾まで繰り返す（時間展開）。",
  },
  {
    prompt: "深い時系列でRNNの勾配が消失しやすいのはなぜ？",
    choices: [
      { label: "各ステップで«重み×活性化関数の微分»を掛け算しながら勾配を伝えるため、これが1未満だと時間ステップを経るほど積が指数的に縮むから", correct: true },
      { label: "RNNは常に無限に長い系列しか扱えないから", correct: false },
      { label: "隠れ状態が整数値しか取れないから", correct: false },
      { label: "入力を正規化していないと計算自体が止まってしまうから", correct: false },
    ],
    explain:
      "[ニューラルネットワークの仕組み]の層方向の勾配消失と同じ数学的構造が、RNNでは«時間方向»に起きる。∂h_t/∂h_0 ≈ Π(w_hh・tanh'(z_k)) という積で、各項が1未満だとステップ数とともに急速に0へ近づく。",
  },
  {
    prompt: "LSTMのセル状態の更新式 c_t=f_t・c_{t-1}+i_t・g_t が、単純なRNNより勾配消失に強い理由は？",
    choices: [
      { label: "c_{t-1}からc_tへの経路が«掛け算»ではなく«足し算»（忘却ゲートf_tだけの係数）になり、f_tを1に近く保てば勾配が縮みにくいから", correct: true },
      { label: "LSTMは活性化関数を一切使わないから", correct: false },
      { label: "LSTMは常にすべての過去の入力をそのまま記憶し続けるから", correct: false },
      { label: "ゲートの数が多いほど計算が速くなるから", correct: false },
    ],
    explain:
      "c_tをc_{t-1}で偏微分すると∂c_t/∂c_{t-1}=f_t。RNNの∂h_t/∂h_{t-1}=w_hh・tanh'(z_t)のような«重み×活性化関数の微分»の掛け算ではなく、学習で1に近づけられる忘却ゲートf_tだけの係数になる——これがLSTMが長い系列でも勾配を保ちやすい数学的な理由。",
  },
  {
    prompt: "転移学習で、事前学習ずみネットワークの«入力に近い層»を凍結し、«出力に近い層»だけ再学習するのが典型的なのはなぜ？",
    choices: [
      { label: "入力に近い層はエッジ・色などタスクに依存しない汎用的な特徴を学びやすく、出力に近い層ほどそのタスク固有の特徴を学ぶから", correct: true },
      { label: "入力に近い層のほうが必ずパラメータ数が少ないから", correct: false },
      { label: "出力に近い層は凍結すると壊れてしまう仕様だから", correct: false },
      { label: "入力に近い層を再学習すると必ず精度が下がる決まりだから", correct: false },
    ],
    explain:
      "CNNの浅い層はエッジ・テクスチャのような汎用的な特徴を学びやすく、多くの画像タスクで再利用できる。深い層（出力に近い層）ほどそのタスク固有の特徴になるため、新タスクのデータで再学習する価値が大きい——凍結する層を増やすほど学習コストは下がるが、新タスクへの適応力は下がるトレードオフがある。",
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

/** NNモデル（CNN・RNN）演習（確認問題 → 即時フィードバック → 操作へ戻る）。 */
export function NeuralNetworkModelsQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#nnm-sequence-stepper"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 時間展開ステッパーに戻って、LSTMのゲートがどう開閉するか確かめる
      </a>
    </div>
  );
}
