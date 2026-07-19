"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "「機械学習モデルの正解率（accuracy）を改善し続ければ、ビジネスの売上も自動的に向上する」——正しいか？",
    choices: [
      { label: "誤り。評価指標（技術指標）とKPI（ビジネス指標）は別物で、両者が連動するとは限らない", correct: true },
      { label: "正しい。正解率を上げれば必ず売上も上がる", correct: false },
      { label: "正しい。ただし分類問題に限る", correct: false },
      { label: "誤り。評価指標を使うこと自体が誤りである", correct: false },
    ],
    explain:
      "評価指標（モデルの性能を測る客観指標）とKPI（ビジネス上の目標達成度を示す主観指標）の間には乖離が生じうる。正解率だけを上げる«自己無自覚なモデル改善»は、コスト・収益の非対称性を無視しているため、ビジネス成果に繋がらないことがある。",
  },
  {
    prompt: "偽陽性（誤報）のコストより偽陰性（見逃し）の機会損失の方がずっと大きいとき、期待ビジネスインパクトを最大化するしきい値は、正解率を最大化するしきい値と比べてどうなる傾向があるか？",
    choices: [
      { label: "より低くなる傾向がある——«疑わしきは陽性»側に倒し、見逃しを減らす", correct: true },
      { label: "より高くなる傾向がある", correct: false },
      { label: "必ず一致する", correct: false },
      { label: "しきい値という概念自体が無関係", correct: false },
    ],
    explain:
      "見逃し（FN）の機会損失が誤報（FP）の無駄コストよりずっと大きい非対称なコスト構造では、しきい値を下げて«より多く陽性と判定»する方が期待ビジネスインパクトは大きくなりやすい——結果として正解率だけを最大化するしきい値よりも低い位置に業績最適のしきい値が来る。",
  },
  {
    prompt: "売上=トラフィック×転換率×客単価という乗法分解で、転換率だけを+10%改善したときの売上への相対インパクトは？",
    choices: [
      { label: "他の2要素を固定すれば、売上もちょうど+10%動く——どの要素でも対称", correct: true },
      { label: "常に+10%より大きくなる", correct: false },
      { label: "常に+10%より小さくなる", correct: false },
      { label: "転換率は売上に影響しない", correct: false },
    ],
    explain:
      "掛け算の構造上、他の2要素を固定して1要素だけを(1+10%)倍すると、積（売上）もちょうど(1+10%)倍になる——トラフィック・転換率・客単価のどれでも相対%インパクトは同じ。実務での優先順位は«どの要素が伸ばしやすいか»という実現可能性で決まる。",
  },
  {
    prompt: "«ノーススター指標»の役割として最も適切なものは？",
    choices: [
      { label: "プロダクトが提供する価値の核心を1つの指標に集約し、組織全体の意思決定の北極星にする", correct: true },
      { label: "モデルの学習で最小化する損失関数そのもの", correct: false },
      { label: "A/Bテストで必ず有意差を出すための指標", correct: false },
      { label: "ガードレール指標と同じ意味で、悪化を防ぐためだけに使う指標", correct: false },
    ],
    explain:
      "ノーススター指標（North Star Metric）は«このプロダクトが顧客に提供している価値»を最もよく表す単一の指標で、組織のあらゆる施策の優先順位付けの拠り所になる。副作用（悪化させてはいけない指標）を見張るのはガードレール指標の役割で、両者は補完関係にある。",
  },
  {
    prompt: "«KPIの分解»（例: 売上=トラフィック×転換率×客単価）を行う目的として適切でないものは？",
    choices: [
      { label: "どの要素を改善しても売上へのインパクトは常に同じ絶対額になると保証するため", correct: true },
      { label: "改善ポイント（どの要素がボトルネックか）を特定するため", correct: false },
      { label: "限られたリソースを投じる施策の優先順位付けをするため", correct: false },
      { label: "各要素を個別にモデル化し予測精度を高めるため", correct: false },
    ],
    explain:
      "KPI分解の目的は改善ポイントの特定・施策の優先順位付け・予測精度の向上・ビジネス理解の深化——«相対%インパクトが対称»なことは数学的事実だが、«絶対額のインパクトが常に同じ»わけではない（各要素のベース値が異なるため）。分解が保証するのは対称性であって絶対額の一致ではない。",
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
            <button key={i} type="button" onClick={() => setSelected(i)} aria-pressed={chosen} className={`rounded-lg border px-3 py-2 text-left text-sm transition ${cls}`}>
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

/** 評価指標とKPI設計 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function MetricsKpiQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a href="#business-impact-lab" className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2">
        ↑ 操作に戻り、しきい値とコスト行列を変えて正解率と期待ビジネスインパクトのズレを確かめる
      </a>
    </div>
  );
}
