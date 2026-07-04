"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "多次元尺度構成法（MDS）が入力に使うのは？",
    choices: [
      { label: "点どうしの距離（非類似度）の行列", correct: true },
      { label: "各点の座標", correct: false },
      { label: "回帰係数", correct: false },
      { label: "正解ラベル", correct: false },
    ],
    explain:
      "MDS は «近さ／遠さ»（距離・非類似度）だけを入力に、それを最もよく再現する低次元の配置（地図）を求める。座標が未知でも、アンケートの «似ている度» 等から布置を描ける。",
  },
  {
    prompt: "MDS の «ストレス» が表すのは？",
    choices: [
      { label: "元の距離と復元座標間の距離のずれ（当てはまりの悪さ）", correct: true },
      { label: "計算時間", correct: false },
      { label: "点の数", correct: false },
      { label: "相関係数", correct: false },
    ],
    explain:
      "ストレス=√(Σ(d−d̂)²/Σd²)。0なら距離を完全再現、大きいほど歪み。次元を増やすと下がる。固有値やストレスの落ち方で «何次元で表すか» を決める。",
  },
  {
    prompt: "数量化理論（林の数量化Ⅰ〜Ⅳ類）が扱うのは？",
    choices: [
      { label: "質的（カテゴリ）データを数量に変換して多変量解析する", correct: true },
      { label: "連続データの回帰のみ", correct: false },
      { label: "時系列予測", correct: false },
      { label: "確率分布の推定", correct: false },
    ],
    explain:
      "数量化理論は質的データ用の多変量手法。Ⅰ類=質的説明変数の回帰、Ⅱ類=質的の判別、Ⅲ類=対応分析（カテゴリの布置）、Ⅳ類=非類似度からの布置（MDS類似）。カテゴリを数量に置き換えて分析する。",
  },
  {
    prompt: "正準相関分析（canonical correlation）が求めるのは？",
    choices: [
      { label: "2組の変数群の間で、相関が最大になる線形結合の組", correct: true },
      { label: "1組の変数の分散最大の軸", correct: false },
      { label: "クラスターの数", correct: false },
      { label: "回帰の残差", correct: false },
    ],
    explain:
      "正準相関分析は «変数群X» と «変数群Y» それぞれの線形結合を作り、その2つの相関（正準相関）が最大になる組を求める。主成分分析（1群の分散最大）や重回帰（1変数を説明）の «2群の関係» への拡張。",
  },
  {
    prompt: "対応分析（correspondence analysis）が可視化するのは？",
    choices: [
      { label: "分割表の行カテゴリと列カテゴリの関連を同じ平面上の布置で", correct: true },
      { label: "連続変数の回帰直線", correct: false },
      { label: "時系列のトレンド", correct: false },
      { label: "正規分布の裾", correct: false },
    ],
    explain:
      "対応分析はクロス集計表（分割表）の行と列のカテゴリを同じ低次元平面に布置し、«どのカテゴリとどのカテゴリが結びつくか» を距離で可視化する。カイ二乗的な関連を主成分的に分解する数量化Ⅲ類と同じ発想。",
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

/** その他の多変量解析 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function MvQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#mds-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って歪みを変え、復元地図とストレスを確かめる
      </a>
    </div>
  );
}
