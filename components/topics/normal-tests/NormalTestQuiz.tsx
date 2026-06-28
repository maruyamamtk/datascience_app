"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "母標準偏差が未知のとき、1標本の母平均の検定に使う統計量は？",
    choices: [
      { label: "t 統計量 (x̄−μ0)/(s/√n)、自由度 n−1", correct: true },
      { label: "z 統計量（標準正規）", correct: false },
      { label: "カイ二乗統計量", correct: false },
      { label: "F 統計量", correct: false },
    ],
    explain:
      "σ を標本標準偏差 s で置き換えるため、統計量は自由度 n−1 の t 分布に従う（z ではない）。n が大きいと t≈z だが、小標本では t の裾の重さを使うのが正しい。",
  },
  {
    prompt: "2標本 t 検定で «有意になりやすい» 条件は？",
    choices: [
      { label: "平均差が大きい・ばらつきが小さい・n が大きい", correct: true },
      { label: "平均差が小さいほど良い", correct: false },
      { label: "ばらつきが大きいほど良い", correct: false },
      { label: "n が小さいほど良い", correct: false },
    ],
    explain:
      "t = Δ/SE で、SE = sp√(1/n1+1/n2)。平均差 Δ が大きい・標準偏差 s が小さい・n が大きいほど t が大きくなり p が小さくなる（有意になりやすい）。効果量と精度の両方が効く。",
  },
  {
    prompt: "等分散を仮定できないとき（2群の分散が大きく違う）使うべきは？",
    choices: [
      { label: "ウェルチの t 検定（プールせず自由度を補正）", correct: true },
      { label: "プールした t 検定をそのまま使う", correct: false },
      { label: "検定を諦める", correct: false },
      { label: "z 検定", correct: false },
    ],
    explain:
      "分散が大きく異なるとプールした分散が不適切。ウェルチの t 検定は分散をプールせず、自由度を Welch–Satterthwaite 近似で補正する。等分散が怪しいときの既定の選択。",
  },
  {
    prompt: "母相関係数 ρ=0 の検定（無相関検定）の統計量は？",
    choices: [
      { label: "t = r√((n−2)/(1−r²))、自由度 n−2", correct: true },
      { label: "r そのものを正規分布と比べる", correct: false },
      { label: "カイ二乗 = nr²", correct: false },
      { label: "F = r/(1−r)", correct: false },
    ],
    explain:
      "標本相関 r から t = r√((n−2)/(1−r²)) を作り、自由度 n−2 の t 分布で検定する。|r| が同じでも n が大きいほど t が大きく、有意になりやすい（大標本では小さな相関でも有意）。",
  },
  {
    prompt: "母分散の検定（H0: σ²=σ0²）に使う分布は？",
    choices: [
      { label: "カイ二乗分布（χ²=(n−1)s²/σ0², 自由度 n−1）", correct: true },
      { label: "t 分布", correct: false },
      { label: "正規分布", correct: false },
      { label: "一様分布", correct: false },
    ],
    explain:
      "(n−1)s²/σ² が自由度 n−1 のカイ二乗に従うことから、母分散の検定はカイ二乗分布で行う。左右非対称なので片側・両側の臨界値は別々に取る。2群の分散比の検定は F 分布。",
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

/** 正規分布に関する検定 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function NormalTestQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#normaltest-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って平均差・s・n を動かし、t と p を確かめる
      </a>
    </div>
  );
}
