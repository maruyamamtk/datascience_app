"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "主成分分析（PCA）の第1主成分とは？",
    choices: [
      { label: "データの分散が最大になる方向", correct: true },
      { label: "平均がある方向", correct: false },
      { label: "残差が最大の方向", correct: false },
      { label: "x 軸そのもの", correct: false },
    ],
    explain:
      "第1主成分はデータが最も広がる（分散最大の）方向。共分散行列の最大固有値に対応する固有ベクトル。情報（分散）が最も多く乗る軸を新しい座標に取り直す。",
  },
  {
    prompt: "主成分（固有ベクトル）と固有値の関係は？",
    choices: [
      { label: "固有ベクトルが主成分の方向、固有値がその方向の分散", correct: true },
      { label: "固有値が方向、固有ベクトルが分散", correct: false },
      { label: "両方とも平均", correct: false },
      { label: "無関係", correct: false },
    ],
    explain:
      "PCA は共分散行列を固有値分解する。固有ベクトル＝主成分の向き、固有値＝その方向の分散。固有値が大きい順に第1・第2…主成分。寄与率＝λ_k/Σλ。",
  },
  {
    prompt: "寄与率（第1主成分）が高い（例: 95%）とき何が言える？",
    choices: [
      { label: "ほぼ1次元でデータを要約でき、次元圧縮の効果が大きい", correct: true },
      { label: "データが無相関", correct: false },
      { label: "外れ値が多い", correct: false },
      { label: "分散が0", correct: false },
    ],
    explain:
      "第1主成分だけで全分散の95%を説明＝2軸を1軸に落としても情報をほぼ保てる。これが次元圧縮。変数が強く相関しているほど第1主成分に分散が集中し寄与率が高い。",
  },
  {
    prompt: "PCA の前にデータを «標準化（各変数を分散1に）» することがあるのはなぜ？",
    choices: [
      { label: "単位（スケール）の大きい変数が主成分を支配するのを防ぐため", correct: true },
      { label: "計算を速くするため", correct: false },
      { label: "相関を消すため", correct: false },
      { label: "平均を1にするため", correct: false },
    ],
    explain:
      "PCA は分散を見るので、単位が大きい変数（例: 円 vs %）がそのまま主成分を支配する。標準化（または相関行列でPCA）すると各変数を公平に扱える。目的に応じて共分散行列／相関行列を選ぶ。",
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

/** 主成分分析 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function PcaQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#pca-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って相関を動かし、主成分軸と寄与率を確かめる
      </a>
    </div>
  );
}
