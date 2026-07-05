/**
 * 「10 進数を 2 で割り続けて 2 進数に変換する」ステッパーのフレーム列ビルダー（計算層・純関数）。
 * 各コマで «2 で割った商と余り» を 1 行ずつ明かし、余りを下から読むと 2 進表記になる様子を
 * 見せる（アルゴリズム図鑑スタイル）。副作用なし（Vitest 対象）。描画は BinaryConversionStepper.tsx。
 */

import type { VizFrame } from "@/components/viz";
import { decimalToBinary, decimalToBinarySteps, type DivStep } from "@/lib/stats/digital-information-basics";

/** 変換する 10 進数（13 = 1101₂）。 */
export const STEP_N = 13;
/** 完成する 2 進表記。 */
export const STEP_BINARY = decimalToBinary(STEP_N);

export type BinaryPayload = {
  /** コマ番号 k（0 始まり）＝いま明かした割り算の行。 */
  k: number;
  /** 割り算の全行（表の描画に使う）。 */
  steps: DivStep[];
  /** 明かした行数（k+1）。 */
  revealed: number;
  /** ここまでに明かした余りを «下から» 読んだ 2 進文字列（最終的に STEP_BINARY へ）。 */
  binarySoFar: string;
  /** 変換元の 10 進数。 */
  n: number;
};

/** 2 進数変換ステッパーのフレーム列を作る。 */
export function buildBinaryFrames(): VizFrame<BinaryPayload>[] {
  const steps = decimalToBinarySteps(STEP_N);

  return steps.map((row, k) => {
    const isLast = k === steps.length - 1;
    const revealed = k + 1;
    // 明かした行 0..k の余りを «下から»（k→0）読むと、その時点の 2 進文字列。
    const binarySoFar = steps
      .slice(0, revealed)
      .map((s) => s.remainder)
      .reverse()
      .join("");
    return {
      payload: { k, steps, revealed, binarySoFar, n: STEP_N },
      highlights: isLast ? ["row", "result"] : ["row"],
      callout: {
        title: `${row.dividend} ÷ 2 = ${row.quotient} 余り ${row.remainder}`,
        body: isLast
          ? `商が 0 になったので終了。余りを «下から上へ» 読むと ${STEP_BINARY}。つまり ${STEP_N}₁₀ = ${STEP_BINARY}₂。各桁は下から 1・2・4・8… の重み（2 の冪）を表す。`
          : `${row.dividend} を 2 で割ると商 ${row.quotient}、余り ${row.remainder}。この余りが 2 進表記の «この桁» のビット。商 ${row.quotient} を次に同じように割っていく。`,
        note: isLast
          ? `検算: ${STEP_BINARY}₂ = ${STEP_BINARY.split("")
              .map((b, i) => `${b}·${2 ** (STEP_BINARY.length - 1 - i)}`)
              .join(" + ")} = ${STEP_N}。n 桁の 2 進数で 0〜2ⁿ−1 の整数を表せる。`
          : "余りは «その桁が 1 か 0 か»。2 で割った余りは必ず 0 か 1 なので、2 進数の桁が 1 つずつ決まる。",
        kind: isLast ? "supplement" : "explain",
      },
    };
  });
}
