/**
 * 事象と確率（B-1）トピックの計算層（純関数）。
 * 中核は**ベイズの定理**を「自然頻度」で扱う部分。操作値（有病率 prior・感度 sensitivity・
 * 特異度 specificity）から、検査結果と病気の同時確率・周辺確率・事後確率 P(D|+) を導出する。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2「計算層は純関数」）。
 * 描画・状態保持は持たない（ストア／描画層がこれを呼ぶだけ）。
 */

/** 自然頻度のグリッド総数（母集団 N 人の既定値）。1000 で低い有病率でも偽陽性が見える。 */
export const POPULATION = 1000;

/** ベイズ・ラボの操作値（ユーザーが直接いじる single source of truth）。 */
export type BayesControls = {
  /** 事前確率 P(D)＝有病率（0〜1）。 */
  prior: number;
  /** 感度 P(+|D)＝病気のとき陽性となる割合（真陽性率, 0〜1）。 */
  sensitivity: number;
  /** 特異度 P(−|¬D)＝健康のとき陰性となる割合（真陰性率, 0〜1）。 */
  specificity: number;
};

/** ベイズ・ラボの派生値（controls から純関数で再計算。直接書き換えない）。 */
export type BayesDerived = {
  /** 偽陽性率 P(+|¬D) = 1 − 特異度。 */
  fpr: number;
  /** 同時確率 P(D∩+) = 感度 × 事前。 */
  pTP: number;
  /** 同時確率 P(D∩−) = (1−感度) × 事前。 */
  pFN: number;
  /** 同時確率 P(¬D∩+) = 偽陽性率 × (1−事前)。 */
  pFP: number;
  /** 同時確率 P(¬D∩−) = 特異度 × (1−事前)。 */
  pTN: number;
  /** 周辺確率 P(+) = P(D∩+)+P(¬D∩+)（全確率の公式）。 */
  pPos: number;
  /** 周辺確率 P(−) = 1 − P(+)。 */
  pNeg: number;
  /** 事後確率 P(D|+) = P(D∩+)/P(+)（陽性的中率, PPV）。 */
  posterior: number;
  /** 陰性の人が実は病気である確率 P(D|−)（1 − 陰性的中率に対応）。 */
  posteriorGivenNeg: number;
};

/** 値を [0,1] にクランプ（確率として安全に扱う）。 */
const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

/**
 * ベイズの定理の核となる事後確率 P(D|+)。
 * P(D|+) = P(+|D)P(D) / [ P(+|D)P(D) + P(+|¬D)P(¬D) ]。
 * 分母（周辺確率 P(+)）が 0 のときは NaN（陽性が起こり得ない）。
 */
export function bayesPosterior(prior: number, sensitivity: number, fpr: number): number {
  const p = clamp01(prior);
  const tp = clamp01(sensitivity) * p;
  const fp = clamp01(fpr) * (1 - p);
  const denom = tp + fp;
  if (denom <= 0) return Number.NaN;
  return tp / denom;
}

/** 操作値から派生値を導出する純関数。ストアの `derive` に渡す唯一の計算入口。 */
export function deriveBayes({ prior, sensitivity, specificity }: BayesControls): BayesDerived {
  const p = clamp01(prior);
  const sens = clamp01(sensitivity);
  const spec = clamp01(specificity);
  const fpr = 1 - spec;

  const pTP = sens * p;
  const pFN = (1 - sens) * p;
  const pFP = fpr * (1 - p);
  const pTN = spec * (1 - p);
  const pPos = pTP + pFP;
  const pNeg = pFN + pTN;

  return {
    fpr,
    pTP,
    pFN,
    pFP,
    pTN,
    pPos,
    pNeg,
    posterior: pPos > 0 ? pTP / pPos : Number.NaN,
    posteriorGivenNeg: pNeg > 0 ? pFN / pNeg : Number.NaN,
  };
}

/** 自然頻度（母集団 N 人を整数の人数に割り付けた内訳）。 */
export type NaturalFrequencies = {
  /** 母集団総数 N。 */
  total: number;
  /** 病気の人数（≈ prior×N）。 */
  sick: number;
  /** 健康の人数（N − sick）。 */
  healthy: number;
  /** 真陽性 TP（病気かつ陽性）。 */
  tp: number;
  /** 偽陰性 FN（病気かつ陰性）。 */
  fn: number;
  /** 偽陽性 FP（健康かつ陽性）。 */
  fp: number;
  /** 真陰性 TN（健康かつ陰性）。 */
  tn: number;
  /** 陽性の総数 TP+FP。 */
  positives: number;
  /** 陰性の総数 FN+TN。 */
  negatives: number;
};

/**
 * 操作値を母集団 N 人の自然頻度（整数の人数）に変換する純関数。
 * まず病気/健康に分け、各群を検査結果でさらに分ける（四捨五入で人数化）。
 * 人数の合計は丸めの都合で N から最大数人ずれうるが、健康群の差で吸収して total は厳密に N に保つ。
 */
export function naturalFrequencies(
  controls: BayesControls,
  total = POPULATION,
): NaturalFrequencies {
  const { prior, sensitivity, specificity } = controls;
  const N = Math.max(0, Math.round(total));
  const sick = Math.round(clamp01(prior) * N);
  const healthy = N - sick;
  const tp = Math.round(clamp01(sensitivity) * sick);
  const fn = sick - tp;
  const fp = Math.round((1 - clamp01(specificity)) * healthy);
  const tn = healthy - fp;
  return {
    total: N,
    sick,
    healthy,
    tp,
    fn,
    fp,
    tn,
    positives: tp + fp,
    negatives: fn + tn,
  };
}

/**
 * 2 事象の統計的独立を判定するためのギャップ P(A∩B) − P(A)P(B)。
 * 0 なら独立、正なら正の相関、負なら負の相関。|gap| が大きいほど独立から遠い。
 */
export function independenceGap(pA: number, pB: number, pAB: number): number {
  return pAB - clamp01(pA) * clamp01(pB);
}

/** P(A∩B) = P(A)P(B) が（許容誤差内で）成り立つ ⇔ 独立。 */
export function areIndependent(pA: number, pB: number, pAB: number, tol = 1e-9): boolean {
  return Math.abs(independenceGap(pA, pB, pAB)) <= tol;
}
