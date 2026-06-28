"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "重回帰の係数 β̂ を求める正規方程式は？",
    choices: [
      { label: "β̂ = (XᵀX)⁻¹Xᵀy", correct: true },
      { label: "β̂ = XᵀX·y", correct: false },
      { label: "β̂ = Xy⁻¹", correct: false },
      { label: "β̂ = (XXᵀ)⁻¹y", correct: false },
    ],
    explain:
      "残差平方和 ‖y−Xβ‖² を最小化すると正規方程式 XᵀXβ=Xᵀy が出る。解が β̂=(XᵀX)⁻¹Xᵀy。XᵀX が特異（完全な多重共線性）だと逆行列が存在せず解けない。",
  },
  {
    prompt: "多重共線性（説明変数どうしが強く相関）が引き起こすのは？",
    choices: [
      { label: "係数の標準誤差が膨らみ、推定が不安定になる", correct: true },
      { label: "R² が必ず下がる", correct: false },
      { label: "残差が0になる", correct: false },
      { label: "切片が消える", correct: false },
    ],
    explain:
      "2変数が似た情報を持つと «どちらの寄与か» を切り分けられず、係数推定の分散（SE）が VIF=1/(1−R²ⱼ) 倍に膨らむ。予測（R²）は良くても個々の係数の解釈は危うい。VIF>10 が目安。",
  },
  {
    prompt: "説明変数を増やすと R²（決定係数）は？",
    choices: [
      { label: "必ず上がる（下がらない）ので、効くかは調整済みR²で見る", correct: true },
      { label: "必ず下がる", correct: false },
      { label: "変わらない", correct: false },
      { label: "負になる", correct: false },
    ],
    explain:
      "無意味な変数でも R² は必ず増える（過剰適合）。罰則を入れた «自由度調整済み R²» は、効かない変数を足すと下がる。だからモデル比較は調整済みR²や情報量規準（AIC等）で行う。",
  },
  {
    prompt: "L1正則化（Lasso）が重回帰にもたらす効果は？",
    choices: [
      { label: "一部の係数をちょうど0にして変数選択を行う", correct: true },
      { label: "すべての係数を均等に大きくする", correct: false },
      { label: "R² を1にする", correct: false },
      { label: "多重共線性を増やす", correct: false },
    ],
    explain:
      "L1罰則 λΣ|βⱼ| は係数を0方向へ縮め、一部をちょうど0にする（スパース化＝自動変数選択）。L2（Ridge）は0にはせず全体を縮小し多重共線性に強い。両者で «縮小» の仕方が違う。",
  },
  {
    prompt: "Stepwise法（変数選択）の注意点は？",
    choices: [
      { label: "同じデータで選択と推測をすると p値・信頼区間が歪む（選択後推測）", correct: true },
      { label: "常に最良のモデルを保証する", correct: false },
      { label: "R²を下げる", correct: false },
      { label: "多重共線性を完全に解消する", correct: false },
    ],
    explain:
      "前進・後退などの逐次選択は «データを見て変数を選んだ» ぶん、同じデータで出した p値・信頼区間が楽観的に歪む（選択後推測の問題）。正則化や交差検証、別データでの検証が望ましい。",
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

/** 重回帰分析 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function MultiRegQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#multireg-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って相関 ρ を動かし、係数のぶれと VIF を確かめる
      </a>
    </div>
  );
}
