"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "差の差分法（DID）が依拠する «要の仮定» は？",
    choices: [
      { label: "平行トレンド：処置がなければ両群は平行に推移したはず", correct: true },
      { label: "処置群と対照群の介入前の水準が完全に等しい", correct: false },
      { label: "時間変化がまったく存在しない", correct: false },
      { label: "標本が正規分布に従う", correct: false },
    ],
    explain:
      "DID は «介入前後の差» を群間でさらに引く。対照群の変化を «処置がなくても起きた共通の時間変化» の代理に使うので、«処置がなければ処置群も対照群と平行に動いた»（平行トレンド）が成り立てば効果が識別できる。前の水準が違っていても平行なら OK。",
  },
  {
    prompt: "操作変数（IV）が満たすべき条件の組み合わせは？",
    choices: [
      { label: "処置に効く（関連性）＋ 結果に直接は効かない（除外制約）", correct: true },
      { label: "結果に直接強く効く", correct: false },
      { label: "処置とも結果とも無関係である", correct: false },
      { label: "必ず二値である", correct: false },
    ],
    explain:
      "操作変数 Z は «処置 T を動かす»（関連性・第1段階が非ゼロ）が、«T を通してしか Y に影響しない»（除外制約）ものでなければならない。すると «Z が Y を動かす分» は Z→T→Y 経由だけなので、T の動き分で割れば処置効果が復元できる（Wald 推定）。未観測交絡を迂回できる。",
  },
  {
    prompt: "回帰不連続デザイン（RDD）が推定するのは主に何の効果？",
    choices: [
      { label: "閾値ぎりぎりの個体での局所的な処置効果", correct: true },
      { label: "母集団全体の平均処置効果 ATE", correct: false },
      { label: "処置群だけの効果 ATT（全域）", correct: false },
      { label: "時間トレンドの大きさ", correct: false },
    ],
    explain:
      "RDD は割り当て変数の閾値での結果のジャンプを効果とみなす。閾値のすぐ両側は «そっくりさん»（局所的な無作為化）なので、識別できるのは «閾値付近の人» の効果（局所処置効果）。閾値から離れた個体へ一般化できる保証はない。",
  },
  {
    prompt: "«未観測の交絡» があるとき、正しく因果効果を識別しうるのはどれ？",
    choices: [
      { label: "妥当な操作変数がある IV や、閾値で連続性が成り立つ RDD", correct: true },
      { label: "観測変数だけで回帰調整すれば必ず解決する", correct: false },
      { label: "標本サイズを増やせば必ず解決する", correct: false },
      { label: "素朴な群間比較で十分", correct: false },
    ],
    explain:
      "観測交絡は回帰・層別・傾向スコアで調整できるが、未観測交絡は調整できない。IV は妥当な操作変数を使って未観測交絡を迂回し、RDD は閾値の局所無作為化を利用する。DID は未観測でも «時間で一定» の交絡なら差し引ける。設計（デザイン）で交絡を回避するのがこれらの戦略の本質。",
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

/** 識別戦略 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function IdentificationQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#did-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って平行トレンドの破れを入れ、DID がどうバイアスを持つか確かめる
      </a>
    </div>
  );
}
