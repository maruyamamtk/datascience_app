"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "大数の法則（弱法則）が主張するのは？",
    choices: [
      { label: "標本平均が母平均に確率収束する（n→∞で μ に張り付く）", correct: true },
      { label: "標本平均がちょうど母平均に一致する", correct: false },
      { label: "標本和が一定になる", correct: false },
      { label: "分散が大きくなる", correct: false },
    ],
    explain:
      "弱法則: 任意の ε>0 で P(|X̄ₙ−μ|>ε)→0。«ぴったり一致» ではなく «μ から ε 以上離れる確率が 0 に近づく»（確率収束）。ばらつき σ/√n が縮むのが鍵。",
  },
  {
    prompt: "大数の法則と中心極限定理の違いは？",
    choices: [
      { label: "LLNは平均の«収束先»、CLTは平均の«ばらつきの形（正規）»を述べる", correct: true },
      { label: "同じことを言っている", correct: false },
      { label: "LLNは正規分布限定", correct: false },
      { label: "CLTは平均が μ に一致すると述べる", correct: false },
    ],
    explain:
      "LLN: X̄ₙ→μ（どこへ行くか）。CLT: √n(X̄ₙ−μ)→N(0,σ²)（μ の周りのばらつきが正規の形になる）。LLN が «収束» を、CLT が «収束の仕方» を述べる。",
  },
  {
    prompt: "二項分布を正規分布で近似するとき «連続修正» をするのはなぜ？",
    choices: [
      { label: "離散の棒を連続の面積で近似する境界のずれを補うため（±0.5）", correct: true },
      { label: "平均をずらすため", correct: false },
      { label: "分散を2倍にするため", correct: false },
      { label: "確率を負にしないため", correct: false },
    ],
    explain:
      "P(X≤k) を Φ((k+0.5−μ)/σ) と «+0.5» するのが連続修正。離散の各棒を幅1の長方形とみなし、その右端まで含めるための補正。特に n が小さいとき効果が大きい。",
  },
  {
    prompt: "「稀な事象（p が非常に小さい）を多数回」観測したときの近似で適切なのは？",
    choices: [
      { label: "ポアソン近似（少数の法則）", correct: true },
      { label: "正規近似", correct: false },
      { label: "一様近似", correct: false },
      { label: "近似できない", correct: false },
    ],
    explain:
      "np が中程度でも p が極端に小さいときは «少数の法則» でポアソン Po(np) に近づく。p が中くらい・n 大なら正規近似（de Moivre–Laplace）。どちらの近似が良いかは np と p で決まる。",
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

/** 大数の法則と正規近似 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function LlnQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#lln-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って n を増やし、収束を確かめる
      </a>
    </div>
  );
}
