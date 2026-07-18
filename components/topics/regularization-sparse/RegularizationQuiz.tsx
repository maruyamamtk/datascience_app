"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "リッジ回帰（L2正則化）とLasso（L1正則化）の最大の違いは？",
    choices: [
      { label: "Lassoは一部の係数をちょうど0にできる（自動変数選択）が、リッジは0にはせず全体を縮める", correct: true },
      { label: "リッジのほうが常に予測精度が高い", correct: false },
      { label: "Lassoは切片も罰則で縮める", correct: false },
      { label: "リッジは線形回帰にしか使えないがLassoは使える", correct: false },
    ],
    explain:
      "L1罰則 λΣ|βⱼ| は制約領域が «角のあるひし形» になり、最小二乗の等高線がその角で接しやすいため一部の係数がちょうど0になる（スパース化＝自動的な変数選択）。L2罰則 λΣβⱼ² は制約領域が «滑らかな円» なので、係数は全体的に縮むが基本的にちょうど0にはならない。",
  },
  {
    prompt: "正則化の強さ λ を大きくしていくと、一般に何が起きる？",
    choices: [
      { label: "係数（の絶対値）は縮小し、モデルは単純になる（λ→∞で切片だけに近づく）", correct: true },
      { label: "係数は必ず大きくなる", correct: false },
      { label: "訓練誤差は必ず小さくなる", correct: false },
      { label: "多重共線性がさらに悪化する", correct: false },
    ],
    explain:
      "λ は罰則の重みなので、大きくするほど «係数を小さく保つこと» が優先され、モデルは単純化される。λ→0 で通常の最小二乗（罰則なし）に一致し、λ→∞ では全係数が0（切片＝訓練データの平均だけの予測）に近づく。訓練誤差はむしろ増える（バイアスが増えるトレードオフ）。",
  },
  {
    prompt: "正則化（Ridge/Lasso）が効果を発揮しやすいのはどんな状況？",
    choices: [
      { label: "説明変数どうしが強く相関する（多重共線性）、またはデータ数に対して変数が多い", correct: true },
      { label: "説明変数がすべて完全に無相関で、データ数が非常に多いとき", correct: false },
      { label: "目的変数が2値分類のときだけ", correct: false },
      { label: "モデルが単純（低次数）すぎるとき", correct: false },
    ],
    explain:
      "多重共線性（変数どうしの強い相関）や «データ数 < 変数の数» に近い状況では最小二乗の係数推定が不安定になる（少しのデータの違いで係数が暴れる＝高分散）。正則化はそこに罰則というバイアスを入れて分散を下げ、係数を安定させる——«バイアスを入れて分散を下げる» 縮小推定の代表例。",
  },
  {
    prompt: "L1正則化が «ちょうど0» にする係数を持つことの実務上のメリットは？",
    choices: [
      { label: "使う変数が自動的に絞られ、モデルが解釈しやすくスパース（疎）になる", correct: true },
      { label: "計算が必ず速くなる", correct: false },
      { label: "予測誤差が理論上ゼロになる", correct: false },
      { label: "外れ値の影響を完全に無くせる", correct: false },
    ],
    explain:
      "係数がちょうど0になった変数はモデルの予測に一切寄与しない——つまり «この変数はいらない» と自動的に判定されたのと同じ。数百の候補変数から効くものだけが残るので、モデルが解釈しやすく（スパースモデリング）、ステップワイズ法などの探索的な変数選択の代替になる。",
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

/** 正則化・スパースモデリング 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function RegularizationQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#regularization-lab"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って λ とRidge/Lassoを切り替え、係数の縮小・スパース化を確かめる
      </a>
    </div>
  );
}
