"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "連鎖 A→B→C で、中間の B を条件づける（観測して固定する）と A と C は？",
    choices: [
      { label: "条件付き独立になる（経路が遮断される）", correct: true },
      { label: "より強く相関する", correct: false },
      { label: "変わらず相関する", correct: false },
      { label: "必ず因果関係になる", correct: false },
    ],
    explain:
      "連鎖では A の影響が B 経由で C に伝わる。B の値を固定すると «A から C への通り道» が塞がれ、A を追加で知っても C の予測は改善しない＝条件付き独立。d分離では «連鎖の中間ノードを条件づけると経路は閉じる»。",
  },
  {
    prompt: "分岐（共通原因）A←B→C で B を条件づけずに corr(A,C) を見ると相関があった。これは？",
    choices: [
      { label: "共通原因 B による «見せかけの相関»（交絡）", correct: true },
      { label: "A が C を引き起こす証拠", correct: false },
      { label: "C が A を引き起こす証拠", correct: false },
      { label: "偶然でしかありえない", correct: false },
    ],
    explain:
      "共通原因 B が A,C 両方を動かすと、A と C 自体に因果がなくても相関する（交絡・見せかけの相関）。B を条件づける（層別する）と偏相関がほぼ0に落ち、A,C は条件付き独立になる。交絡の除去＝共通原因での条件づけ。",
  },
  {
    prompt: "合流 A→B←C（A,C は独立な原因、B は共通の結果）で B を条件づけると？",
    choices: [
      { label: "独立だった A と C の間に見せかけの依存が生まれる（経路が開く）", correct: true },
      { label: "何も変化しない", correct: false },
      { label: "A と C がより強く独立になる", correct: false },
      { label: "B が A の原因になる", correct: false },
    ],
    explain:
      "合流点（コライダー）は他の2構造と逆。条件づけない限り A,C は独立だが、共通結果 B を固定すると «B が高いのに A が低いなら C が高いはず» という説明のしあいが生じ、見せかけの依存が開く（選択バイアス）。合流点やその子孫を «調整に入れてはいけない» 理由。",
  },
  {
    prompt: "グラフィカルモデルを因果推論で使う主な狙いは？",
    choices: [
      { label: "調整すべき変数と調整してはいけない変数（合流点）をd分離で見分ける", correct: true },
      { label: "とにかく多くの変数を回帰に入れて調整すること", correct: false },
      { label: "相関係数を最大化すること", correct: false },
      { label: "p値を小さくすること", correct: false },
    ],
    explain:
      "«多く入れれば安心» は誤り——合流点を入れると逆にバイアスが開く。因果ダイアグラムで各変数が交絡（共通原因）か合流点かを判定し、バックドア経路を塞ぐ変数だけを条件づける。d分離は «どの条件付き独立が成り立つか» を目で読む道具。",
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

/** グラフィカルモデリング 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function GraphQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#graph-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って構造を切り替え、条件づけで相関がどう開閉するか確かめる
      </a>
    </div>
  );
}
