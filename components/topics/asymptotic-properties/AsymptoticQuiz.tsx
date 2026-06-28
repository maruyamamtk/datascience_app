"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "最尤推定量の «漸近正規性» が述べるのは？",
    choices: [
      { label: "n→∞ で λ̂ は正規分布 N(λ, 1/(nI(λ))) に近づく", correct: true },
      { label: "λ̂ は常に正規分布である", correct: false },
      { label: "λ̂ は一様分布になる", correct: false },
      { label: "λ̂ は真値に一致しない", correct: false },
    ],
    explain:
      "大標本で √n(λ̂−λ) → N(0, 1/I(λ))（分布収束）。中心は真値、分散はフィッシャー情報量の逆数。小標本では歪んでいても n とともに正規化する。",
  },
  {
    prompt: "フィッシャー情報量 I(λ) が大きいほど？",
    choices: [
      { label: "推定の分散の下限が小さい（高精度に推定できる）", correct: true },
      { label: "バイアスが大きい", correct: false },
      { label: "標本サイズが小さくて済まない", correct: false },
      { label: "分布が一様になる", correct: false },
    ],
    explain:
      "I(λ) は «データが母数について持つ情報量»。大きいほどクラメール・ラオ下限 1/(nI(λ)) が小さく、高精度に推定できる。最尤推定量はこの下限を漸近的に達成する（漸近有効）。",
  },
  {
    prompt: "デルタ法は何を求める手法か？",
    choices: [
      { label: "推定量の «関数» g(θ̂) の漸近分散", correct: true },
      { label: "標本サイズ", correct: false },
      { label: "事前分布", correct: false },
      { label: "中央値", correct: false },
    ],
    explain:
      "θ̂≈N(θ, σ²/n) のとき g(θ̂)≈N(g(θ), g'(θ)²σ²/n)。テイラー1次近似で «変換した推定量» の標準誤差を出す。オッズ比・対数変換などで使う。",
  },
  {
    prompt: "カルバック・ライブラー情報量 KL(p‖q) の性質は？",
    choices: [
      { label: "0以上で、p=q のとき0、一般に非対称", correct: true },
      { label: "負になることがある", correct: false },
      { label: "常に対称 KL(p‖q)=KL(q‖p)", correct: false },
      { label: "確率である（0〜1）", correct: false },
    ],
    explain:
      "KL は «真の分布 p を q で近似したときの情報損失»。KL≥0、p=q で0、一般に非対称（距離ではない）。最尤推定は経験分布と母数モデルの KL を最小化することと等価。",
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

/** 推定量の漸近的性質 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function AsymptoticQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#asymptotic-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って n を動かし、漸近正規への収束を確かめる
      </a>
    </div>
  );
}
