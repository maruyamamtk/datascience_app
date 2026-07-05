"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "生存時間解析で «右打ち切り（right censoring）» とは？",
    choices: [
      { label: "観測終了・脱落までにイベントが起きず、«それ以降は不明» な状態", correct: true },
      { label: "イベントが観測開始前に既に起きていた状態", correct: false },
      { label: "測定値が大きすぎて記録できない状態", correct: false },
      { label: "データ入力の誤り", correct: false },
    ],
    explain:
      "右打ち切りは «少なくともその時点までは生存していたが、その後は追跡できていない»。研究終了・転院・脱落で起こる。«その時点まで生存» という部分情報を持つので、捨てずにリスク集合に反映するのがカプラン–マイヤーの要点。",
  },
  {
    prompt: "なぜ «死亡数 / 全体数» では生存率を正しく出せず、カプラン–マイヤーが必要なのか？",
    choices: [
      { label: "打ち切りがあると «全体数» が時間とともに変わり、単純な割り算では扱えないから", correct: true },
      { label: "計算が面倒だから", correct: false },
      { label: "死亡数が常に多すぎるから", correct: false },
      { label: "生存率は常に0.5だから", correct: false },
    ],
    explain:
      "打ち切りで «まだ観測中の人（リスク集合）» が時々刻々変わる。KM はイベント時刻ごとに «その時点のリスク集合に対する条件付き生存 (1−d/n)» を掛け合わせる（積・極限法）。打ち切りはリスク集合を減らすだけで段差を作らないので、部分情報を無駄にしない。",
  },
  {
    prompt: "カプラン–マイヤー曲線が «階段状（段差）» になるのはなぜ？",
    choices: [
      { label: "イベント（死亡）が起きた時刻でのみ生存確率が下がるから", correct: true },
      { label: "打ち切りのたびに下がるから", correct: false },
      { label: "一定時間ごとに下がるから", correct: false },
      { label: "常に直線的に下がるから", correct: false },
    ],
    explain:
      "生存確率が更新されるのはイベントが起きた時刻だけ。イベント間は一定（水平）で、イベント時刻に (1−d/n) 倍の段差が入る。だから右連続の階段関数になる。打ち切りの時刻には段差は入らない（+ 記号で示す）。",
  },
  {
    prompt: "2群の生存曲線の差を検定する «ログランク検定» が比べているのは？",
    choices: [
      { label: "各イベント時刻での «観測イベント数» と «帰無仮説下の期待イベント数» の累積のズレ", correct: true },
      { label: "2群の平均生存時間の差だけ", correct: false },
      { label: "最終時点の生存率だけ", correct: false },
      { label: "打ち切りの人数だけ", correct: false },
    ],
    explain:
      "ログランクは各イベント時刻で «もし2群が同じ生存分布なら群Aに期待されるイベント数 E=d·(nA/n)» を計算し、観測 OA との差を全時刻で積み上げて χ²=(OA−EA)²/V で検定する。曲線全体の «一貫したズレ» に感度が高い（比例ハザードのとき最強）。",
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

/** 生存時間解析 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function SurvivalQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#survival-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って2群のハザードを変え、曲線の分離とログランク p 値を確かめる
      </a>
    </div>
  );
}
