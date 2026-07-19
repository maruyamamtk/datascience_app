"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "強化学習が教師あり学習と最も違う点は？",
    choices: [
      { label: "正解ラベルの代わりに «報酬» という遅れて・部分的にしか得られない手がかりから、試行錯誤で方策を学ぶ", correct: true },
      { label: "強化学習はデータをまったく使わない", correct: false },
      { label: "強化学習は必ずニューラルネットワークを使う", correct: false },
      { label: "強化学習には損失関数という概念がない", correct: false },
    ],
    explain:
      "教師あり学習は «この入力の正解はこれ» という直接のラベルから学ぶが、強化学習ではエージェントが行動した«結果»として報酬が返ってくるだけで、«その状況で最善の行動が何か»は教えてもらえない。自分の行動の結果（報酬・次の状態）を手がかりに、試行錯誤しながら方策を改善していく——この «評価的フィードバック» が教師あり学習の «教示的フィードバック» との本質的な違い。",
  },
  {
    prompt: "ε-greedy方策で ε を大きくすると何が起きる？",
    choices: [
      { label: "ランダムな行動（探索）を選ぶ確率が上がり、まだ知らない選択肢を試しやすくなる代わりに、既知の最良行動を逃す機会も増える", correct: true },
      { label: "常に貪欲な行動だけを選ぶようになる", correct: false },
      { label: "学習率 α が自動的に大きくなる", correct: false },
      { label: "報酬の値そのものが変わる", correct: false },
    ],
    explain:
      "ε-greedyは確率εでランダムな行動（探索）、確率1−εで現時点最良の行動（活用）を選ぶ。εが大きいほど探索が増え、未知の領域（例えば «実はもっと良い道がある» こと）を発見しやすくなる一方、既に分かっている良い行動を選ばない回数も増えるため、短期的な収益は下がりやすい——これが探索と活用のトレードオフ。",
  },
  {
    prompt: "Q学習の更新式 Q(s,a) ← Q(s,a) + α[r + γ·max_a'Q(s',a') − Q(s,a)] で、[ ]の中身（TD誤差）が意味するものは？",
    choices: [
      { label: "«実際に起きたこと（報酬＋その先の見込み）» と «今のQ値の予想» とのズレ", correct: true },
      { label: "報酬そのもの", correct: false },
      { label: "割引率 γ の値", correct: false },
      { label: "学習率 α の値", correct: false },
    ],
    explain:
      "r + γ·max_a'Q(s',a')（TD目標）は «この行動をとった後、実際に得られた報酬と、その次の状態から見込める最善の価値» の推定値。これと現在のQ(s,a)（更新前の予想）との差がTD誤差——«予想が外れていた分» だけQ値を動かす、というのがTD学習（Temporal Difference Learning）の考え方。TD誤差が0に近づくほど、そのQ値は収束に近い。",
  },
  {
    prompt: "割引率 γ を1に近づけると、エージェントの行動はどう変わる傾向がある？",
    choices: [
      { label: "遠い将来の報酬も «ほぼ割り引かずに» 重視するようになり、目先の小さな損より長期的な利益を優先しやすくなる", correct: true },
      { label: "報酬をまったく考慮しなくなる", correct: false },
      { label: "常に探索だけを行うようになる", correct: false },
      { label: "学習が必ず速くなる", correct: false },
    ],
    explain:
      "γ（0以上1未満が典型）は «k歩先の報酬をγ^k倍に割り引く» ためのパラメータ。γが1に近いほど遠い将来の報酬もほぼそのまま評価するため、長期的な視点の行動を学びやすい。γが0に近いと «次の1歩の報酬» しか見ない近視眼的な方策になる。",
  },
  {
    prompt: "Q学習が «モデルフリー» な学習法と呼ばれる理由は？",
    choices: [
      { label: "環境の遷移確率（どの行動でどこへ移るか）をあらかじめ知らなくても、実際に行動した経験（r, s'）だけから学習できるから", correct: true },
      { label: "ニューラルネットワークのモデルを一切使わないから", correct: false },
      { label: "報酬関数が存在しないから", correct: false },
      { label: "必ず表形式のQテーブルを使うから", correct: false },
    ],
    explain:
      "前提トピックのマルコフ連鎖では遷移行列（どの状態からどこへどの確率で移るか）が «既知» という前提で定常分布などを計算した。しかし多くの現実の環境では遷移確率は未知——Q学習はその遷移確率モデルを陽に推定・利用せず、実際に行動して得た（状態, 行動, 報酬, 次状態）というサンプルだけから価値関数を更新する «モデルフリー» な手法。これに対し、遷移確率が既知の前提で計算する «価値反復» などは «モデルベース» な手法と呼ばれる。",
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

/** 強化学習 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function ReinforcementLearningQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a href="#grid-world-lab" className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2">
        ↑ 操作に戻ってε・γを変え、学習曲線や方策の矢印がどう変わるか確かめる
      </a>
    </div>
  );
}
