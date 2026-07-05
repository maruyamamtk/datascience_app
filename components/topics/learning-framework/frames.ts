/**
 * 「バイアス分散分解」ステッパーのフレーム列ビルダー（計算層・純関数・Vitest 対象）。
 *
 * 高次数（複雑な）多項式を、訓練データの «再標本»（ブートストラップ）ごとにフィットし、
 * コマ送りで 1 本ずつフィット曲線を重ねる。曲線が大きく散る＝分散が大きい。最後のコマで
 * «平均フィット» を太く描き、真の関数からのズレ＝バイアスを見せる。
 * MSE = バイアス² + 分散 の «見える化»（点推定の性質からの橋渡し）。副作用なし。描画は BiasVarianceStepper.tsx。
 */

import type { VizFrame } from "@/components/viz";
import {
  biasVarianceDecomposition,
  bootstrapIndices,
  fitPolynomial,
  makeLcg,
  predictPolynomial,
} from "@/lib/stats/learning-framework";
import {
  DENSE_TRUTH,
  DENSE_X,
  FIT_RIDGE,
  STEP_DEGREE,
  STEP_M,
  STEP_SEED,
  STEP_TRAIN,
} from "@/lib/store/learning-framework";

export type XY = { x: number; y: number };

export type BvPayload = {
  /** コマ番号 k（0 始まり）。 */
  k: number;
  /** ここまでに引いた各ブートストラップのフィット曲線（密グリッド）。 */
  drawnFits: XY[][];
  /** 真の関数の曲線。 */
  truthCurve: XY[];
  /** 最終コマだけ: 全フィットの平均曲線（= 期待予測 E[ŷ]）。 */
  meanFit: XY[] | null;
  /** 最終コマだけ: 評価点平均のバイアス²・分散。 */
  avgBias2: number | null;
  avgVariance: number | null;
  /** バイアス・分散の «まとめ» を出すコマか。 */
  showDecomp: boolean;
};

/** 各ブートストラップ標本でフィットした «密グリッド予測列» を STEP_M 本だけ先に作る。 */
function computeAllFits(): number[][] {
  const rng = makeLcg(STEP_SEED);
  const fits: number[][] = [];
  for (let m = 0; m < STEP_M; m++) {
    const idx = bootstrapIndices(STEP_TRAIN.length, rng);
    const xs = idx.map((i) => STEP_TRAIN[i].x);
    const ys = idx.map((i) => STEP_TRAIN[i].y);
    const coeffs = fitPolynomial(xs, ys, STEP_DEGREE, FIT_RIDGE);
    fits.push(DENSE_X.map((x) => predictPolynomial(coeffs, x)));
  }
  return fits;
}

/** バイアス分散ステッパーのフレーム列（フィット STEP_M 本 ＋ まとめ 1 コマ）を作る。 */
export function buildBiasVarianceFrames(): VizFrame<BvPayload>[] {
  const allFits = computeAllFits();
  const truthCurve: XY[] = DENSE_X.map((x, i) => ({ x, y: DENSE_TRUTH[i] }));
  const toXY = (pred: number[]): XY[] => DENSE_X.map((x, i) => ({ x, y: pred[i] }));

  const frames: VizFrame<BvPayload>[] = [];

  // フィットを 1 本ずつ重ねるコマ。
  for (let k = 0; k < STEP_M; k++) {
    const drawn = allFits.slice(0, k + 1);
    frames.push({
      payload: {
        k,
        drawnFits: drawn.map(toXY),
        truthCurve,
        meanFit: null,
        avgBias2: null,
        avgVariance: null,
        showDecomp: false,
      },
      highlights: ["fit"],
      callout: {
        title: `再標本 ${k + 1} / ${STEP_M} 本目のフィット（次数 ${STEP_DEGREE}）`,
        body:
          k === 0
            ? `同じ «真の関数» から取った訓練データを «復元抽出（ブートストラップ）» で少し揺らし、そのたびに次数 ${STEP_DEGREE} の複雑なモデルをフィットする。データが少し変わるだけでフィット曲線が大きく動く——これが «分散»。`
            : `2 本目以降を重ねると、複雑なモデルほどフィットが大きく散らばるのが見える。データのちょっとした違い（ノイズ）に振り回されている＝過学習の «分散» 成分。`,
        note: "同じ手続きでも訓練データが変わると予測が変わる «ばらつき» が分散。次のコマで平均フィットを描く。",
        kind: "explain",
      },
    });
  }

  // まとめのコマ: 平均フィット＋分解。
  const bv = biasVarianceDecomposition(allFits, DENSE_TRUTH);
  frames.push({
    payload: {
      k: STEP_M,
      drawnFits: allFits.map(toXY),
      truthCurve,
      meanFit: toXY(bv.meanPred),
      avgBias2: bv.avgBias2,
      avgVariance: bv.avgVariance,
      showDecomp: true,
    },
    highlights: ["mean", "decomp"],
    callout: {
      title: "平均フィット（太線）と分解: MSE ≈ バイアス² + 分散",
      body: `${STEP_M} 本の平均（太線＝期待予測 E[ŷ]）は真の関数にかなり近い＝バイアスは小さい。一方、各フィットが平均から大きく散る＝分散が大きい。複雑なモデルは «低バイアス・高分散»。逆に低次数の直線は «高バイアス・低分散»。`,
      note: `評価点平均で バイアス²≈${bv.avgBias2.toFixed(3)}、分散≈${bv.avgVariance.toFixed(3)}。汎化誤差はこの和（＋除けないノイズ）で決まる。両者の和を最小化する «ちょうどよい複雑さ» を探すのが機械学習の枠組み。`,
      kind: "supplement",
    },
  });

  return frames;
}
