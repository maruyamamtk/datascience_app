"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "層化無作為抽出が単純無作為抽出より «精度が上がる» のはなぜ？",
    choices: [
      { label: "層内だけのばらつきになり、«層間の差» を推定誤差から除けるから", correct: true },
      { label: "標本数が増えるから", correct: false },
      { label: "母集団が小さくなるから", correct: false },
      { label: "偏りがなくなるから", correct: false },
    ],
    explain:
      "母分散 = 層内 + 層間。層化は各層から取るので «層間の差» が誤差に入らず、層内のばらつきだけになる。層が均質（層内小・層間大）なほど効果が大きい。",
  },
  {
    prompt: "ネイマン配分 n_h ∝ N_h σ_h が意味するのは？",
    choices: [
      { label: "サイズが大きくばらつきも大きい層に多く標本を配る", correct: true },
      { label: "全層に同数を配る", correct: false },
      { label: "サイズの小さい層に多く配る", correct: false },
      { label: "ランダムに配る", correct: false },
    ],
    explain:
      "ネイマン配分は «層サイズ × 層内SD» に比例して配分し、与えられた n で標本平均の分散を最小にする最適配分。ばらつきの大きい層を厚くサンプリングする。比例配分（N_h のみ）の改良。",
  },
  {
    prompt: "有限母集団修正（1 − n/N）が表すのは？",
    choices: [
      { label: "標本が母集団の大きな割合を占めるほど推定の分散が小さくなる", correct: true },
      { label: "標本が大きいほど偏る", correct: false },
      { label: "母集団が無限なら分散0", correct: false },
      { label: "常に分散を2倍する", correct: false },
    ],
    explain:
      "非復元抽出では、n が N に近づくほど «母集団を見尽くす» ので分散が縮む。n=N（全数調査）で分散0。母集団が標本に比べ十分大きいと 1−n/N≈1 で無視できる。",
  },
  {
    prompt: "多段抽出・クラスター抽出を使う主な理由は？",
    choices: [
      { label: "全員のリストがなくても、地域などの集団単位で効率よく調査できる", correct: true },
      { label: "必ず分散が最小になるから", correct: false },
      { label: "層間変動を完全に除くため", correct: false },
      { label: "標本を増やすため", correct: false },
    ],
    explain:
      "クラスター（学校・地域など）を抽出してその中を調べる。全個体のリストが不要で実査コストが低い。ただし同じクラスター内は似がちで、層化と逆に分散はやや増えうる（設計効果）。コストと精度のトレードオフ。",
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

/** 標本調査法 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function SurveyQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#survey-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って抽出法と n を変え、標準誤差を比べる
      </a>
    </div>
  );
}
