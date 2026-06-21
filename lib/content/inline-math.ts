/**
 * 用語の定義文に含まれるインライン数式 `$...$` を分割する純関数（計算層）。
 * ポップオーバー描画（Term）で、テキスト断片と数式断片を分けて扱うために使う。
 * KaTeX 描画（副作用）は描画層に置き、ここは分割だけを担う。
 */

export type InlineSegment = { type: "text"; value: string } | { type: "math"; value: string };

/**
 * `$...$` で囲まれた区間を math、その他を text として順に返す。
 * - `\$` はリテラルのドル記号として text 扱い（数式の開始にしない）。
 * - 閉じられない `$` は text として扱う（壊さない）。
 */
export function splitInlineMath(input: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  let buffer = "";
  let i = 0;

  const flushText = () => {
    if (buffer.length > 0) {
      segments.push({ type: "text", value: buffer });
      buffer = "";
    }
  };

  while (i < input.length) {
    const ch = input[i];

    if (ch === "\\" && input[i + 1] === "$") {
      buffer += "$";
      i += 2;
      continue;
    }

    if (ch === "$") {
      // 次の（エスケープされていない）"$" を探す。
      let j = i + 1;
      while (j < input.length) {
        if (input[j] === "\\" && input[j + 1] === "$") {
          j += 2;
          continue;
        }
        if (input[j] === "$") break;
        j += 1;
      }
      if (j < input.length && input[j] === "$") {
        flushText();
        const math = input.slice(i + 1, j).replace(/\\\$/g, "$");
        segments.push({ type: "math", value: math });
        i = j + 1;
        continue;
      }
      // 閉じが無い → リテラルとして扱う。
      buffer += ch;
      i += 1;
      continue;
    }

    buffer += ch;
    i += 1;
  }

  flushText();
  return segments;
}
