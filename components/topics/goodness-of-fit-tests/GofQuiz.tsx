"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "カイ二乗適合度検定の統計量 χ² の式は？",
    choices: [
      { label: "Σ(観測−期待)²/期待", correct: true },
      { label: "Σ(観測−期待)²", correct: false },
      { label: "Σ(観測−期待)/期待", correct: false },
      { label: "Σ観測²/期待", correct: false },
    ],
    explain:
      "χ²=Σ(Oᵢ−Eᵢ)²/Eᵢ。各カテゴリの «ずれ» を二乗し、期待度数 E で割って «相対的なずれ» にして足す。E で割るのが肝（同じ差でも期待が小さいセルほど効く）。",
  },
  {
    prompt: "6面サイコロの一様性を検定するときの自由度は？",
    choices: [
      { label: "5（カテゴリ数 6 − 1）", correct: true },
      { label: "6", correct: false },
      { label: "60", correct: false },
      { label: "1", correct: false },
    ],
    explain:
      "自由度 = カテゴリ数 − 1（合計が固定されるため1つ自由を失う）。分布のパラメータをデータから推定した場合は、その数だけさらに引く。",
  },
  {
    prompt: "χ² が大きいほど p 値はどうなる？",
    choices: [
      { label: "小さくなる（想定分布と整合しない方向）", correct: true },
      { label: "大きくなる", correct: false },
      { label: "変わらない", correct: false },
      { label: "負になる", correct: false },
    ],
    explain:
      "χ² が大きい＝観測が期待から大きくずれている。p=P(χ²≥観測) は右片側で、χ² が大きいほど p は小さい。p<0.05 なら «想定した分布と言えない»。",
  },
  {
    prompt: "カイ二乗近似が信頼できるための «期待度数» の目安は？",
    choices: [
      { label: "各セルの期待度数が概ね5以上", correct: true },
      { label: "観測度数が0", correct: false },
      { label: "カテゴリ数が2以下", correct: false },
      { label: "総数が10以下", correct: false },
    ],
    explain:
      "期待度数が小さいセルがあるとカイ二乗近似が崩れる（目安は各セル5以上）。小さいセルはまとめる（縮約）か、フィッシャーの正確検定など厳密法を使う。",
  },
  {
    prompt: "ポアソン分布への «適合度» を検定するとき、平均 λ をデータから推定したら自由度は？",
    choices: [
      { label: "カテゴリ数 − 1 − 1（推定した1パラメータぶん減る）", correct: true },
      { label: "カテゴリ数 − 1", correct: false },
      { label: "カテゴリ数", correct: false },
      { label: "1", correct: false },
    ],
    explain:
      "分布のパラメータをデータから推定すると、その数だけ自由度が減る。ポアソンで λ を1つ推定したら df=カテゴリ数−1−1。既知の分布（パラメータを推定しない）なら引かない。",
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

/** 一般の分布に関する検定 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function GofQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#gof-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って観測度数を偏らせ、χ² と p を確かめる
      </a>
    </div>
  );
}
