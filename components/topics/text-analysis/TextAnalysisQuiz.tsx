"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "前方最長一致法による分かち書きで、辞書に「データ」「サイエンス」「データサイエンス」がすべて登録されている場合、貪欲法はどれを選ぶ？",
    choices: [
      { label: "その位置から始まる最も長い一致「データサイエンス」", correct: true },
      { label: "辞書に登録された順で最初に見つかったもの", correct: false },
      { label: "最も短い一致「データ」", correct: false },
      { label: "常にランダムに選ぶ", correct: false },
    ],
    explain:
      "前方最長一致法は、その位置から前方一致する辞書項目のうち«最も長いもの»を機械的に選ぶ。意味は見ずに文字列としての長さだけで判断する単純なルール。",
  },
  {
    prompt: "ステミング（例: programming→programm）が見出し語化（lemmatization）と違う点は？",
    choices: [
      { label: "辞書を引かず接尾辞を機械的に切り落とすだけなので、実在しない語幹になることがある", correct: true },
      { label: "常に文法的に正しい単語に変換する", correct: false },
      { label: "計算に品詞情報が必須", correct: false },
      { label: "英語以外の言語には使えない", correct: false },
    ],
    explain:
      "ステミングは語尾のパターン（-ing, -ed, -s等）を機械的に切り落とすだけなので高速だが、programming→programmのように辞書に無い語幹を生むことがある。見出し語化は辞書・文法情報を使い、常に実在する基本形（lemma）を返す。",
  },
  {
    prompt: "ストップワードを除去する主な目的は？",
    choices: [
      { label: "出現頻度が高すぎて内容の識別に寄与しない機能語を取り除き、内容語を際立たせる", correct: true },
      { label: "文の意味を完全に変える", correct: false },
      { label: "文書の長さを揃える", correct: false },
      { label: "誤字を修正する", correct: false },
    ],
    explain:
      "「is」「the」「and」のような機能語はほぼ全ての文書に現れ、その文書«らしさ»の識別にはほとんど寄与しない。取り除くことで、tf-idfや共起などの後段の処理が内容語に集中できる。",
  },
  {
    prompt: "tf-idfで、tfが同じ2つの語のうち、idfが大きい方（他の文書に出にくい方）はどうなる？",
    choices: [
      { label: "tf-idf値が大きくなり、その文書により«特徴的な語»として重み付けされる", correct: true },
      { label: "tf-idf値は変わらない", correct: false },
      { label: "tf-idf値は必ず0になる", correct: false },
      { label: "idfは常にtfより小さいので影響しない", correct: false },
    ],
    explain:
      "tf-idf = tf × idf。idf = ln(文書総数/その語を含む文書数) は、珍しい語ほど大きくなる。tfが同じでも、他の文書に出にくい（df が小さい）語の方がtf-idfが大きくなり、«その文書らしさ»を表す語として浮かび上がる。",
  },
  {
    prompt: "n-gram言語モデルが「文全体の同時確率」を近似する際の考え方は？",
    choices: [
      { label: "連鎖律 P(w₁…wₙ)=∏P(wᵢ|履歴) の«履歴»を直前n-1語だけに限定する", correct: true },
      { label: "各単語の確率を独立にかけ合わせるだけで文脈は一切見ない", correct: false },
      { label: "文中の全単語の頻度の平均を取る", correct: false },
      { label: "文法規則から確率を直接計算する", correct: false },
    ],
    explain:
      "確率の連鎖律により P(w₁…wₙ)=∏P(wᵢ|w₁…wᵢ₋₁) が厳密に成り立つが、履歴が長いと組み合わせが爆発する。n-gramモデルは«直前n-1語だけで十分»というマルコフ的な近似を置くことで、コーパスの出現回数から実用的に計算できるようにする。",
  },
  {
    prompt: "n-gramの条件付き確率にラプラス（加算）スムージングを使う理由は？",
    choices: [
      { label: "コーパスに一度も出ない組み合わせの確率が0になるのを防ぐため", correct: true },
      { label: "計算を高速化するため", correct: false },
      { label: "語彙数を減らすため", correct: false },
      { label: "文書の長さを揃えるため", correct: false },
    ],
    explain:
      "count(c,w)/count(c) だけだと、コーパスに一度も出現しない組み合わせは確率0になり、文全体の確率も0になってしまう。分子分母に+α・+αVを加えることで、未知の組み合わせにも小さな確率を残す。",
  },
  {
    prompt: "共起ネットワークで、2つの語を結ぶ辺の太さが表しているのは何？",
    choices: [
      { label: "定めた窓幅以内で両方の語が一緒に出現した回数", correct: true },
      { label: "2つの語のアルファベット順の距離", correct: false },
      { label: "2つの語の品詞が同じかどうか", correct: false },
      { label: "文書全体での出現回数の合計", correct: false },
    ],
    explain:
      "共起ネットワークは«一緒に使われる語»どうしを辺で結ぶグラフ。辺の太さ（重み）は、指定した窓幅（前後何語以内か）の範囲内で両語が共に出現した回数を表す。",
  },
  {
    prompt: "共起カウントに基づく単語埋め込み（このラボの簡易版）の考え方の土台は？",
    choices: [
      { label: "分布仮説: 似た文脈（周囲の語）に現れる語は意味も似ている", correct: true },
      { label: "アルファベット順に近い語は意味も近い", correct: false },
      { label: "文字数が同じ語は意味も近い", correct: false },
      { label: "常にニューラルネットの学習が必須", correct: false },
    ],
    explain:
      "「意味の近い語は似た文脈に現れる」という分布仮説に基づき、各語の周囲に現れる語の共起カウントをそのままベクトル（簡易的な埋め込み）として使う。word2vec等のニューラルな埋め込みは、これと同じ仮説をもとに重み（埋め込み層のパラメータ）を学習で獲得する。",
  },
  {
    prompt: "ベクトル空間モデルで文書とクエリの«近さ»を測るのに使う指標は？",
    choices: [
      { label: "コサイン類似度（2つのベクトルの向きの近さ）", correct: true },
      { label: "文書の文字数の差", correct: false },
      { label: "共通する句読点の数", correct: false },
      { label: "アルファベット順の距離", correct: false },
    ],
    explain:
      "ベクトル空間モデルは、文書もクエリもtf-idf等のベクトルとして表現し、コサイン類似度 a·b/(‖a‖‖b‖) が高い文書ほど«クエリに近い（関連度が高い）»とみなして順位付けする。",
  },
  {
    prompt: "このラボの簡易トピックモデルがしていることは？",
    choices: [
      { label: "文書のtf-idfベクトルを、コサイン類似度に基づいて少数のクラスタ（トピック）へ反復的に振り分ける", correct: true },
      { label: "本格的なLDAのギブスサンプリングをそのまま実行する", correct: false },
      { label: "文書を人手でラベル付けする", correct: false },
      { label: "各文書の文字数でグループ分けする", correct: false },
    ],
    explain:
      "本物のLDA（潜在ディリクレ配分法）はギブスサンプリング等で単語ごとのトピック分布を確率的に推定する重い計算だが、ここでは«文書ベクトルを最も近い中心へ割り当て→中心を更新»を繰り返す単純なクラスタリングで、«似た文書が同じトピックにまとまる»という直感だけを示している。",
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

/** テキスト解析 演習（確認問題 → 即時フィードバック）。10個のキーワードを一通り確認する。 */
export function TextAnalysisQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
    </div>
  );
}
