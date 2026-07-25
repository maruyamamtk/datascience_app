"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "サンクトペテルブルクのパラドックスで、このくじの期待金額はいくらになるか?",
    choices: [
      { label: "無限大に発散する(∞)", correct: true },
      { label: "2円", correct: false },
      { label: "4円(1回目で表が出たときの払戻額)", correct: false },
      { label: "0円(不確実性が高すぎるため)", correct: false },
    ],
    explain:
      "期待金額=Σ(1/2ⁿ)×2ⁿ=Σ1=1+1+1+...と、各項がちょうど1のまま無限に足され続けるため発散する。しかし多くの人はこのくじに有限の金額しか払わない——期待金額を意思決定の指標とすることの限界を示す古典的な例。",
  },
  {
    prompt:
      "サンクトペテルブルクのパラドックスは、効用関数 u(x)=log₂x を導入するとどう解決されるか?",
    choices: [
      {
        label: "期待効用 E[u(X)]=Σ(1/2ⁿ)log₂(2ⁿ)=Σn/2ⁿ が有限値(=2)に収束する",
        correct: true,
      },
      { label: "期待金額そのものが有限値に変わる", correct: false },
      { label: "くじの払戻額2ⁿが変わる", correct: false },
      { label: "確率(1/2)ⁿが変わる", correct: false },
    ],
    explain:
      "log₂(2ⁿ)=nなので、期待効用の各項は(1/2ⁿ)×n=n/2ⁿ。この無限級数はn=1から足すと2に収束する(有限)。金額そのものではなく«効用»の期待値を最大化する、という発想がここから生まれる。",
  },
  {
    prompt:
      "vNM(フォン・ノイマン=モルゲンシュテルン)の定理が要求する4つの公理に含まれないのはどれか?",
    choices: [
      { label: "正規性(データが正規分布に従うこと)", correct: true },
      { label: "完備性(任意の2つの選択肢を比較できる)", correct: false },
      { label: "推移性(a≻bかつb≻cならa≻c)", correct: false },
      { label: "独立性(確率的混合における選好の独立性)", correct: false },
    ],
    explain:
      "vNMの定理が要求するのは完備性・推移性・連続性・独立性の4公理。「正規性(データが正規分布に従うこと)」はvNMの公理には含まれない——vNMの定理は選好関係についての公理であり、確率分布の形についての仮定ではない。",
  },
  {
    prompt: "効用関数が凹関数(上に凸)であるとき、リスク態度の分類として正しいのはどれか?",
    choices: [
      { label: "リスク回避的(確実同値額 CE が期待値 E[X] を下回る)", correct: true },
      { label: "リスク中立(CE=E[X])", correct: false },
      { label: "リスク受容的(CE>E[X])", correct: false },
      { label: "効用関数の凹凸とリスク態度は無関係", correct: false },
    ],
    explain:
      "効用関数が凹(上に凸)ならリスク回避的、直線ならリスク中立、凸(下に凸)ならリスク受容的。凹関数では«弦(2点を結ぶ直線)»が曲線の下にあるため、くじの期待効用に対応する確実同値額CEは期待値E[X]より小さくなる。",
  },
  {
    prompt: "リスクプレミアム RP=E[X]−CE について正しい説明はどれか?",
    choices: [
      {
        label: "リスク回避的な人ほど正で大きくなる(不確実性を避けるために手放してよい金額)",
        correct: true,
      },
      { label: "常に0である", correct: false },
      { label: "リスク受容的な人ほど正で大きくなる", correct: false },
      { label: "確率とは無関係に決まる定数", correct: false },
    ],
    explain:
      "リスクプレミアムは「くじの期待金額」と「くじと無差別な確実な金額(CE)」の差。リスク回避的な人はくじより確実な金額を高く評価するのでCE<E[X]、つまりRP>0になり、リスク回避の度合いが強いほどRPは大きくなる。",
  },
  {
    prompt:
      "上のUtilityDecisionLabで、好況になる確率pを0.7、リスク回避度αをある程度大きくしたとき、ESV(期待金額)最大化とEU(期待効用)最大化はどうなりうるか?",
    choices: [
      {
        label:
          "ESVは«2台稼働»(ハイリスク・ハイリターン)を選ぶが、EUはより安全な«1台稼働»を選ぶことがある",
        correct: true,
      },
      { label: "ESVとEUは常に完全に一致し、食い違うことはない", correct: false },
      { label: "EUは必ずESVより大きい値になる", correct: false },
      { label: "αを大きくしてもESV・EUの選ぶ行動は変化しない", correct: false },
    ],
    explain:
      "2台稼働は好況なら大きく儲かるが不況なら大きく損する(700/−300)ハイリスク・ハイリターンな行動。p=0.7ではESV(期待金額)は2台稼働を選ぶが、リスク回避度αが十分大きいと、不況時の大きな損失が効用を大きく引き下げるため、EU(期待効用)はより安定した1台稼働を選ぶ——期待金額と期待効用で意思決定が異なる典型例。",
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

/** 効用理論トピックの演習(確認問題 → 即時フィードバック → 操作へ戻るリンク, SPEC §4.1③)。 */
export function UtilityTheoryQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#utility-decision-lab"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻ってαやpを動かし、期待金額と期待効用の意思決定がどう食い違うかを確かめる
      </a>
    </div>
  );
}
