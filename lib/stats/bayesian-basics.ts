/**
 * ベイズ統計の基礎(K-1)の計算層(純関数・副作用なし・Vitest対象)。
 *
 * 扱う道具(SPEC §3 K-1「事前分布、共役事前分布、事後分布、ベイズ的仮説検定、
 * ベイズファクター、ベイズ判別」出典: 『Pythonでスラスラわかるベイズ推論「超」入門』第3章):
 *
 * - ベイズの定理: 事後分布 ∝ 尤度 × 事前分布(第3章の核心)。
 * - ベータ-二項共役: コイン投げで表が出る確率θにベータ事前分布を置き、観測(表/裏)のたびに
 *   パラメータが単純な足し算(α+=成功数, β+=失敗数)で更新される様子(共役事前分布の仕組み)。
 * - ベイズファクター: 点仮説H0(θ=θ0)と複合仮説H1(θ~Beta(α,β))の周辺尤度比。
 *   頻度論のp値との対比(ベイズ的仮説検定)。
 * - ベイズ判別: 事後確率 P(class|x) が最大のクラスを選ぶ分類(ナイーブベイズ(I-4)の骨格を
 *   1特徴量・連続値に一般化したもの)。
 *
 * 前提関係(CLAUDE.md「前提関係を明示」・重複回避):
 * - [事象と確率](probability-basics)のベイズの定理(離散事象 P(D)/P(D|E))をそのまま連続パラメータθの
 *   密度に拡張する。ベータ分布のPDF・lnΓは[連続型分布](continuous.ts)のbetaPdf/lnGammaを再利用する。
 * - 二項係数を使うPMFは[確率分布と母関数](mass-functions.ts)のbinomialPmfを再利用する。
 * - ガウス密度は[単純ベイズ・近傍](naive-bayes-knn.ts)のgaussianPdfを再利用する(ベイズ判別Labで使用)。
 *
 * データセットは乱数生成ではなく**固定の小さな具体例**(コイン投げ10回)を直接書き下す
 * (CLAUDE.md「まず小さな具体例で原理を見せる」。乱数を使わないためLCGも不要でSSR/CSRの
 * ハイドレーション不一致の心配自体が生じない)。
 */

import { betaPdf, lnGamma } from "./continuous";
import { gaussianPdf } from "./naive-bayes-knn";
import { binomialPmf } from "./mass-functions";

// ────────────────────────────────────────────────────────────
// ベータ分布(共役事前分布)の基本量
// ────────────────────────────────────────────────────────────

export type BetaParams = { alpha: number; beta: number };

/** ベータ分布 Beta(α,β) の平均 α/(α+β)。 */
export function betaMean({ alpha, beta }: BetaParams): number {
  return alpha / (alpha + beta);
}

/** ベータ分布 Beta(α,β) の分散 αβ/((α+β)²(α+β+1))。 */
export function betaVariance({ alpha, beta }: BetaParams): number {
  const s = alpha + beta;
  return (alpha * beta) / (s * s * (s + 1));
}

/**
 * ベータ分布の最頻値(モード)。α>1かつβ>1なら(α−1)/(α+β−2)、
 * α≤1かつβ>1なら0、α>1かつβ≤1なら1に張り付く。α≤1かつβ≤1(一様/U字型)は一意でないためNaN。
 */
export function betaMode({ alpha, beta }: BetaParams): number {
  if (alpha > 1 && beta > 1) return (alpha - 1) / (alpha + beta - 2);
  if (alpha <= 1 && beta > 1) return 0;
  if (alpha > 1 && beta <= 1) return 1;
  return Number.NaN;
}

/** ベータ分布の密度を[eps, 1−eps]でn点サンプルした曲線(境界の発散を避けて描画に使う)。 */
export function betaPdfCurve(
  p: BetaParams,
  n = 121,
  eps = 0.002,
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const x = eps + (i / (n - 1)) * (1 - 2 * eps);
    points.push({ x, y: betaPdf(x, p.alpha, p.beta) });
  }
  return points;
}

