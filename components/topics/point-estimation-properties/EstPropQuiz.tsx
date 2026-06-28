"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "推定量が «不偏» であるとは？",
    choices: [
      { label: "期待値が真の母数に等しい（E[θ̂]=θ）", correct: true },
      { label: "分散が 0 である", correct: false },
      { label: "常に真の値を当てる", correct: false },
      { label: "標本サイズに依らず一定", correct: false },
    ],
    explain:
      "不偏性は «平均すれば真値» E[θ̂]=θ。1回1回は外れても、繰り返しの平均が真値に一致する。標本分散を 1/(n−1) で割るのは E[s²]=σ² にするため。",
  },
  {
    prompt: "標本分散を 1/n で割る S²ₙ のバイアスは？",
    choices: [
      { label: "−σ²/n（真値より下に偏る）", correct: true },
      { label: "+σ²/n（上に偏る）", correct: false },
      { label: "0（不偏）", correct: false },
      { label: "σ²（真値と同じ）", correct: false },
    ],
    explain:
      "E[S²ₙ]=(n−1)/n·σ² なので バイアス=−σ²/n。平均をデータから推定したぶん «散らばりを過小評価» する。n を大きくするとバイアスは 0 へ。だから 1/(n−1) で割って補正する。",
  },
  {
    prompt: "平均二乗誤差（MSE）のバイアス分散分解は？",
    choices: [
      { label: "MSE = バイアス² + 分散", correct: true },
      { label: "MSE = バイアス + 分散", correct: false },
      { label: "MSE = バイアス² − 分散", correct: false },
      { label: "MSE = バイアス × 分散", correct: false },
    ],
    explain:
      "MSE=E[(θ̂−θ)²]=バイアス²+分散。«的の中心からのズレ²» と «ばらつき» の和。不偏（バイアス0）でも分散が大きいと MSE は大きい。両者のトレードオフ。",
  },
  {
    prompt: "«一致性» のある推定量とは？",
    choices: [
      { label: "n→∞ で真の母数に確率収束する", correct: true },
      { label: "常に不偏である", correct: false },
      { label: "分散が一定である", correct: false },
      { label: "MSE が増える", correct: false },
    ],
    explain:
      "一致性は «データを増やせば真値に収束» すること（確率収束）。バイアスも分散も 0 へ向かう。偏り分散 S²ₙ はバイアスがあるが n→∞ で 0 になるので一致推定量。",
  },
  {
    prompt: "クラメール・ラオの不等式が与えるのは？",
    choices: [
      { label: "不偏推定量の分散の «下限»（フィッシャー情報量の逆数）", correct: true },
      { label: "バイアスの上限", correct: false },
      { label: "標本サイズの下限", correct: false },
      { label: "MSE の上限", correct: false },
    ],
    explain:
      "不偏推定量の分散は 1/(フィッシャー情報量) より小さくできない（クラメール・ラオ下限）。これを達成する推定量が «有効»。最尤推定量は大標本でこの下限を漸近的に達成する。",
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

/** 点推定の性質 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function EstPropQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#estprop-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って n を動かし、バイアスと MSE を確かめる
      </a>
    </div>
  );
}
