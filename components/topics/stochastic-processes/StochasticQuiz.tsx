"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "確率過程とは？",
    choices: [
      { label: "時間とともにランダムに変化する量（各時刻が確率変数の族）", correct: true },
      { label: "1つの確率変数", correct: false },
      { label: "確定的な関数", correct: false },
      { label: "回帰直線", correct: false },
    ],
    explain:
      "確率過程は «時刻ごとに値が確率的に決まる» 量。{X_t} という確率変数の族で表す。ランダムウォーク・ブラウン運動・ポアソン過程などが代表例。",
  },
  {
    prompt: "ブラウン運動 B_t の分散はどう時間変化する？",
    choices: [
      { label: "時間に比例する（Var[B_t]=σ²t）→ 標準偏差は √t で広がる", correct: true },
      { label: "時間に依らず一定", correct: false },
      { label: "t² に比例する", correct: false },
      { label: "指数的に増える", correct: false },
    ],
    explain:
      "独立な増分（分散 σ²dt）を足し続けるので分散は加算されて Var[B_t]=σ²t。標準偏差（広がり）は √t に比例する «拡散»。だから ±2σ√t の帯が放物線状に開く。",
  },
  {
    prompt: "ランダムウォークとブラウン運動の関係は？",
    choices: [
      {
        label: "歩幅を小さく歩数を増やす極限でランダムウォークがブラウン運動に収束（不変原理）",
        correct: true,
      },
      { label: "無関係", correct: false },
      { label: "ブラウン運動は離散、ランダムウォークは連続", correct: false },
      { label: "同じもの", correct: false },
    ],
    explain:
      "中心極限定理の «過程版»（ドンスカーの不変原理）。ランダムウォークを時間・空間で細かくスケールすると、その極限がブラウン運動（ウィーナー過程）になる。離散→連続の橋渡し。",
  },
  {
    prompt: "ポアソン過程 N(t) の «時刻 t までの到着数» が従う分布は？",
    choices: [
      { label: "ポアソン分布 Po(λt)、到着間隔は指数分布", correct: true },
      { label: "正規分布", correct: false },
      { label: "一様分布", correct: false },
      { label: "二項分布 Bin(t,½)", correct: false },
    ],
    explain:
      "強度 λ のポアソン過程では、時刻 t までの到着数は Po(λt)（平均 λt）。連続する到着の «間隔» は指数分布 Exp(λ)。«まれな事象の到着» のモデルで、階段状に +1 ずつ増える計数過程。",
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

/** 確率過程 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function StochasticQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#stochastic-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って σ・μ を変え、拡散帯と終端分散を確かめる
      </a>
    </div>
  );
}
