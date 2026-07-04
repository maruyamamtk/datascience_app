"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "数量化I類とは、要するにどんな分析？",
    choices: [
      { label: "質的な説明変数（ダミー変数）で量的な目的変数を予測する重回帰", correct: true },
      { label: "量的な説明変数で質的な目的変数を判別する分析", correct: false },
      { label: "質的変数どうしの相関を測るだけの手法", correct: false },
      { label: "時系列の周期を取り出す分析", correct: false },
    ],
    explain:
      "数量化I類は各カテゴリに «カテゴリ数量»（スコア）を与え、定数＋スコアの和で量的な目的変数を予測する。実質はカテゴリをダミー変数に符号化した重回帰。質的説明変数→質的目的変数の判別は数量化II類。",
  },
  {
    prompt: "カテゴリをダミー変数にするとき、各アイテムで1つのカテゴリを «基準» として落とす理由は？",
    choices: [
      { label: "全カテゴリのダミーを入れると定数列と完全に共線になり解が定まらないから", correct: true },
      { label: "計算を速くするため", correct: false },
      { label: "基準カテゴリを無視したいから", correct: false },
      { label: "R² を上げるため", correct: false },
    ],
    explain:
      "あるアイテムの全カテゴリのダミーを足すと必ず1（＝定数列）になり、完全な多重共線性で (XᵀX) が特異になる。1つを基準に落とせば回避でき、残りの係数は «基準からの差» を表す（中心化すれば各カテゴリの平均からの偏差として読める）。",
  },
  {
    prompt: "1つの質的変数が量的変数をどれだけ説明するかを測る «相関比 η²» の意味は？",
    choices: [
      { label: "群間平方和 / 全平方和（カテゴリ間で群平均がどれだけ散らばるか）", correct: true },
      { label: "2つの量的変数のピアソン相関の2乗", correct: false },
      { label: "カテゴリ数そのもの", correct: false },
      { label: "残差の標準偏差", correct: false },
    ],
    explain:
      "相関比 η² = 群間平方和/全平方和。カテゴリ（群）によって目的変数の平均がどれだけ分かれるかの割合（0〜1）。1に近いほどその質的変数で目的変数がよく説明される。数量化I類が1アイテムのときの R² に一致する。",
  },
  {
    prompt: "数量化III類（対応分析に近い）が数量化I類と根本的に違う点は？",
    choices: [
      { label: "目的変数がなく、カテゴリと標本に «相関が最大» になる数量を教師なしで与える", correct: true },
      { label: "量的な目的変数を必ず持つ", correct: false },
      { label: "回帰係数の検定が主目的", correct: false },
      { label: "必ず2値データにしか使えない", correct: false },
    ],
    explain:
      "数量化I類は «予測したい量的目的変数» がある教師ありの手法。数量化III類（コレスポンデンス分析に相当）は目的変数を持たず、カテゴリと標本の反応パターンから «一緒に現れやすいものが近くに来る» ような数量を教師なしで割り当て、低次元で布置して構造を可視化する。",
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

/** 質的データ解析 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function QualQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#qual-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って雑音・標本サイズを変え、カテゴリ数量の回復と R² を確かめる
      </a>
    </div>
  );
}
