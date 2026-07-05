"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "8 bit で区別できる «状態の数» はいくつ？",
    choices: [
      { label: "2⁸ = 256 通り", correct: true },
      { label: "8 通り", correct: false },
      { label: "8² = 64 通り", correct: false },
      { label: "無限（連続値）", correct: false },
    ],
    explain:
      "1 bit は «0 か 1» の 2 通り。bit を 1 増やすと区別できる状態が 2 倍になるので、n bit では 2ⁿ 通り。8 bit = 1 byte で 2⁸=256 通り（0〜255 の整数や、256 段階の色の濃さなど）。bit は «情報を区別する単位»。",
  },
  {
    prompt: "«1 キロバイト» が文脈で 1000 バイトだったり 1024 バイトだったりするのはなぜ？",
    choices: [
      { label: "10 進の kilo=10³=1000 と、2 進の kibi=2¹⁰=1024 が混用されるから", correct: true },
      { label: "バイトの定義が国ごとに違うから", correct: false },
      { label: "誤差でたまたまズレるだけで本来は同じ", correct: false },
      { label: "圧縮の有無で変わるから", correct: false },
    ],
    explain:
      "コンピュータは 2 進なので «キリのいい» 単位も 2 の冪（2¹⁰=1024）になりがち。一方 SI 接頭語は kilo=1000。両者を区別するため 2 進側は kibi(KiB)/mebi(MiB)… と呼ぶ。ズレは接頭語が大きいほど開き、テラ級では約 10%（1TB≈0.909TiB）。ディスク容量表示の «見かけより少ない» 問題の正体。",
  },
  {
    prompt: "アナログ信号を標本化（サンプリング）するとき、標本化定理が要求する条件は？",
    choices: [
      { label: "サンプリング周波数 fs を «最高周波数 f_max の 2 倍以上» にする", correct: true },
      { label: "fs を f_max と «同じ» にする", correct: false },
      { label: "fs を «大きくすればするほど» 必ず良く、下限はない", correct: false },
      { label: "量子化ビット数を増やせば fs は何でもよい", correct: false },
    ],
    explain:
      "ナイキスト・シャノンの標本化定理：原信号に含まれる最高周波数 f_max の 2 倍以上（fs ≥ 2·f_max）で標本化すれば、元の波形を復元できる。下回ると標本点が波を追い切れず、別の低い周波数に化ける «エイリアシング（折り返し）» が起きる。ビット数（量子化）は縦方向の話で、この横方向の条件とは別。",
  },
  {
    prompt: "量子化のビット数 n を 1 増やすと、量子化の SN 比（信号対雑音比）はおよそどうなる？",
    choices: [
      { label: "約 6 dB 改善する（≈6.02n+1.76 dB）", correct: true },
      { label: "約 2 dB 改善する", correct: false },
      { label: "変わらない（bit 数と SN 比は無関係）", correct: false },
      { label: "半分に悪化する", correct: false },
    ],
    explain:
      "1 bit 増やすと段階数 2ⁿ が 2 倍になり、量子化 1 段の幅 Δ が半分＝量子化誤差が半分になる。振幅で半分は約 6 dB なので、SN 比 ≈ 6.02n+1.76 dB の «1 bit ≈ 6 dB» 則。CD の 16 bit は約 98 dB。精度を上げるほどデータ量（bit 数）も増えるトレードオフ。",
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

/** デジタル情報の基礎 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function DigitalInformationBasicsQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#adc-lab"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って fs（標本化）と n bit（量子化）を動かし、横と縦の «粗さ» を確かめる
      </a>
    </div>
  );
}
