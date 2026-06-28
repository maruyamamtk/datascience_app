"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "因子分析の基本的な考え方は？",
    choices: [
      { label: "観測変数の相関を、少数の潜在因子（共通因子）で説明する", correct: true },
      { label: "分散が最大の方向を探す", correct: false },
      { label: "群を分ける境界を引く", correct: false },
      { label: "データを k 個に分割する", correct: false },
    ],
    explain:
      "因子分析は «観測変数の背後に潜在因子がある» と仮定するモデル。観測変数 = 因子負荷×共通因子 + 独自因子。相関は共通因子経由で生じ、r_ij=λ_iλ_j と再現される。",
  },
  {
    prompt: "共通性 h²=λ² が表すのは？",
    choices: [
      { label: "その変数の分散のうち共通因子で説明できる割合", correct: true },
      { label: "誤差の分散", correct: false },
      { label: "因子の数", correct: false },
      { label: "相関係数そのもの", correct: false },
    ],
    explain:
      "標準化すると分散1 = 共通性 h²（共通因子が説明）＋ 独自性 1−h²（その変数固有＋誤差）。共通性が高い変数ほど共通因子と強く結びつく。",
  },
  {
    prompt: "主成分分析（PCA）と因子分析（FA）の違いは？",
    choices: [
      { label: "PCAは分散を要約する軸、FAは観測の背後の潜在因子を仮定するモデル", correct: true },
      { label: "全く同じ手法", correct: false },
      { label: "FAは教師あり", correct: false },
      { label: "PCAは相関を再現するモデル", correct: false },
    ],
    explain:
      "PCA は «観測変数の線形結合» で分散最大の軸を作る記述的手法。FA は «潜在因子が観測変数を生む» 生成モデルで、独自因子（誤差）を分離する。目的（要約 vs 構造の仮説検証）が違う。",
  },
  {
    prompt: "因子分析で «因子の回転»（バリマックスなど）を行うのはなぜ？",
    choices: [
      {
        label: "因子負荷の解を解釈しやすく（各変数が少数の因子に強く乗るように）するため",
        correct: true,
      },
      { label: "残差を0にするため", correct: false },
      { label: "因子数を増やすため", correct: false },
      { label: "分散を最大化するため", correct: false },
    ],
    explain:
      "因子の解には回転の自由度がある（同じ当てはまりで無数の負荷パターン）。バリマックス等の回転で «単純構造»（各変数が少数の因子に強く、他に弱く乗る）にすると解釈しやすい。当てはまりは変わらない。",
  },
  {
    prompt: "共分散構造分析（SEM）が因子分析を超えて扱えるのは？",
    choices: [
      {
        label: "潜在変数どうしの因果的な関係を含むモデルを相関構造として検証できる",
        correct: true,
      },
      { label: "クラスタリング", correct: false },
      { label: "次元の可視化のみ", correct: false },
      { label: "回帰係数の計算のみ", correct: false },
    ],
    explain:
      "共分散構造分析（構造方程式モデリング, SEM）は、測定モデル（因子分析）に加え潜在変数間のパス（因果関係）を組み、観測共分散行列をモデルが再現できるか適合度で検証する。因子分析はその測定部分にあたる。",
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

/** 因子分析 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function FactorQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#factor-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って負荷倍率を変え、含意相関と残差を確かめる
      </a>
    </div>
  );
}
