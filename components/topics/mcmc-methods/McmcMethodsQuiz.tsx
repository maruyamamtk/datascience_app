"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "Metropolis-Hastingsの受理確率 r=min(1, π(θ')/π(θ)) は、目標分布π(θ)の«正規化定数»(積分して1になるように割る定数)を知らなくても計算できる。なぜ？",
    choices: [
      {
        label: "受理確率は π(θ') と π(θ) の«比»でしか使われないため、両方に同じ正規化定数がかかっていても割り算の過程で約分されて消えるから",
        correct: true,
      },
      { label: "正規化定数は常に1だから", correct: false },
      { label: "Metropolis-Hastingsは正規化定数を無視してよいというだけで、本当は必要", correct: false },
      { label: "提案分布が正規分布だから正規化定数が不要になる", correct: false },
    ],
    explain:
      "π(θ)=κ(θ)/Z(κは正規化前の核, Zは正規化定数)と書くと、比 π(θ')/π(θ)=κ(θ')/κ(θ) となりZが約分されて消える。これがMCMCの核心——事後分布 π(θ|D)∝L(D|θ)π(θ) の«分母の積分»(K-1で厄介だった部分)を一切計算せずに、核 L(D|θ)π(θ) の比だけで探索できる。",
  },
  {
    prompt: "ギブスサンプリングでは、Metropolis-Hastingsと違い«棄却»という概念が存在しない。なぜ？",
    choices: [
      {
        label: "各変数を、他の変数を固定した«条件付き分布»から直接サンプリングするため——その条件付き分布は目標分布そのものなので、提案を«間違って»作ることがない",
        correct: true,
      },
      { label: "ギブスサンプリングは受理確率が常に0.5に固定されているから", correct: false },
      { label: "ギブスサンプリングはランダムウォークを使わないから乱数を全く使わない", correct: false },
      { label: "ギブスサンプリングは目標分布が一様分布のときしか使えないから", correct: false },
    ],
    explain:
      "Metropolis-Hastingsは«ランダムウォークで適当に候補を作り、目標分布とずれていたら確率的に棄却する»という間接的な方法。ギブスサンプリングは条件付き分布 X∣Y、Y∣X が解析的に求まる場合に限り、そこから直接サンプリングするため、生成された点は常に«正しい»——棄却して調整する必要がない。",
  },
  {
    prompt: "収束診断ラボで、提案分布の標準偏差σを非常に小さくすると、受理率は上がったが分割R-hatとESS(有効サンプルサイズ)はどうなった？",
    choices: [
      {
        label: "受理率は上がるが、1回の移動幅が小さすぎてチェーンがなかなか目標分布全体を探索できず、自己相関が強くなりESSはnよりずっと小さくなる(R-hatも1から離れやすくなる)",
        correct: true,
      },
      { label: "受理率が上がるので、ESSも必ず大きくなる", correct: false },
      { label: "σを変えてもR-hat・ESSは一切変化しない", correct: false },
      { label: "σを小さくすると必ずR-hatが1未満になる", correct: false },
    ],
    explain:
      "受理率と«実質的な情報量»(ESS)は別物。σが小さいと«ほぼ毎回受理»されるが、1歩の幅が小さいので隣り合うサンプルが似た値ばかりになり(強い自己相関)、n本サンプルを引いても実質的に独立な情報はずっと少ない(ESSが小さい)。σが大きすぎても逆に棄却ばかりでチェーンが動かず、同じ問題が起きる——«ちょうどよい»σを選ぶことが実務上重要。",
  },
  {
    prompt: "分割R-hat(Rハット)が1.01のように1に非常に近い値のとき、何を意味する？",
    choices: [
      {
        label: "チェーンの前半と後半で、標本の«分布の中心»がほぼ同じ——収束していることの目安になる(実務では1.01以下が目安)",
        correct: true,
      },
      { label: "受理率が101%であることを意味する", correct: false },
      { label: "目標分布の分散が1.01であることを意味する", correct: false },
      { label: "サンプル数が101個であることを意味する", correct: false },
    ],
    explain:
      "R-hatはチェーンを前半・後半の2本とみなし、«チェーン間の分散»と«チェーン内の分散»を比較する統計量。前半と後半が同じ分布から来ているなら両者はほぼ一致しR-hat≈1になる。逆に、チェーンがまだウォームアップ中で前半と後半で分布の中心がずれていると、R-hatは1から大きく離れる——«まだ収束していない»という警告信号になる。",
  },
  {
    prompt: "K-1(ベイズ統計の基礎)では共役事前分布によりBeta(6,6)の事後分布が«解析的に»求まった。本トピックでは同じBeta(6,6)を«正規化定数を知らないふり»をしてMCMCで近似した。この設計の狙いは？",
    choices: [
      {
        label: "答えを既に知っている題材でMCMCを試すことで、«MCMCが本当に正しい分布を復元できているか»をヒストグラムと理論曲線の一致で直接確認できるようにするため——共役事前分布が使えない一般のモデルでも同じ手法が通用することの土台になる",
        correct: true,
      },
      { label: "Beta分布以外の分布ではMCMCは使えないから", correct: false },
      { label: "MCMCは常に共役事前分布と組み合わせて使う必要があるから", correct: false },
      { label: "K-1の結果が間違っていたことをMCMCで検証するため", correct: false },
    ],
    explain:
      "MCMCの実務上の価値は«共役事前分布が使えない(解析的に事後分布が求まらない)一般のモデル»で発揮される。しかし最初からそういう複雑な例で学ぶと«本当に正しく近似できているか»を確かめる手段がない。既に答えを知っているBeta(6,6)で«正規化定数を使わずに»同じ答えを復元できることを確認しておくことで、答えの分からない一般のモデルでもMCMCを信頼して使える、という橋渡しになっている。",
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

/** ベイズ計算法(MCMC) 演習(確認問題 → 即時フィードバック → 操作へ戻るリンク, SPEC §4.1③)。 */
export function McmcMethodsQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#mh-stepper"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻ってMetropolis-Hastingsのステップを見直す
      </a>
    </div>
  );
}
