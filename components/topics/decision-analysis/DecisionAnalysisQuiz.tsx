"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt:
      "上の利得行列Lab(0台/1台/2台稼働 × 好況/不況)で、Maximax基準とMaximin基準が選ぶ行動は違っていた。この違いを最もよく説明するのは？",
    choices: [
      {
        label:
          "Maximaxは各行動の«最良の場合»だけを見て2台稼働(上振れ700)を選ぶ一方、Maximinは各行動の«最悪の場合»だけを見て1台稼働(下振れが-300でなく300で最もマシ)を選ぶ——見ている場面が正反対だから",
        correct: true,
      },
      { label: "Maximaxは計算ミスをしている", correct: false },
      { label: "MaximinはMaximaxの符号を反転させただけの基準である", correct: false },
      { label: "2つの基準は必ず同じ行動を選ぶはずで、違いが出るのはこの例が特殊だから", correct: false },
    ],
    explain:
      "Maximaxは「各行動の最大利得」を比較する楽観的な基準、Maximinは「各行動の最小利得(=最悪の場合)」を比較する悲観的な基準。同じ利得行列でも«どの数値に注目するか»が違うため、選ぶ行動が食い違うのは自然なこと——どちらが«正しい»かは意思決定者のリスク態度次第。",
  },
  {
    prompt: "Hurwicz基準の楽観係数αを0に近づけていくと、Hurwicz基準はどの基準に近づく？",
    choices: [
      { label: "Maximin基準(α=0で完全に一致する)", correct: true },
      { label: "Maximax基準", correct: false },
      { label: "Laplace基準", correct: false },
      { label: "Minimax regret基準", correct: false },
    ],
    explain:
      "Hurwicz基準のスコアはα×最大利得+(1−α)×最小利得。α=0なら最小利得だけが残りMaximinと完全に一致し、α=1なら最大利得だけが残りMaximaxと完全に一致する——HurwiczはこのMaximax(最も楽観的)とMaximin(最も悲観的)を連続的につなぐ基準。",
  },
  {
    prompt:
      "リグレット行列Stepperで、2台稼働の«好況»列のリグレットは0だった。これはどういう意味？",
    choices: [
      {
        label: "好況のとき、2台稼働はその列で最大の利得(700)を得ており、«最善の行動を選んでいたら得られたはずの利得»との差(後悔)がちょうど0だから",
        correct: true,
      },
      { label: "2台稼働の利得そのものが0円だから", correct: false },
      { label: "好況になる確率が0だから", correct: false },
      { label: "計算にバグがあり、本来は0にならないはずだから", correct: false },
    ],
    explain:
      "リグレット(後悔)=その状態での最大利得−実際に選んだ行動の利得。好況列の最大利得はまさに2台稼働の700なので、2台稼働を選んでいれば«後から振り返っても最善だった»ことになりリグレットは0。逆に不況列では2台稼働のリグレットが最も大きい(=最も後悔しやすい)。",
  },
  {
    prompt: "期待値による意思決定(ESV)Labで、好況になる確率pを0.5から0.7まで上げていくと、選ばれる行動はどう変わった？",
    choices: [
      {
        label: "1台稼働(安定型)から2台稼働(好況ならハイリターン)へ切り替わった——p=0.6を境に2台稼働のESVが1台稼働を上回るため",
        correct: true,
      },
      { label: "常に0台稼働のままだった", correct: false },
      { label: "pを変えてもESVは変化しない", correct: false },
      { label: "1台稼働から0台稼働に切り替わった", correct: false },
    ],
    explain:
      "2台稼働のESVはp×700+(1−p)×(−300)=1000p−300で、pが大きいほど急激に上昇する。1台稼働のESVは常に300で一定。1000p−300=300を解くとp=0.6——好況の見込みが高いほど、ハイリスク・ハイリターンな行動が«期待値の上では»有利になる。",
  },
  {
    prompt: "決定木の後ろ向き帰納法ステッパーで、確率ノード(○)と決定ノード(□)の値の求め方の違いは？",
    choices: [
      {
        label: "確率ノードは«各枝の確率×子の値»の合計(期待値)、決定ノードは«子の値のうち最大のもの»を選ぶ(意思決定者は自分に最も有利な枝を選べるため)",
        correct: true,
      },
      { label: "どちらも子の値の単純な平均を取る", correct: false },
      { label: "確率ノードは最大値、決定ノードは期待値を計算する(説明と逆)", correct: false },
      { label: "決定ノードは子の値をすべて足し合わせるだけ", correct: false },
    ],
    explain:
      "確率ノードは意思決定者にはコントロールできない«自然の状態»が確率的に決まる場所なので期待値(確率で重み付けた平均)。決定ノードは意思決定者が«自分で選べる»場所なので、子(各行動)の中で最も値が大きいものを選ぶ——この2種類のノードの計算方法の違いが後ろ向き帰納法の核心。",
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

/** 決定分析トピックの演習(確認問題 → 即時フィードバック → 操作へ戻るリンク, SPEC §4.1③)。 */
export function DecisionAnalysisQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#payoff-matrix-lab"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って利得行列や決定基準を動かし、選ばれる行動の違いを確かめる
      </a>
    </div>
  );
}
