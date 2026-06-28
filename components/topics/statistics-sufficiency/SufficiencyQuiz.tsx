"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "コインを n 回投げたデータで、成功確率 p の «十分統計量» は？",
    choices: [
      { label: "成功数 T = Σxᵢ", correct: true },
      { label: "投げた順番の列そのもの", correct: false },
      { label: "最初の成功までの回数", correct: false },
      { label: "標本分散", correct: false },
    ],
    explain:
      "尤度 L(p)=pᵀ(1−p)ⁿ⁻ᵀ は T と n だけで決まる。T を知れば «どの順で出たか» は p の推定に何も足さない。だから T が十分統計量。",
  },
  {
    prompt: "ネイマンの分解定理（因子分解定理）が述べるのは？",
    choices: [
      { label: "尤度が h(x)·g(T(x),θ) と分解できる ⇔ T が十分統計量", correct: true },
      { label: "尤度は常に正規分布になる", correct: false },
      { label: "標本平均は常に十分", correct: false },
      { label: "十分統計量は一意である", correct: false },
    ],
    explain:
      "尤度を «データだけの因子 h(x)» と «T と θ を通した因子 g(T,θ)» に分けられるとき、T が十分。パラメータ θ はデータに T を «通してしか» 効かない、という形が要点。",
  },
  {
    prompt: "順序統計量（order statistics）とは？",
    choices: [
      { label: "標本を昇順に並べた x₍₁₎≤…≤x₍ₙ₎", correct: true },
      { label: "標本平均と標本分散", correct: false },
      { label: "データを取った順番", correct: false },
      { label: "母数の推定値", correct: false },
    ],
    explain:
      "順序統計量は «並べた位置» で決まる。最小 x₍₁₎・最大 x₍ₙ₎・中央値・四分位はすべて順序統計量で、外れ値に強い «位置» の要約。",
  },
  {
    prompt: "正規母集団から取った標本で成り立つ重要な独立性は？",
    choices: [
      { label: "標本平均 x̄ と標本分散 s² が独立", correct: true },
      { label: "x̄ と母平均 μ が独立", correct: false },
      { label: "各 xᵢ が従属", correct: false },
      { label: "s² と母分散 σ² が独立", correct: false },
    ],
    explain:
      "正規母集団では x̄ と s² が独立（コクランの定理）。これが t 統計量 (x̄−μ)/(s/√n) を «独立な正規 ÷ √(カイ二乗/自由度)» と書ける前提で、t 分布の導出を支える。",
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

/** 統計量と十分性 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function SufficiencyQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#sufficiency-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻ってコインを並べ替え、T と尤度が変わらないことを確かめる
      </a>
    </div>
  );
}
