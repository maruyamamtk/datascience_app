"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "Sobelフィルタで縦方向の明暗差（縦エッジ）を検出するとき、フィルタの窓が輝度の一様な領域（境界を含まない）に重なるとどうなる？",
    choices: [
      { label: "出力はほぼ0になる（明暗の«変化»が無いため）", correct: true },
      { label: "出力は入力の平均値になる", correct: false },
      { label: "出力は常に255になる", correct: false },
      { label: "計算エラーになる", correct: false },
    ],
    explain:
      "Sobelフィルタの重み（左が負・右が正）は«左右の輝度差»を検出する配置。窓の中身が一様（左右で値が同じ）なら、要素積の総和は正負が打ち消し合ってほぼ0になる。境界（エッジ）が窓の中に入って初めて大きな値が出る。",
  },
  {
    prompt: "エッジの«強さ»を縦・横どちらの向きでも取りこぼさず検出するために、Sobel Gx・Gyをどう組み合わせる？",
    choices: [
      { label: "勾配強度 G=√(Gx²+Gy²)（三平方の定理と同じ形で合成する）", correct: true },
      { label: "GxとGyを単純に足し算する", correct: false },
      { label: "Gxだけを使い、Gyは無視する", correct: false },
      { label: "GxとGyの大きい方を採用し、小さい方は捨てる", correct: false },
    ],
    explain:
      "Gx・Gyはそれぞれ縦・横という直交する2方向の変化しか捉えない。斜めのエッジも含めて«どの向きのエッジでも»強さを検出するには、2つを直交する成分とみなして三平方の定理と同じ形（√(Gx²+Gy²)）で合成する。",
  },
  {
    prompt: "画像の二値化（閾値処理）が、Sobelエッジ検出のような«フィルタのスライド»と根本的に違う点は？",
    choices: [
      { label: "近傍のピクセルを一切見ず、各画素の値を単独で閾値と比較するだけ", correct: true },
      { label: "必ずカラー画像にしか使えない", correct: false },
      { label: "出力サイズが必ず元画像より大きくなる", correct: false },
      { label: "学習可能な重みを持つ", correct: false },
    ],
    explain:
      "二値化は各画素 x を独立に「x≥tなら1、x<tなら0」と判定するだけの最も単純な画像処理——畳み込みのように周囲のピクセルを«窓»として参照しない点がエッジ検出・ぼかしフィルタと根本的に異なる。",
  },
  {
    prompt: "ソフトマックス関数がロジット（生スコア）に指数関数 e^z を使う理由として最も適切なのは？",
    choices: [
      { label: "負のロジットも含めて全て正の値にでき、かつ大小関係（順位）を保ったまま差を強調できる", correct: true },
      { label: "計算を速くするため", correct: false },
      { label: "ロジットを整数に丸めるため", correct: false },
      { label: "画像のピクセル数を減らすため", correct: false },
    ],
    explain:
      "確率は非負でなければならないが、ロジットは負の値も取りうる。指数関数 e^z は常に正で単調増加なので、大小関係（どのクラスが有力か）を保ったまま全て正の値に変換できる——その後に総和で割れば«総和1»の確率分布になる。",
  },
  {
    prompt: "ソフトマックスの出力で、あるクラスのロジットだけを大きくすると他のクラスの確率はどうなる？",
    choices: [
      { label: "総和が常に1に保たれるため、他のクラスの確率は相対的に下がる", correct: true },
      { label: "他のクラスの確率は変化しない", correct: false },
      { label: "他のクラスの確率も同じだけ増える", correct: false },
      { label: "他のクラスの確率が0を下回ることがある", correct: false },
    ],
    explain:
      "ソフトマックスは全クラスの確率の総和が常に1になるよう正規化するため、1つのクラスの確率が増えると他のクラスの確率は（総和1を保つために）相対的に下がる——確率は«競合»する。",
  },
  {
    prompt: "IoU（Intersection over Union）の値が0.9のとき、2つのボックスの関係として正しいのは？",
    choices: [
      { label: "共通部分の面積が和集合の面積の90%を占めており、かなり良く重なっている", correct: true },
      { label: "2つのボックスは全く重なっていない", correct: false },
      { label: "一方のボックスの面積が他方の0.9倍という意味", correct: false },
      { label: "ボックスの中心座標の距離が0.9という意味", correct: false },
    ],
    explain:
      "IoU=共通部分の面積÷和集合の面積。0（重なりなし）〜1（完全一致）の比率で«重なり具合»を表す。0.9は非常に高い重なり——物体検出では通常、正解ボックスとのIoUがしきい値（例0.5）以上なら正しく検出できたとみなす。",
  },
  {
    prompt: "NMS（非最大値抑制）が候補ボックスを間引く基準は？",
    choices: [
      { label: "スコアが最も高い候補を採用し、それとIoUがしきい値以上重なる候補を«同じ物体の重複»とみなして除去する", correct: true },
      { label: "画像の中心に近い候補だけを残す", correct: false },
      { label: "ボックスの面積が最も小さい候補だけを残す", correct: false },
      { label: "ランダムに半分の候補を捨てる", correct: false },
    ],
    explain:
      "物体検出モデルは同じ物体に複数の重複したボックスを出力しがち。NMSはスコア降順に候補を確定させ、確定した候補と大きく重なる（IoUが高い）候補を«重複»とみなして取り除くことを繰り返し、1つの物体につき1つのボックスだけを残す。",
  },
  {
    prompt: "アンカーボックスを、面積の目安«スケール»と«縦横比»の組から w=scale√ratio, h=scale/√ratio という式で決める理由は？",
    choices: [
      { label: "w·h=scale²（面積の目安）かつ w/h=ratio（縦横比）という2つの条件を連立方程式として解いた結果だから", correct: true },
      { label: "計算を省略するための近似式だから", correct: false },
      { label: "wとhを毎回ランダムに決めているだけだから", correct: false },
      { label: "画像のピクセル数と無関係に決まる定数だから", correct: false },
    ],
    explain:
      "「面積がscale²程度」「縦横比がratio（w/h）」という2つの手がかりから幅・高さを求めるには、w·h=scale²とw/h=ratioの連立方程式を解けばよい。ratio=w/hをw·h=scale²に代入すると w²/ratio=scale² となり、w=scale√ratio、続けてh=scale/√ratioが導ける。",
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
        <div
          className={`rounded-lg p-3 text-sm leading-relaxed ${isCorrect ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900"}`}
          role="status"
        >
          <span className="font-semibold">{isCorrect ? "正解！ " : "もう一度考えてみよう。 "}</span>
          {q.explain}
        </div>
      ) : null}
    </div>
  );
}

/** 画像解析（Q-4）演習（確認問題 → 即時フィードバック）。8個のキーワードを一通り確認する。 */
export function ImageAnalysisQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
    </div>
  );
}
