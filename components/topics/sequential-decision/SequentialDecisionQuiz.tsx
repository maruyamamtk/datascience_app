"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "後ろ向き帰納法(バックワードインダクション)は、なぜ最終期(t=T)から計算を始めるのか?",
    choices: [
      {
        label:
          "最終期には「その先」の期間がないため、Bellman方程式のΣ次状態の項が不要になり、即時報酬だけを比べる単純な最大化(近視眼的な最適化)で計算できるから——そこから1期ずつ、すでに確定した「1期先の価値関数」を使って過去へ遡れる",
        correct: true,
      },
      { label: "最初の期から計算すると計算量が多すぎるから(計算量は変わらない)", correct: false },
      { label: "決まりごとであり、数学的な理由はない", correct: false },
      { label: "最初の期の方が状態の数が多いから", correct: false },
    ],
    explain:
      "V_t(s)=max_a[r(a,s)+γΣP(s'|s)V_{t+1}(s')]は「1期先の価値関数V_{t+1}」が既知でないと計算できない。最終期T+1には「その先」がなくV_{T+1}(s)=0なので、V_Tから計算を始められる——決定分析の決定木で末端(葉)の利得から計算を始めるのと全く同じ発想を、複数期間に広げたもの。",
  },
  {
    prompt:
      "BackwardInductionStepperの格子で、t=1のセルを計算するとき、その計算式に使われている「V_{t+1}(s')」はどこから来るか?",
    choices: [
      {
        label: "1つ右の列(t=2)で、直前のコマまでにすでに計算・確定している価値関数の値——後ろ向き帰納法は必ず「1期先が確定済み」の状態で今の期を計算する",
        correct: true,
      },
      { label: "最初の期(t=1)の即時報酬をそのまま使う", correct: false },
      { label: "毎回ゼロから全期間を再計算し直す", correct: false },
      { label: "ランダムに初期化した値を使う", correct: false },
    ],
    explain:
      "後ろ向き帰納法は動的計画法の一種で、「1度計算した部分問題の答え(V_{t+1})を再利用する」のが本質(同じ部分問題を何度も計算し直さない)。格子が右から左へ1列ずつ埋まっていくのは、まさにこの「確定済みの1期先を使って今を解く」という依存関係を表している。",
  },
  {
    prompt: "PolicyLab・MdpLabで割引率γを1に近づけていくと、一般にどうなるか?",
    choices: [
      {
        label: "将来の価値がほぼ割り引かれずにそのままV_t(s)に伝わるため、遠い将来の景気変化も重視した行動が選ばれやすくなる",
        correct: true,
      },
      { label: "即時報酬が完全に無視されるようになる", correct: false },
      { label: "γは政策には一切影響しない", correct: false },
      { label: "状態遷移確率が変化する", correct: false },
    ],
    explain:
      "Bellman方程式のΣ次状態の項にはγがかかっており、γ→1では将来の価値がほぼそのまま今の価値に足し込まれる(高校数学の等比数列の重みγ^kが1に近づくのと同じ)。γ→0に近づけると「次の1期の即時報酬」しか見ない近視眼的な政策に近づく。",
  },
  {
    prompt:
      "decision-analysis(P-1)の決定木の後ろ向き帰納法と、本トピックの後ろ向き帰納法の最も大きな違いは?",
    choices: [
      {
        label:
          "決定木は「1回の意思決定(1段階)」を解くのに対し、本トピックは同じ「確率ノード=期待値、決定ノード=最大値」というルールを、複数期間(T期)にわたって繰り返し適用する——決定木の1期版を時間方向に一般化したものが逐次決定問題",
        correct: true,
      },
      { label: "決定木では期待値を使わないが、本トピックでは使う", correct: false },
      { label: "本トピックでは意思決定者が行動を選べない", correct: false },
      { label: "全く別の計算方法で、決定木とは無関係", correct: false },
    ],
    explain:
      "決定分析の決定木は「確率ノードの値=Σ確率×子の値、決定ノードの値=子の値の最大値」という2つのルールだけで末端から根まで解いた。本トピックのV_t(s)=max_a[r(a,s)+γΣP(s'|s)V_{t+1}(s')]も同じ2つの操作(期待値・最大値)の組み合わせで、それをT期ぶん繰り返しているだけ——決定木が「1期版」であることが分かる。",
  },
  {
    prompt: "本トピックのMDP(状態遷移確率Pが既知)と、強化学習(reinforcement-learning)のQ学習の違いは?",
    choices: [
      {
        label:
          "本トピックは遷移確率Pが既知という前提で、動的計画法(後ろ向き帰納法)により最適方策を«直接計算»する。Q学習はPが未知のとき、実際に行動して得たサンプル(s,a,r,s')だけから最適方策を«学習»する(モデルフリー)",
        correct: true,
      },
      { label: "本トピックとQ学習は数学的に全く同じもので呼び方が違うだけ", correct: false },
      { label: "Q学習の方が状態遷移確率をより正確に使う", correct: false },
      { label: "本トピックには割引率という概念がない", correct: false },
    ],
    explain:
      "マルコフ決定過程(MDP)という同じ枠組みの中で、Pが既知なら動的計画法で厳密に解け(本トピック)、Pが未知ならサンプルから近似的に学習する必要がある(Q学習・強化学習)——「解ける条件が揃っているか」の違いが、この2つのアプローチを分ける。",
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
          <span className="font-semibold">{isCorrect ? "正解! " : "もう一度考えてみよう。 "}</span>
          {q.explain}
        </div>
      ) : null}
    </div>
  );
}

/** 逐次決定トピックの演習(確認問題 → 即時フィードバック → 操作へ戻るリンク, SPEC §4.1③)。 */
export function SequentialDecisionQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#backward-induction-stepper"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って格子の再生・つまみを動かし、後ろ向き帰納法の計算過程を確かめる
      </a>
    </div>
  );
}
