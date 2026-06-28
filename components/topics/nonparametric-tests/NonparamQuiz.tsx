"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "ノンパラメトリック検定の «ノンパラメトリック» とは？",
    choices: [
      { label: "母集団の分布形（正規など）を仮定しない", correct: true },
      { label: "パラメータが0個のモデル", correct: false },
      { label: "計算が不要", correct: false },
      { label: "標本が大きくないと使えない", correct: false },
    ],
    explain:
      "母集団の分布形を仮定せず、順位や並べ替えで検定する。正規性が疑わしい・小標本・外れ値があるデータに頑健。t 検定などパラメトリック法は分布を仮定する。",
  },
  {
    prompt: "並べ替え検定（permutation test）の帰無分布はどう作る？",
    choices: [
      { label: "2群を合併しラベルをランダムに割り直して統計量を再計算する", correct: true },
      { label: "正規分布表を引く", correct: false },
      { label: "標本を捨てて新しく取り直す", correct: false },
      { label: "事前分布から生成する", correct: false },
    ],
    explain:
      "«差がない» なら群ラベルは交換可能。ラベルをシャッフルして統計量を何度も計算すると帰無分布ができる。観測がその端にあるほど p が小さい。分布を一切仮定しない。",
  },
  {
    prompt: "ウィルコクソン順位和検定（マン–ホイットニー）が t 検定の代わりに使われるのは？",
    choices: [
      { label: "データを順位に変換するので外れ値・非正規に頑健", correct: true },
      { label: "計算が速いから", correct: false },
      { label: "平均を比較するから", correct: false },
      { label: "正規分布が前提だから", correct: false },
    ],
    explain:
      "値そのものでなく «順位» で2群を比べるため、外れ値や歪んだ分布に頑健。中央値の差を見る感覚。対応のあるデータには符号付き順位検定、3群以上にはクラスカル–ウォリス検定。",
  },
  {
    prompt: "スピアマンの順位相関係数の特徴は？",
    choices: [
      { label: "順位で計算するので «単調な» 関係を捉え、非線形でも検出できる", correct: true },
      { label: "直線関係しか測れない", correct: false },
      { label: "ピアソンと常に一致する", correct: false },
      { label: "外れ値に弱い", correct: false },
    ],
    explain:
      "各変数を順位に変換してピアソン相関を取る。直線でなくても «単調増加なら ρ≈1»。外れ値に頑健。ピアソンは直線関係のみを測るので、曲線的な単調関係はスピアマンが得意。",
  },
  {
    prompt: "3群以上の中央値を順位ベースで比較する検定は？",
    choices: [
      { label: "クラスカル–ウォリス検定", correct: true },
      { label: "ウィルコクソン符号付き順位検定", correct: false },
      { label: "対応のあるt検定", correct: false },
      { label: "カイ二乗適合度検定", correct: false },
    ],
    explain:
      "クラスカル–ウォリス検定は分散分析（ANOVA）の順位版で、3群以上を一括で比較する。対応のある2条件は符号付き順位検定、独立2群は順位和検定。状況で使い分ける。",
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

/** ノンパラメトリック法 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function NonparamQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#nonparam-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って shift を動かし、並べ替え p 値を確かめる
      </a>
    </div>
  );
}
