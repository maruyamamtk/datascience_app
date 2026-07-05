"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "教師あり学習で本当に小さくしたいのはどの誤差？",
    choices: [
      { label: "汎化誤差（まだ見ぬデータでの誤差）", correct: true },
      { label: "経験誤差（訓練データでの誤差）", correct: false },
      { label: "パラメータの個数", correct: false },
      { label: "学習にかかった時間", correct: false },
    ],
    explain:
      "機械学習の目的は «見たデータ» への当てはめではなく «まだ見ぬデータ» での予測。訓練データの誤差（経験誤差）はモデルを複雑にすればいくらでも 0 に近づけられるが、それは丸暗記に過ぎない。真に最小化したいのは母集団全体での期待誤差＝汎化誤差。だから性能はテストデータで測る。",
  },
  {
    prompt: "モデルの複雑さを上げていくと、訓練誤差とテスト誤差は典型的にどう振る舞う？",
    choices: [
      { label: "訓練誤差は単調に下がり、テスト誤差は U 字（下がってから上がる）", correct: true },
      { label: "どちらも単調に下がり続ける", correct: false },
      { label: "どちらも単調に上がり続ける", correct: false },
      { label: "訓練誤差は一定で、テスト誤差だけ下がる", correct: false },
    ],
    explain:
      "複雑にするほど訓練点には合わせられる（経験誤差は単調に減る）。一方テスト誤差は «バイアス² + 分散» の和で、初めはバイアスが減って下がるが、ある点を越えると分散（訓練ノイズへの過適合）が増えて上がる＝U 字。最小点が «ちょうどよい複雑さ»。左側が適合不足、右側が過学習。",
  },
  {
    prompt: "«過学習（オーバーフィッティング）» の状態を最もよく表すのは？",
    choices: [
      { label: "訓練誤差は小さいのにテスト誤差が大きい（汎化ギャップが広い）", correct: true },
      { label: "訓練誤差もテスト誤差も大きい", correct: false },
      { label: "訓練誤差がテスト誤差より大きい", correct: false },
      { label: "データを増やすほど必ず悪化する", correct: false },
    ],
    explain:
      "過学習＝訓練データのノイズや偶然のパターンまで覚えてしまい、訓練では好成績（低い経験誤差）なのに新しいデータで外す（高い汎化誤差）状態。両者の差＝汎化ギャップが広い。対策は «モデルを単純化」「データを増やす」「正則化」など。ちなみに両方大きいのは適合不足（アンダーフィッティング）。",
  },
  {
    prompt: "手元のデータが少ないとき、モデルの汎化性能をより信頼できる形で見積もる標準的な方法は？",
    choices: [
      { label: "k 分割交差検証（データを k 分割し、順に検証用にして平均する）", correct: true },
      { label: "訓練誤差をそのまま汎化性能とみなす", correct: false },
      { label: "テストデータでハイパーパラメータを何度も調整する", correct: false },
      { label: "いちばん複雑なモデルを選ぶ", correct: false },
    ],
    explain:
      "1 回の訓練／テスト分割だけだと «たまたま» の影響が大きい。k 分割交差検証は、データを k 個に分けて «1 つを検証・残りで訓練» を k 回まわし誤差を平均するので、全データを検証にも訓練にも使え、見積もりが安定する。テストデータで調整を繰り返すのは «テストへの過学習» で NG。最終評価用のデータは触らずに取っておく。",
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

/** 機械学習の枠組み 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function LearningFrameworkQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#complexity-lab"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って次数 d と点数 n を動かし、経験誤差と汎化誤差の U 字を確かめる
      </a>
    </div>
  );
}
