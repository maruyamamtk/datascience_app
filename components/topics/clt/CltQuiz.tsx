"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "n を 4 倍にすると、標準誤差 SE = σ/√n は何倍になる？",
    choices: [
      { label: "1/2 倍", correct: true },
      { label: "1/4 倍", correct: false },
      { label: "2 倍", correct: false },
      { label: "変わらない", correct: false },
    ],
    explain:
      "SE は √n に反比例。n が 4 倍なら √n は 2 倍 → SE は 1/2 倍。操作で n=25→100 を試すと SE が半分に。",
  },
  {
    prompt:
      "元の分布が左右非対称（例: 指数分布）でも、n を大きくすれば標本平均の分布はほぼ左右対称になる？",
    choices: [
      { label: "○（なる）", correct: true },
      { label: "×（ならない）", correct: false },
    ],
    explain:
      "これが CLT。分散が有限なら元分布の形によらず、標本平均の分布は n とともに正規分布（左右対称）に近づく。",
  },
];

/** 1 問ぶんの確認問題（選択 → 即時フィードバック）。 */
function QuestionCard({ q, index }: { q: Question; index: number }) {
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;
  const isCorrect = answered && q.choices[selected].correct;

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-800">
        Q{index + 1}. {q.prompt}
      </p>
      <div className="flex flex-wrap gap-2">
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
              className={`rounded-lg border px-3 py-2 text-sm transition ${cls}`}
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
 * CLT 演習（確認問題 → 即時フィードバック → 操作へ戻るリンク, 受け入れ条件 / SPEC §4.1③）。
 */
export function CltQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#clt-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って n を動かして確かめる
      </a>
    </div>
  );
}
