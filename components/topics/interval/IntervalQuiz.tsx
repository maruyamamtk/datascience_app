"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "「95% 信頼区間」の頻度論的な正しい意味は？",
    choices: [
      {
        label: "同じ手順で標本抽出と区間作成を繰り返すと、約95%の区間が母平均を含む",
        correct: true,
      },
      { label: "母平均がこの区間に入る確率が95%である", correct: false },
      { label: "標本の95%がこの区間に入る", correct: false },
      { label: "母平均が区間の中央にある確率が95%", correct: false },
    ],
    explain:
      "母平均 μ は定数で「確率」を持たない。ランダムなのは区間の方。だから «この1本が μ を含む確率» ではなく «繰り返したとき約95%の区間が μ を含む» が正しい。被覆シミュレーターで赤い区間（外れ）が約5%出ることを確かめよう。",
  },
  {
    prompt: "標本サイズ n を 4 倍にすると、信頼区間の幅はどうなる？",
    choices: [
      { label: "約 1/2 になる", correct: true },
      { label: "約 1/4 になる", correct: false },
      { label: "変わらない", correct: false },
      { label: "約 2 倍になる", correct: false },
    ],
    explain:
      "幅は 2·z·σ/√n。n が 4 倍なら √n は 2 倍、よって SE=σ/√n は 1/2 になり幅も 1/2。精度は √n でしか上がらない。操作で n を 25→100 にして確かめよう。",
  },
  {
    prompt: "σ を一定にしたまま信頼係数を 95% から 99% に上げると？",
    choices: [
      { label: "z が大きくなり、区間は広がる", correct: true },
      { label: "z が小さくなり、区間は狭まる", correct: false },
      { label: "z も区間も変わらない", correct: false },
    ],
    explain:
      "より高い信頼を得るには臨界値 z（z₀.₉₇₅≈1.96 → z₀.₉₉₅≈2.58）を大きく取る必要があり、区間は広がる。「確実さ」と「狭さ（精度）」はトレードオフの関係。",
  },
];

/** 1 問ぶんの確認問題（選択 → 即時フィードバック）。NormalQuiz / CltQuiz と同じ様式。 */
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

/**
 * 区間推定 演習（確認問題 → 即時フィードバック → 操作へ戻るリンク, SPEC §4.1③）。
 */
export function IntervalQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#interval-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って n・信頼係数を動かして確かめる
      </a>
    </div>
  );
}
