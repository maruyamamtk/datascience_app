/**
 * 分かち書きステッパー（前方最長一致法を1文字位置ずつ辿るコマ送り）のフレーム列ビルダー
 * （計算層・純関数）。日本語の短い例文を左から走査し、各位置で «辞書に前方一致する候補のうち
 * 最も長いもの» を貪欲に選ぶ様子を1ステップずつ見せる（アルゴリズム図鑑スタイル）。
 * 副作用なし（Vitest 対象）。描画は MorphSegmentStepper.tsx が購読する。
 */

import type { VizFrame } from "@/components/viz";
import { JA_DICTIONARY, candidatesAt } from "@/lib/stats/text-analysis";

export type MorphPayload = {
  /** 文中の走査開始位置（文字index）。 */
  position: number;
  /** その位置から前方一致した辞書項目（長い順）。 */
  candidates: string[];
  /** 貪欲に選ばれたトークン。 */
  chosen: string;
  /** ここまでに確定したトークン列。 */
  tokensSoFar: string[];
};

/**
 * 例文 sentence を辞書 dictionary で前方最長一致法で走査し、1トークン確定ごとに1フレームを作る。
 */
export function buildMorphFrames(sentence: string, dictionary: readonly string[] = JA_DICTIONARY): VizFrame<MorphPayload>[] {
  const frames: VizFrame<MorphPayload>[] = [];
  const tokensSoFar: string[] = [];
  let i = 0;
  while (i < sentence.length) {
    const candidates = candidatesAt(sentence, i, dictionary);
    const chosen = candidates[0] ?? sentence[i];
    tokensSoFar.push(chosen);

    const isUnknown = candidates.length === 0;
    frames.push({
      payload: { position: i, candidates, chosen, tokensSoFar: [...tokensSoFar] },
      highlights: [`morph-pos-${i}`],
      callout: isUnknown
        ? {
            title: `位置${i}: 辞書に一致なし`,
            body: `"${sentence[i]}" は辞書に無いので、1文字だけを未知語として切り出す。`,
            note: "実際の形態素解析器（MeCab等）は巨大な辞書と統計モデルを持つため未知語はまれだが、原理としては同じ«前方から一致を探す»操作を行う。",
            kind: "supplement",
          }
        : {
            title: `位置${i}: 候補 ${candidates.map((c) => `「${c}」`).join("・")} から最長一致を選ぶ`,
            body: `${candidates.length > 1 ? `${candidates.length}個の候補のうち最も長い` : "唯一の候補"}「${chosen}」（${chosen.length}文字）を選ぶ。ここまでの分かち書き: ${tokensSoFar.join(" / ")}`,
            note:
              candidates.length > 1
                ? "前方最長一致法（貪欲法）: その位置から始まる辞書項目のうち、最も長いものを機械的に選ぶ——文の意味は見ていない。"
                : undefined,
          },
    });
    i += chosen.length;
  }
  return frames;
}