// ────────────────────────────────────────────────────────────
// 固定の小さな具体例: コイン投げ10回(表=1, 裏=0)
// ────────────────────────────────────────────────────────────

/**
 * 決定的な固定データ(コイン投げ10回、表=1裏=0)。最初の3投は表が続き
 * (見かけ上「表が出やすい」と誤解しやすい)、最終的には5勝5敗(真の確率0.5に近い想定)に落ち着く
 * ——事前分布が早すぎる過剰解釈に対する「歯止め」になり、データが増えるほど尤度の影響が
 * 強まる(Bookmemo第3章「試行回数の影響」)ことを体感できるよう選んだ具体例。
 */
export const COIN_SEQUENCE: readonly (0 | 1)[] = [1, 1, 1, 0, 1, 0, 0, 1, 0, 0];

export const DEFAULT_PRIOR: BetaParams = { alpha: 1, beta: 1 };

/** 観測(成功数・失敗数)でベータ事前分布を更新する(共役事前分布の中核: α←α+成功数, β←β+失敗数)。 */
export function updateBetaWithCounts(
  prior: BetaParams,
  successes: number,
  failures: number,
): BetaParams {
  return { alpha: prior.alpha + successes, beta: prior.beta + failures };
}

/** シンメトリックなベータ事前分布 Beta(w,w)(w=1で無情報、wが大きいほど「五分五分」への確信が強い)。 */
export function symmetricBetaPrior(weight: number): BetaParams {
  return { alpha: weight, beta: weight };
}

export type UpdateStep = {
  /** 0=事前分布のみ(データ未観測)、1..n=i番目までの観測を反映。 */
  index: number;
  /** このステップで新たに観測した値(indexが0のときはnull)。 */
  observation: 0 | 1 | null;
  successesSoFar: number;
  failuresSoFar: number;
  posterior: BetaParams;
};

/**
 * データを1つずつ観測するたびに事前分布→事後分布が更新されていく過程を計算する
 * (ベイズ推論の核心的な可視化に使う中間結果を全ステップぶん返す)。
 * 戻り値の長さは observations.length + 1(先頭が「事前分布のみ」の状態)。
 */
export function sequentialUpdates(
  prior: BetaParams,
  observations: readonly (0 | 1)[],
): UpdateStep[] {
  const steps: UpdateStep[] = [
    { index: 0, observation: null, successesSoFar: 0, failuresSoFar: 0, posterior: prior },
  ];
  let successes = 0;
  let failures = 0;
  observations.forEach((obs, i) => {
    if (obs === 1) successes += 1;
    else failures += 1;
    steps.push({
      index: i + 1,
      observation: obs,
      successesSoFar: successes,
      failuresSoFar: failures,
      posterior: updateBetaWithCounts(prior, successes, failures),
    });
  });
  return steps;
}

/** 与えた事前分布(重みw)のもとで、観測を1つずつ反映した事後平均の推移(n=0..observations.length)。 */
export function posteriorMeanTrajectory(
  priorWeight: number,
  observations: readonly (0 | 1)[],
): number[] {
  return sequentialUpdates(symmetricBetaPrior(priorWeight), observations).map((s) =>
    betaMean(s.posterior),
  );
}

// ────────────────────────────────────────────────────────────
// ベイズファクター・ベイズ的仮説検定(頻度論のp値との対比)
// ────────────────────────────────────────────────────────────

/** log B(a,b) = lnΓ(a)+lnΓ(b)−lnΓ(a+b)(ベータ関数の対数、正規化定数)。 */
export function logBetaFn(a: number, b: number): number {
  return lnGamma(a) + lnGamma(b) - lnGamma(a + b);
}

/** log C(n,k) = lnΓ(n+1)−lnΓ(k+1)−lnΓ(n−k+1)(二項係数の対数、nが大きくてもオーバーフローしない)。 */
export function logBinomialCoeff(n: number, k: number): number {
  return lnGamma(n + 1) - lnGamma(k + 1) - lnGamma(n - k + 1);
}

