"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "フィッシャー線形判別（LDA）が探す «判別軸» とは？",
    choices: [
      { label: "群間の隔たりを群内のばらつきで割った «分離度» が最大の方向", correct: true },
      { label: "全データの分散が最大の方向", correct: false },
      { label: "平均がある方向", correct: false },
      { label: "ランダムな方向", correct: false },
    ],
    explain:
      "LDA は «群間の隔たり² / 群内の分散» を最大化する方向 w∝Σ_w⁻¹(μ1−μ2) を探す。射影した1次元上で2群が最も重ならず分かれる軸。",
  },
  {
    prompt: "主成分分析（PCA）と判別分析（LDA）の違いは？",
    choices: [
      {
        label: "PCAは分散最大、LDAはクラス分離最大の方向を探す（教師なし vs 教師あり）",
        correct: true,
      },
      { label: "同じ方向を探す", correct: false },
      { label: "LDAは分散最大", correct: false },
      { label: "PCAはラベルを使う", correct: false },
    ],
    explain:
      "PCA はラベルを使わず «全分散が最大» の方向（教師なし）。LDA は «クラスを最もよく分ける» 方向（教師あり）。分散が大きい方向とクラスを分ける方向は一致しないことが多い。",
  },
  {
    prompt: "各クラスの共分散が大きく異なるとき、線形判別の代わりに使うのは？",
    choices: [
      { label: "2次判別分析（QDA）。境界が曲線になる", correct: true },
      { label: "主成分分析", correct: false },
      { label: "線形回帰", correct: false },
      { label: "相関分析", correct: false },
    ],
    explain:
      "LDA は «全クラス共通の共分散» を仮定し境界は直線。共分散がクラスで違うと、各クラスを別々の正規分布で表す2次判別分析（QDA）が適切で、境界は2次曲線になる。",
  },
  {
    prompt: "判別結果の «混同行列» から読めるのは？",
    choices: [
      { label: "正しく分類された数と誤分類の内訳（誤判別率の根拠）", correct: true },
      { label: "主成分の寄与率", correct: false },
      { label: "相関係数", correct: false },
      { label: "分散の分解", correct: false },
    ],
    explain:
      "混同行列は «実際のクラス × 予測のクラス» の度数表。対角が正解、非対角が誤分類。誤判別率＝非対角の和/全体。クラスごとの取りこぼし（感度・特異度）も読める。",
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

/** 判別分析 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function LdaQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#lda-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って隔たりを動かし、判別境界と誤判別率を確かめる
      </a>
    </div>
  );
}
