"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "最小二乗法（OLS）が選ぶ直線はどれ？",
    choices: [
      { label: "各点との縦の距離（残差）の二乗和 RSS を最小にする直線", correct: true },
      { label: "各点との縦の距離の和（符号つき）を最小にする直線", correct: false },
      { label: "できるだけ多くの点を通る直線", correct: false },
      { label: "傾きが最大になる直線", correct: false },
    ],
    explain:
      "OLS は残差 e_i=y_i−(β̂1·x_i+β̂0) の二乗和 RSS=Σe_i² を最小化する。符号つきの残差和は最小二乗解で常に 0 になるので最小化の基準にはならない（二乗するから外れ値の影響が強く出る）。コマ送りで RSS が傾きの放物線になり、その底が OLS だと確かめよう。",
  },
  {
    prompt: "散布図の右端に外れ値（大きく上にずれた点）を1つ足すと、最小二乗の傾きは？",
    choices: [
      { label: "外れ値に引っ張られて変わる（大きくなりやすい）", correct: true },
      { label: "まったく変わらない", correct: false },
      { label: "必ず小さくなる", correct: false },
      { label: "傾きは変わらず切片だけ変わる", correct: false },
    ],
    explain:
      "残差を二乗するため、遠い外れ値ほど RSS への寄与が大きく、直線はその点に引っ張られる。OLS は外れ値に弱い（頑健でない）。ラボで点を上にドラッグして緑の線が動くのを見てみよう。",
  },
  {
    prompt: "決定係数 R²=0.81 の意味として正しいのは？",
    choices: [
      { label: "y の分散（ばらつき）の約81%が回帰直線で説明できる", correct: true },
      { label: "予測が81%の確率で当たる", correct: false },
      { label: "傾きが0.81である", correct: false },
      { label: "相関係数が0.81である", correct: false },
    ],
    explain:
      "R²=1−RSS/SST で、全変動 SST=Σ(y−ȳ)² のうち回帰で説明できた割合。単回帰では R² は相関係数の二乗に等しい（相関係数そのものではない）。1 に近いほど当てはまりが良い。",
  },
  {
    prompt: "「最小二乗解に合わせる」を押すと、手動直線の RSS と最小 RSS の関係は？",
    choices: [
      { label: "手動 RSS が最小 RSS に一致する（それ以上は下がらない）", correct: true },
      { label: "手動 RSS が最小 RSS より小さくなる", correct: false },
      { label: "両者は無関係", correct: false },
      { label: "R² が 1 になる", correct: false },
    ],
    explain:
      "定義上、どんな直線の RSS も最小二乗解の RSS 以上。手動直線を OLS 解に合わせれば一致し、それが下限。R² が 1 になるのは全点が直線上に乗るとき（RSS=0）だけで、合わせるだけでは 1 にならない。",
  },
];

/** 1 問ぶんの確認問題（選択 → 即時フィードバック）。他トピックの Quiz と同じ様式。 */
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
 * 単回帰 演習（確認問題 → 即時フィードバック → 操作へ戻るリンク, SPEC §4.1③）。
 */
export function RegressionQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#regression-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って点や傾きを動かして確かめる
      </a>
    </div>
  );
}