/**
 * ベータ-二項の周辺尤度(エビデンス) m(D|H1) = C(n,k)·B(α+k, β+n−k)/B(α,β) の対数。
 * H1: θ に Beta(α,β) 事前分布を置く複合仮説のもとで、観測データ(n試行中k成功)が
 * 生じる確率(θ を積分消去した値)。
 */
export function marginalLogLikelihoodBetaBinomial(
  prior: BetaParams,
  n: number,
  k: number,
): number {
  return (
    logBinomialCoeff(n, k) +
    logBetaFn(prior.alpha + k, prior.beta + n - k) -
    logBetaFn(prior.alpha, prior.beta)
  );
}

/** 点仮説 H0: θ=θ0 のもとでの周辺尤度(=通常の二項尤度)の対数。 */
export function pointNullLogLikelihood(theta0: number, n: number, k: number): number {
  if (theta0 <= 0 || theta0 >= 1) return Number.NEGATIVE_INFINITY;
  return logBinomialCoeff(n, k) + k * Math.log(theta0) + (n - k) * Math.log(1 - theta0);
}

/**
 * ベイズファクター BF10 = m(D|H1)/m(D|H0)。1より大きいほどH1(θは分からない・Beta事前分布)、
 * 1より小さいほどH0(θ=θ0の点仮説)をデータが支持する。
 */
export function bayesFactor10(
  n: number,
  k: number,
  theta0: number,
  priorH1: BetaParams,
): number {
  const logM1 = marginalLogLikelihoodBetaBinomial(priorH1, n, k);
  const logM0 = pointNullLogLikelihood(theta0, n, k);
  return Math.exp(logM1 - logM0);
}

export type BfStrength = "anecdotal" | "moderate" | "strong" | "very-strong" | "extreme";
export type BfInterpretation = {
  /** データが支持する仮説("H1"=θ不明の複合仮説, "H0"=点仮説, "none"=どちらも決定打なし)。 */
  favors: "H1" | "H0" | "none";
  strength: BfStrength;
};

/**
 * ベイズファクターの強さをJeffreys(1961)/Lee & Wagenmakers(2013)の目安で分類する。
 * BF10(またはその逆数1/BF10)が 1〜3=anecdotal, 3〜10=moderate, 10〜30=strong,
 * 30〜100=very-strong, 100以上=extreme。p値のような単一の閾値(0.05)で「有意/非有意」を
 * 二分するのではなく、証拠の強さを連続的な目安で示すのがベイズ的仮説検定の考え方。
 */
export function interpretBayesFactor(bf10: number): BfInterpretation {
  const favors: "H1" | "H0" | "none" = bf10 > 1 ? "H1" : bf10 < 1 ? "H0" : "none";
  const ratio = bf10 >= 1 ? bf10 : 1 / bf10;
  let strength: BfStrength;
  if (ratio < 3) strength = "anecdotal";
  else if (ratio < 10) strength = "moderate";
  else if (ratio < 30) strength = "strong";
  else if (ratio < 100) strength = "very-strong";
  else strength = "extreme";
  return { favors, strength };
}

/** 事前確率(0〜1)からオッズ p/(1−p) へ変換する。 */
export function priorOddsFromProb(p: number): number {
  return p / (1 - p);
}

/** ベイズの定理のオッズ形: 事後オッズ = ベイズファクター × 事前オッズ。 */
export function posteriorOddsFromBayesFactor(bf10: number, priorOdds: number): number {
  return bf10 * priorOdds;
}

/** オッズ o から確率 o/(1+o) へ変換する。 */
export function oddsToProbability(odds: number): number {
  return odds / (1 + odds);
}

/**
 * 頻度論の正確二項検定(両側)のp値(対比用)。「観測 k以上に極端」な結果すべての確率を足し上げる
 * (R の binom.test と同じ定義: θ0のもとでの確率が観測値以下のすべての結果を「同等以上に極端」とみなす)。
 */
