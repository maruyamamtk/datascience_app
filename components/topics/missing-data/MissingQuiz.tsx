"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "«MAR（Missing At Random）» の正確な意味は？",
    choices: [
      { label: "欠測の起こりやすさが «観測された変数» で説明できる（観測変数で条件づければランダム）", correct: true },
      { label: "欠測が完全に偶然で、何とも無関係", correct: false },
      { label: "欠測が «欠測した値そのもの» に依存する", correct: false },
      { label: "欠測がまったく存在しない", correct: false },
    ],
    explain:
      "MAR は «欠測の確率が観測変数に依存するが、観測変数で条件づければ欠測値自体とは独立» という意味。完全に偶然なら MCAR、欠測した値自身に依存するなら MNAR。MAR なら観測変数（補助変数）を使う補完で回復できる。",
  },
  {
    prompt: "完全ケース分析（欠測を含む行を捨てる）が平均について不偏なのはどの場合？",
    choices: [
      { label: "MCAR（欠測が完全にランダム）のとき", correct: true },
      { label: "MAR のとき常に", correct: false },
      { label: "MNAR のとき", correct: false },
      { label: "どんな場合でも常に", correct: false },
    ],
    explain:
      "MCAR では観測される部分が母集団の «無作為標本» になるので、完全ケース分析の平均は不偏。MAR/MNAR では観測が偏る（例：高い Y が抜ける）ので平均が歪む。ただし MCAR でも行を捨てる分だけ標本が減り、推定は非効率になる。",
  },
  {
    prompt: "平均代入（欠測を観測平均で埋める）の主な弊害は？",
    choices: [
      { label: "分散・標準誤差を過小評価する（ばらつきが人工的に縮む）", correct: true },
      { label: "平均が必ず上振れする", correct: false },
      { label: "計算ができなくなる", correct: false },
      { label: "欠測がさらに増える", correct: false },
    ],
    explain:
      "埋めた値が全部同じ（＝平均）なので、そのぶんデータのばらつきが減り SD・標準誤差が過小になる。結果として信頼区間が狭くなり «有意になりやすい» 危険。平均は完全ケースと同じで、MAR のバイアスも直らない。",
  },
  {
    prompt: "MNAR（欠測が欠測値自身に依存）に観測変数だけの回帰代入を使うと？",
    choices: [
      { label: "観測変数では欠測の原因を説明できず、バイアスが残る", correct: true },
      { label: "常に完全に補正できる", correct: false },
      { label: "平均代入と同じ結果になる", correct: false },
      { label: "分散だけが問題で平均は正しい", correct: false },
    ],
    explain:
      "MNAR は «高い Y ほど欠測» のように欠測値そのものに依存する。観測変数 X は欠測の原因を捉えないので、X を使う回帰代入でもバイアスが残る。MNAR では欠測メカニズムのモデル化や感度分析（複数の仮定で結果の頑健性を見る）が必要になる。",
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

/** 欠測値の処理 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function MissingQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#missing-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻ってメカニズムを切り替え、完全ケースのバイアスと補完の効き方を確かめる
      </a>
    </div>
  );
}
