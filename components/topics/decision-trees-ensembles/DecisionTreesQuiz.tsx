"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "決定木の分岐基準（ジニ不純度・エントロピー）が最大になるのはどんな状態？",
    choices: [
      { label: "そのノードに含まれる2クラスの点数がちょうど五分五分のとき", correct: true },
      { label: "そのノードが1クラスだけで完全に純粋なとき", correct: false },
      { label: "サンプル数が0のとき", correct: false },
      { label: "木の深さが最大に達したとき", correct: false },
    ],
    explain:
      "不純度は «クラスがどれだけ混ざっているか» を測る指標。五分五分（最も予測しづらい）で最大になり、1クラスだけの純粋なノードで0になる。分岐は «不純度をできるだけ減らす»（情報利得を最大化する）方向に貪欲に選ばれる。",
  },
  {
    prompt: "バギングとランダムフォレストの違いは？",
    choices: [
      { label: "ランダムフォレストは各分割で候補特徴量をランダムに絞り、木どうしの相関を下げる", correct: true },
      { label: "バギングはブートストラップを使わない", correct: false },
      { label: "ランダムフォレストは決定木を1本しか使わない", correct: false },
      { label: "バギングのほうが必ず精度が高い", correct: false },
    ],
    explain:
      "どちらもブートストラップ再標本で木を並列に育てて多数決する（バギング）。ランダムフォレストはさらに «各分割で使う特徴量をランダムに一部だけに絞る» ことで木どうしの相関を下げ、多数決の分散低減効果を強める。",
  },
  {
    prompt: "OOB（out-of-bag）誤り率の利点は？",
    choices: [
      { label: "held-out用のテストデータを別に取り分けなくても汎化誤差を見積もれる", correct: true },
      { label: "訓練誤差と完全に同じ値になる", correct: false },
      { label: "決定株（深さ1の木）にしか使えない", correct: false },
      { label: "木が1本のときだけ計算できる", correct: false },
    ],
    explain:
      "各点について «その点をブートストラップに含まなかった木» だけで多数決した誤り率がOOB誤り率。ブートストラップは復元抽出なので毎回一部の点が選ばれず残る（out-of-bag）——これが自然な held-out 集合の役割を果たす。",
  },
  {
    prompt: "バギング（ランダムフォレスト）とブースティング（AdaBoost・勾配ブースティング）の最大の違いは？",
    choices: [
      { label: "バギングは木を並列・独立に育てるが、ブースティングは前の弱学習器の誤りに注目して逐次追加する", correct: true },
      { label: "ブースティングは決定木を使わない", correct: false },
      { label: "バギングのほうが常に過学習しやすい", correct: false },
      { label: "ブースティングはブートストラップを使う点が同じで違いはない", correct: false },
    ],
    explain:
      "バギングは木を «並列・独立» に育てて多数決し、主に分散を減らす。ブースティングは弱学習器を «逐次» 追加し、AdaBoostは前段が誤分類した点の重みを増やし、勾配ブースティングは残差（まだ説明できていない部分）に次の弱学習器をフィットする——主にバイアスを減らす方向に効く。",
  },
  {
    prompt: "LightGBM（勾配ブースティング木の高速な実装）が高速化のために使う工夫は？",
    choices: [
      { label: "特徴量をヒストグラム化して分割候補を間引き、深さ優先で葉を選んで伸ばすLeaf-wise成長を使う", correct: true },
      { label: "決定木をまったく使わない", correct: false },
      { label: "常に全データを1本の木にまとめて学習を1回で終わらせる", correct: false },
      { label: "ブートストラップ再標本をやめて多数決だけにする", correct: false },
    ],
    explain:
      "LightGBMは連続値をあらかじめビン（ヒストグラム）にまとめて分割探索を高速化し、レベルごとに均等に伸ばす代わりに «最も損失が減る葉» を選んで伸ばすLeaf-wise成長を採用する。GOSS（勾配の小さいサンプルを間引く）やEFB（疎な特徴量をまとめる）も高速化の工夫。仕組みは勾配ブースティングそのもの——大規模データ向けの効率化がLightGBMの主眼。",
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
            cls = c.correct ? "border-green-500 bg-green-50 text-green-800" : "border-red-400 bg-red-50 text-red-700";
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
        <div className={`rounded-lg p-3 text-sm leading-relaxed ${isCorrect ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900"}`} role="status">
          <span className="font-semibold">{isCorrect ? "正解！ " : "もう一度考えてみよう。 "}</span>
          {q.explain}
        </div>
      ) : null}
    </div>
  );
}

/** 決定木・アンサンブル 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function DecisionTreesQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a href="#decision-tree-lab" className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2">
        ↑ 操作に戻って深さ・分岐基準・木の本数・アンサンブル手法を切り替え、境界の変化を確かめる
      </a>
    </div>
  );
}