export function binomialTwoSidedPValue(n: number, k: number, theta0: number): number {
  const pObs = binomialPmf(k, n, theta0);
  let p = 0;
  for (let j = 0; j <= n; j++) {
    const pj = binomialPmf(j, n, theta0);
    if (pj <= pObs * (1 + 1e-9)) p += pj;
  }
  return Math.min(1, p);
}

// ────────────────────────────────────────────────────────────
// ベイズ判別: 事後確率に基づく分類(ナイーブベイズ(naive-bayes-knn.ts)の1特徴量版)
// ────────────────────────────────────────────────────────────

export type GaussianClass = { mean: number; sd: number };

/**
 * 「事前確率×尤度」(=P(k|x)の分子、まだP(x)で正規化する前の値)をx方向に走査した曲線。
 * 2本の曲線(クラス0・クラス1)が交わる場所が、決定境界(findDecisionBoundariesの根)に一致する
 * ——ベイズ判別Labで「事前確率を上げるとクラス1側の曲線が持ち上がり、境界が動く」ことを可視化する。
 */
export function weightedLikelihoodCurves(
  prior1: number,
  class0: GaussianClass,
  class1: GaussianClass,
  xMin: number,
  xMax: number,
  n = 121,
): { x: number; w0: number; w1: number }[] {
  const points: { x: number; w0: number; w1: number }[] = [];
  for (let i = 0; i < n; i++) {
    const x = xMin + (i / (n - 1)) * (xMax - xMin);
    points.push({
      x,
      w0: gaussianPdf(x, class0.mean, class0.sd) * (1 - prior1),
      w1: gaussianPdf(x, class1.mean, class1.sd) * prior1,
    });
  }
  return points;
}

/**
 * 1特徴量xについて、事前確率prior1(クラス1の事前確率、クラス0は1−prior1)と
 * 2クラスのガウス尤度から、事後確率 P(class=1|x) をベイズの定理で計算する
 * (P(k|x) ∝ P(x|k)P(k) をそのまま2クラスに適用、ナイーブベイズと同じ骨格)。
 */
export function posteriorProbClass1(
  x: number,
  prior1: number,
  class0: GaussianClass,
  class1: GaussianClass,
): number {
  const l0 = gaussianPdf(x, class0.mean, class0.sd);
  const l1 = gaussianPdf(x, class1.mean, class1.sd);
  const num = l1 * prior1;
  const den = num + l0 * (1 - prior1);
  return den > 0 ? num / den : 0.5;
}

/**
 * 事後確率P(class=1|x)=0.5となる決定境界を[xMin,xMax]の格子探索(線形補間)で求める
 * (分散が異なる一般のガウス2クラスでは境界が0個・1個・2個になりうるため、
 * 閉形式の二次方程式を解くのではなく頑健な数値探索にする)。
 */
export function findDecisionBoundaries(
  prior1: number,
  class0: GaussianClass,
  class1: GaussianClass,
  xMin: number,
  xMax: number,
  steps = 400,
): number[] {
  const boundaries: number[] = [];
  const minGap = (xMax - xMin) / steps / 2; // 同一交点をちょうど格子点で2回検出する場合の重複除去用
  let prevX: number | null = null;
  let prevDiff: number | null = null;
  for (let i = 0; i <= steps; i++) {
    const x = xMin + ((xMax - xMin) * i) / steps;
    const diff = posteriorProbClass1(x, prior1, class0, class1) - 0.5;
    if (prevX !== null && prevDiff !== null && Math.sign(diff) !== Math.sign(prevDiff)) {
      const t = prevDiff / (prevDiff - diff);
      const root = prevX + t * (x - prevX);
      const last = boundaries[boundaries.length - 1];
      if (last === undefined || Math.abs(root - last) > minGap) boundaries.push(root);
    }
    prevX = x;
    prevDiff = diff;
  }
  return boundaries;
}
