"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "k-means の各ステップは何を繰り返す？",
    choices: [
      { label: "各点を最寄りの重心に割り当て、重心を割り当てた点の平均へ更新", correct: true },
      { label: "ランダムに点を入れ替える", correct: false },
      { label: "分散を最大化する", correct: false },
      { label: "回帰直線を引く", correct: false },
    ],
    explain:
      "ロイドのアルゴリズム：①割り当て（各点→最寄り重心）②更新（重心→クラスター平均）を交互に。WCSS（群内平方和）が必ず減り、有限回で収束する。",
  },
  {
    prompt: "クラスター数 k を増やすと群内平方和（WCSS）は？",
    choices: [
      { label: "必ず下がる。k=データ数で0になる（過剰）", correct: true },
      { label: "必ず上がる", correct: false },
      { label: "変わらない", correct: false },
      { label: "負になる", correct: false },
    ],
    explain:
      "k を増やすほど各点が重心に近づき WCSS は単調減少。極端には1点1クラスターで0。だから «WCSS最小» で k は選べない。下がり方が緩む «エルボー（肘）» やシルエット係数で適切な k を決める。",
  },
  {
    prompt: "k-means が «初期値しだいで結果が変わる» のはなぜ？",
    choices: [
      { label: "WCSS を局所的にしか最小化せず、初期重心で別の局所解に落ちうるから", correct: true },
      { label: "乱数を使わないから", correct: false },
      { label: "必ず大域最適に着くから", correct: false },
      { label: "kに依存しないから", correct: false },
    ],
    explain:
      "k-means は WCSS の «局所» 最適化。初期重心が悪いと劣った局所解に収束する。複数の初期値で試して最良を採る（k-means++ で良い初期値を選ぶ）のが定番。",
  },
  {
    prompt: "階層クラスタリング（凝集型）と k-means の違いは？",
    choices: [
      {
        label: "階層型は近いものから順に併合しデンドログラムを作る（k を後で決められる）",
        correct: true,
      },
      { label: "階層型は k を先に決める必要がある", correct: false },
      { label: "k-means はデンドログラムを作る", correct: false },
      { label: "両者は同じ", correct: false },
    ],
    explain:
      "凝集型階層クラスタリングは «最も近いクラスター対» を順に併合し、木（デンドログラム）を作る。木を好きな高さで切れば任意の k が得られる。k-means は k を先に指定する。連結基準（単・完全・群平均・Ward）で結果が変わる。",
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

/** クラスター分析 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function ClusterQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#cluster-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って k を変え、クラスタリングと WCSS を確かめる
      </a>
    </div>
  );
}
