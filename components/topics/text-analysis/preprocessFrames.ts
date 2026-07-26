/**
 * 前処理ステッパー（トークン化→ストップワード除去→ステミングのコマ送り）のフレーム列ビルダー
 * （計算層・純関数）。英語の短い例文1文を、①トークン化 ②各トークンがストップワードか
 * ③残った各トークンをステミングでどう縮めるか、の順に1つずつ見せる（アルゴリズム図鑑スタイル）。
 * 副作用なし（Vitest 対象）。描画は PreprocessStepper.tsx が購読する。
 */

import type { VizFrame } from "@/components/viz";
import { EN_STOP_WORDS, stem, tokenize } from "@/lib/stats/text-analysis";

export type PreprocessPhase = "tokenize" | "stopword" | "stem";

export type PreprocessPayload = {
  phase: PreprocessPhase;
  /** ハイライトするトークンの index（tokenize フェーズでは -1）。 */
  tokenIndex: number;
  token?: string;
};

export function buildPreprocessFrames(sentence: string): VizFrame<PreprocessPayload>[] {
  const tokens = tokenize(sentence);
  const stopSet = new Set(EN_STOP_WORDS);
  const frames: VizFrame<PreprocessPayload>[] = [];

  frames.push({
    payload: { phase: "tokenize", tokenIndex: -1 },
    highlights: tokens.map((_, i) => `pp-token-${i}`),
    callout: {
      title: "① トークン化",
      body: `文を小文字化し、アルファベット以外（スペース・カンマ等）で区切って ${tokens.length} 個のトークンに分ける: [${tokens.join(", ")}]`,
      note: "英語は単語間にスペースがあるので単純な分割でよいが、日本語のようにスペースが無い言語ではこの段階で辞書や統計モデルを使った分かち書き（形態素解析）が必要になる。",
    },
  });

  const survivors: string[] = [];
  tokens.forEach((token, i) => {
    const isStop = stopSet.has(token);
    if (!isStop) survivors.push(token);
    frames.push({
      payload: { phase: "stopword", tokenIndex: i, token },
      highlights: [`pp-token-${i}`],
      callout: {
        title: isStop ? `②「${token}」はストップワード → 除去` : `②「${token}」は内容語 → 残す`,
        body: isStop
          ? `「${token}」は出現頻度が高すぎて内容の識別に寄与しない機能語（ストップワード）なので取り除く。`
          : `「${token}」は文書の内容を特徴づける語（内容語）なので残す。`,
        kind: isStop ? "supplement" : "explain",
      },
    });
  });

  survivors.forEach((token, i) => {
    const stemmed = stem(token);
    frames.push({
      payload: { phase: "stem", tokenIndex: i, token },
      highlights: [`pp-surv-${i}`],
      callout: {
        title: stemmed === token ? `③「${token}」は語尾変化なし` : `③「${token}」→「${stemmed}」に切り詰め`,
        body:
          stemmed === token
            ? `語尾のパターン（-ing, -ed, -s 等）に一致しないので変化させない。`
            : `語尾のパターンに一致する接尾辞を機械的に切り落として「${stemmed}」にする（見出し語化と違い辞書は引かない）。`,
      },
    });
  });

  return frames;
}
