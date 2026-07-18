/**
 * 「正則化パス」ステッパーのフレーム列ビルダー（計算層・純関数・Vitest 対象）。
 *
 * «候補となる説明変数が8個あるが、本当に効くのは3個だけ» という変数選択の定番設定を
 * 自前で作り、λ を小さい方から大きい方へ動かしながら Lasso を解き直して、1 ステップずつ
 * «真に無関係な変数の係数がちょうど0になる瞬間»（スパース化＝自動的な変数選択）を見せる。
 * 高次多項式どうしのような強い相関を避けた独立変数にすることで、係数の順位が入れ替わる
 * ノイズを避け、Lasso のスパース化を素直に見せる（多重共線性の影響は RegularizationLab 側で扱う）。
 * 副作用なし。描画は RegularizationPathStepper.tsx。
 */

import type { VizFrame } from "@/components/viz";
import {
  centerVector,
  makeLcg,
  pseudoGaussian,
  regularizationPath,
  standardizeColumns,
} from "@/lib/stats/regularization-sparse";
import { STEP_LAMBDA_N, STEP_LOG_LAMBDA_MAX, STEP_LOG_LAMBDA_MIN } from "@/lib/store/regularization-sparse";

/** 候補変数の数（変数1〜変数8）。 */
export const STEP_P = 8;
/** サンプル数。 */
export const STEP_N = 60;
/** 真の係数（0でないのは 変数1・変数3・変数6 だけ——残り5個は本当に無関係）。 */
export const STEP_TRUE_BETA = [2.5, 0, -1.8, 0, 0, 1.2, 0, 0];
const STEP_SEED = 31415926;
const STEP_NOISE = 0.4;

export type PathPayload = {
  /** ステップ番号（0始まり）。 */
  step: number;
  /** λ の全列（固定・対数等分）。 */
  lambdas: number[];
  /** 全ステップの係数パス（betas[s][j] = ステップ s・変数 j+1 の値）。 */
  betas: number[][];
  /** ここまでに見せたステップ数（betas の先頭何行を描くか）。 */
  revealed: number;
  /** このステップでちょうど0ではない係数の数。 */
  nonzeroCount: number;
  /** このステップで新たに0になった変数（1始まり）。 */
  zeroedNow: number[];
  /** このステップで0から動き出した変数（1始まり、通常は出ない）。 */
  revivedNow: number[];
};

/** 8変数のうち3個だけ本当に効く合成データを作り、Lasso の正則化パスを計算する。 */
function computePath(): { lambdas: number[]; betas: number[][] } {
  const rng = makeLcg(STEP_SEED);
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < STEP_N; i++) {
    const row = Array.from({ length: STEP_P }, () => rng() * 2 - 1);
    let val = 0;
    for (let j = 0; j < STEP_P; j++) val += STEP_TRUE_BETA[j] * row[j];
    X.push(row);
    y.push(val + STEP_NOISE * pseudoGaussian(rng));
  }
  const { Xs } = standardizeColumns(X);
  const { yc } = centerVector(y);
  const lambdas = Array.from(
    { length: STEP_LAMBDA_N },
    (_, i) => 10 ** (STEP_LOG_LAMBDA_MIN + ((STEP_LOG_LAMBDA_MAX - STEP_LOG_LAMBDA_MIN) * i) / (STEP_LAMBDA_N - 1)),
  );
  const betas = regularizationPath(Xs, yc, lambdas, "lasso");
  return { lambdas, betas };
}

/** 正則化パスステッパーのフレーム列（λ が増えるたびに1コマ）を作る。 */
export function buildRegularizationPathFrames(): VizFrame<PathPayload>[] {
  const { lambdas, betas } = computePath();
  const frames: VizFrame<PathPayload>[] = [];
  let prevNonzero = new Array(STEP_P).fill(false);

  for (let s = 0; s < betas.length; s++) {
    const curNonzero = betas[s].map((v) => v !== 0);
    const zeroedNow: number[] = [];
    const revivedNow: number[] = [];
    for (let j = 0; j < STEP_P; j++) {
      if (prevNonzero[j] && !curNonzero[j]) zeroedNow.push(j + 1);
      if (s > 0 && !prevNonzero[j] && curNonzero[j]) revivedNow.push(j + 1);
    }
    const nonzeroCount = curNonzero.filter(Boolean).length;

    let body: string;
    if (s === 0) {
      body = `λ=${lambdas[0].toFixed(3)}（最小）では罰則がまだ弱く、8個の変数のほぼ全部の係数が生き残っている（非ゼロ ${nonzeroCount}/8）。`;
    } else if (zeroedNow.length > 0) {
      body = `λ を ${lambdas[s].toFixed(3)} へ増やすと、変数${zeroedNow.join(", ")} の係数が «ちょうど0» になった——Lasso が «この変数は使わない» と自動的に決めた瞬間。非ゼロ ${nonzeroCount}/8。`;
    } else if (revivedNow.length > 0) {
      body = `λ=${lambdas[s].toFixed(3)}: 変数${revivedNow.join(", ")} の係数が0から動き出した。非ゼロ ${nonzeroCount}/8。`;
    } else {
      body = `λ=${lambdas[s].toFixed(3)}。非ゼロ係数は ${nonzeroCount}/8 のまま（生き残った係数の値はさらに縮小し続けている）。`;
    }

    const isLast = s === betas.length - 1;
    frames.push({
      payload: { step: s, lambdas, betas, revealed: s + 1, nonzeroCount, zeroedNow, revivedNow },
      highlights: zeroedNow.length > 0 ? ["zeroed"] : revivedNow.length > 0 ? ["revived"] : [],
      callout: {
        title: `ステップ ${s + 1}/${betas.length}: λ=${lambdas[s].toFixed(3)}, 非ゼロ ${nonzeroCount}/8`,
        body,
        note: isLast
          ? "真に効く変数1・3・6（真の係数 2.5, −1.8, 1.2）が最後まで残り、無関係な5個（真の係数0）は途中で脱落した——これがLassoの«自動的な変数選択»。実務では«ちょうどよいλ»を交差検証で選ぶ（機械学習の枠組みへ）。"
          : undefined,
        kind: isLast ? "supplement" : "explain",
      },
    });

    prevNonzero = curNonzero;
  }

  return frames;
}
