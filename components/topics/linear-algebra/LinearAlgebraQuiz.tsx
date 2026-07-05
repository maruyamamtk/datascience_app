"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "2×2 行列の «行列式 det A» が表す幾何的な意味は？",
    choices: [
      { label: "変換による面積の（符号付き）拡大率。det<0 は裏返し、det=0 はつぶれる", correct: true },
      { label: "変換後のベクトルの長さそのもの", correct: false },
      { label: "行列の対角成分の和", correct: false },
      { label: "固有ベクトルの本数", correct: false },
    ],
    explain:
      "det A は単位正方形（面積1）が変換後に張る平行四辺形の符号付き面積。|det|＝面積拡大率、符号＝向き（正なら保存、負なら鏡像反転）。det=0 のとき平面が線や点につぶれ、逆行列が存在しない（階数が落ちる）。対角成分の和はトレース。",
  },
  {
    prompt: "«固有ベクトル» と «固有値 λ» の定義（A·v=λv）が意味するのは？",
    choices: [
      { label: "変換で «向きが変わらず» 長さだけ λ 倍になる特別な方向 v と、その倍率 λ", correct: true },
      { label: "行列の中で最も大きい成分", correct: false },
      { label: "常に互いに直交する2本のベクトル", correct: false },
      { label: "変換後に原点へ移るベクトル", correct: false },
    ],
    explain:
      "固有ベクトル v は A を掛けても向きが変わらず、長さだけ固有値 λ 倍になる方向（A·v=λv）。一般の向きは変換で回転してしまうが、固有方向だけは «伸縮のみ»。固有ベクトルが直交するのは対称行列など特別な場合に限る（一般には直交しない）。",
  },
  {
    prompt: "2×2 行列の固有値 λ₁, λ₂ とトレース・行列式の関係は？",
    choices: [
      { label: "λ₁+λ₂ = tr A（対角和）、λ₁·λ₂ = det A", correct: true },
      { label: "λ₁+λ₂ = det A、λ₁·λ₂ = tr A", correct: false },
      { label: "λ₁, λ₂ は常に対角成分 a, d に等しい", correct: false },
      { label: "固有値とトレース・行列式は無関係", correct: false },
    ],
    explain:
      "特性方程式 λ²−(tr A)λ+det A=0 の解と係数の関係から、固有値の和＝トレース、積＝行列式。判別式 (tr)²−4det が負なら実固有値を持たず、変換は回転成分を含む。対角成分が固有値になるのは三角行列（片方が0）や対角行列の特別な場合だけ。",
  },
  {
    prompt: "行列 A の «階数（rank）» が列数より小さいとき（rank 落ち）に起きることは？",
    choices: [
      { label: "変換で次元がつぶれ（例: 平面→直線）、逆行列が存在せず情報が失われる", correct: true },
      { label: "変換後の面積が必ず大きくなる", correct: false },
      { label: "固有値がすべて1になる", correct: false },
      { label: "行列が対称になる", correct: false },
    ],
    explain:
      "rank は «変換後に張られる空間の次元»。2×2 で rank=1 なら平面全体が1本の直線につぶれる（det=0）。異なる入力が同じ出力に重なるため逆変換で元に戻せず、逆行列は存在しない。回帰の設計行列で列が従属（多重共線性）だと同じ問題が起きる。",
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

/** 線形代数 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function LinearAlgebraQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#linalg-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って a,b,c,d を変え、行列式・固有ベクトル方向の変化を確かめる
      </a>
    </div>
  );
}
