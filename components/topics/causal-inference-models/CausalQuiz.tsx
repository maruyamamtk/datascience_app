"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "潜在的結果モデルで «個体処置効果» はどう定義される？",
    choices: [
      { label: "同じ個体の Y(1) − Y(0)（処置ありと処置なしの潜在結果の差）", correct: true },
      { label: "処置群の平均 − 対照群の平均", correct: false },
      { label: "処置後の結果 − 処置前の結果", correct: false },
      { label: "観測された結果そのもの", correct: false },
    ],
    explain:
      "因果効果は «同じ人が処置を受けた場合 Y(1) と受けなかった場合 Y(0) の差» として定義される。両方を同時には観測できない（片方は反事実）ので個人の効果は直接測れず、集団平均 ATE=E[Y(1)−Y(0)] を推定する。",
  },
  {
    prompt: "«因果推論の根本問題（fundamental problem of causal inference）» とは？",
    choices: [
      { label: "各個体で Y(0) と Y(1) の片方しか観測できないこと", correct: true },
      { label: "標本サイズが必ず不足すること", correct: false },
      { label: "乱数が真にランダムでないこと", correct: false },
      { label: "測定に必ず誤差が入ること", correct: false },
    ],
    explain:
      "実際に処置を受けた人は Y(1) しか、受けなかった人は Y(0) しか観測できない。もう一方は永遠に «反事実» で欠測。だから個体の因果効果は直接は分からず、群の比較で平均効果を推定するしかない。",
  },
  {
    prompt: "観測データで «処置群の平均 − 対照群の平均» が真の ATE からズレる主因は？",
    choices: [
      { label: "交絡：処置と結果の両方に影響する変数で、群の構成が偏る", correct: true },
      { label: "標本が大きすぎること", correct: false },
      { label: "処置効果が一定でないこと（必須ではない）", correct: false },
      { label: "結果変数が連続値であること", correct: false },
    ],
    explain:
      "交絡変数（例：重症度）が «処置の受けやすさ» と «結果» の両方に効くと、処置群と対照群がそもそも別物の集団になる。この不均衡が素朴な群間差を真の因果効果からズラす。これが «相関≠因果»。",
  },
  {
    prompt: "無作為割り当て（RCT）が交絡バイアスを消せるのはなぜ？",
    choices: [
      { label: "割り当てが交絡変数と独立になり、処置群と対照群が平均的に同質になるから", correct: true },
      { label: "無作為化で測定誤差がゼロになるから", correct: false },
      { label: "無作為化で標本サイズが増えるから", correct: false },
      { label: "無作為化で処置効果そのものが大きくなるから", correct: false },
    ],
    explain:
      "コインで処置を決めれば、割り当てはあらゆる共変量（観測・未観測とも）と独立。よって処置群と対照群は平均的に同じ構成になり、群間差がそのまま因果効果になる。観察データでは層別・回帰・傾向スコアで «同じ条件で比べる» を人工的に作る。",
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

/** 因果推論の枠組み 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function CausalQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#causal-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って交絡や無作為化を変え、素朴比較・真のATE・層別調整のズレを確かめる
      </a>
    </div>
  );
}
