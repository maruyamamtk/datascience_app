/**
 * 情報の価値(P-3)の計算層(純関数・副作用なし・Vitest対象)。
 *
 * 扱う道具(SPEC §3 P-3「EVPI（Expected Value of Perfect Information、完全情報の期待価値）、
 * 事前/事後分析」出典: 『意思決定分析と予測の活用』第2部「決定分析の基本」第6章「情報の価値」・
 * 第3部「決定分析の活用」第4章「標準型分析」):
 *
 * - **EVPI(完全情報の期待価値)**: 状態θが100%的中する完全な情報を得たとしたときの期待利得と、
 *   情報なし(事前確率のみ)での期待利得との差。「どんな予測・情報に対しても支払ってよい上限額」を表す。
 *
 *   $$ \mathrm{EVPI}=\sum_\theta P(\theta)\max_a c(a,\theta)-\max_a \mathrm{ESV}(a) $$
 *
 * - **事後分析(Post-decision analysis)**: 実際にシグナル(予測) s を観測した"後"の期待利得の増分。
 *
 *   $$ \mathrm{VOI}_{\mathrm{post}}(s)=\max_a \mathrm{ESV}(a\mid s)-\max_a \mathrm{ESV}(a) $$
 *
 * - **事前分析(Pre-decision analysis)**: シグナルを"まだ得ていない"時点で、シグナルが従う周辺確率
 *   P(s) で事後分析の値を平均した期待値(EVSI: Expected Value of Sample/Imperfect Informationの考え方)。
 *
 *   $$ \mathrm{VOI}_{\mathrm{pre}}=\sum_s P(s)\max_a \mathrm{ESV}(a\mid s)-\max_a \mathrm{ESV}(a) $$
 *
 *   シグナルが完全情報(状態を確実に言い当てる)に近づくほど $\mathrm{VOI}_{\mathrm{pre}}\to\mathrm{EVPI}$ に
 *   近づく——EVPIは、あらゆる(不完全な情報も含む)情報の価値の上限であることがこの関係から分かる。
 * - **期待リグレット = EVPI**: 事前確率のもとでESVが最大の行動を選んだときの期待リグレット(後悔)は、
 *   EVPIとちょうど一致する(第2部第6章「情報の有効性と不確実性の費用」)。「不確実性のせいでどれだけ
 *   損をしているか」という2つの見方が同じ数値になる、という決定分析の重要な帰結。
 *
 * 前提関係(CLAUDE.md「前提関係を明示」・重複回避):
 * - [決定分析](decision-analysis.ts)(P-1)の利得行列 PRIMARY_PAYOFF_MATRIX・ESV(expectedValueCriterion)・
 *   リグレット行列(regretMatrix)をそのまま再利用・拡張する(工場稼働台数×景気の例)。
 * - [ベイズ統計の基礎](bayesian-basics.ts)(K-1)の「事前分布→事後分布」と同じベイズの定理を、
 *   ここでは連続パラメータθではなく離散的な自然の状態Θ(好況/不況)に対して適用する
 *   (bayesPosteriorFromSignalが担う。第3部第4章「判断確率とベイズ決定」)。
 *
 * データ(信号の的中率)は乱数を使わず**固定の小さな具体例**(対称な二値予報、的中率qをスライダーで動かす)
 * にする(CLAUDE.md「まず小さな具体例で原理を見せる」)。
 */

import {
  expectedValueCriterion,
  regretMatrix,
  type CriterionResult,
  type PayoffMatrix,
} from "./decision-analysis";

// ────────────────────────────────────────────────────────────
// EVPI(完全情報の期待価値)
// ────────────────────────────────────────────────────────────

/**
 * 完全情報が得られた場合の期待利得(第2部第6章の定義式の第1項)。
 * 状態θごとに"その状態だと分かっていれば選べる最善の行動"の利得 max_a c(a,θ) を、
 * 事前確率P(θ)で重み付けた平均。
 */
export function perfectInformationEsv(
  matrix: PayoffMatrix,
  probabilities: readonly number[],
): number {
  if (probabilities.length !== matrix.states.length) {
    throw new Error("probabilities の長さは states の数と一致させる必要がある");
  }
  return matrix.states.reduce((sum, _s, j) => {
    const bestForState = Math.max(...matrix.payoffs.map((row) => row[j]));
    return sum + probabilities[j] * bestForState;
  }, 0);
}

/** 事前確率のもとで、状態θごとに"最善の行動"のindexを返す(完全情報のもとでの選択)。 */
export function perfectInfoBestActionPerState(matrix: PayoffMatrix): number[] {
  return matrix.states.map((_s, j) =>
    matrix.payoffs.reduce((bi, row, i) => (row[j] > matrix.payoffs[bi][j] ? i : bi), 0),
  );
}

/**
 * EVPI(Expected Value of Perfect Information, 完全情報の期待価値)。
 * 完全情報があった場合の期待利得と、事前確率のみでの最善の期待利得(ESVの最大値)の差。
 * 常に0以上(完全情報は"知らないより悪くなる"ことはない)。
 */
export function evpi(matrix: PayoffMatrix, probabilities: readonly number[]): number {
  const priorBest = Math.max(...expectedValueCriterion(matrix, probabilities).scores);
  return perfectInformationEsv(matrix, probabilities) - priorBest;
}

/**
 * 行動actionIndexの、事前確率probabilitiesのもとでの期待リグレット
 * Σ_θ P(θ)・regret(actionIndex,θ)。
 */
export function expectedRegretOfAction(
  matrix: PayoffMatrix,
  probabilities: readonly number[],
  actionIndex: number,
): number {
  if (probabilities.length !== matrix.states.length) {
    throw new Error("probabilities の長さは states の数と一致させる必要がある");
  }
  const regret = regretMatrix(matrix);
  const row = regret[actionIndex];
  return row.reduce((sum, r, j) => sum + probabilities[j] * r, 0);
}

// ────────────────────────────────────────────────────────────
// 事前/事後分析(Prior/Posterior analysis): 不完全な情報(予報)を得た場合のベイズ更新
// ────────────────────────────────────────────────────────────

/** 二値の予報(シグナル)。likelihoods[s][theta] = P(シグナル=s | 状態=theta)。 */
export type BinaryForecast = {
  /** シグナルのラベル(states と同じ順序で対応させる: signals[j]は"状態jを言い当てる予報")。 */
  signals: readonly string[];
  /** likelihoods[s][theta] = P(シグナル=signals[s] | 状態=states[theta])。 */
  likelihoods: readonly (readonly number[])[];
};

/**
 * 対称な的中率を持つ二値予報(第3部第1章の"予測の品質"を単純化した1パラメータモデル)。
 * accuracy(的中率) q は0.5(まったく当たらない、状態と無関係)〜1(完全に的中)の範囲にクランプする。
 * P(予報どおり|実際にその状態) = q、P(予報が外れる|実際は別の状態) = 1-q。
 */
export function symmetricForecast(
  accuracy: number,
  signalLabels: readonly [string, string] = ["予報:好況", "予報:不況"],
): BinaryForecast {
  const q = Math.min(1, Math.max(0.5, accuracy));
  return {
    signals: signalLabels,
    likelihoods: [
      [q, 1 - q],
      [1 - q, q],
    ],
  };
}

/**
 * ベイズの定理により、シグナルsを観測した後の事後確率P(θ|s)を求める
 * ([ベイズ統計の基礎](bayesian-basics.ts)の「事後 ∝ 尤度 × 事前分布」と同じ構造を、
 * 連続パラメータθでなく離散的な自然の状態Θに適用したもの。第3部第4章の判断確率とベイズ決定)。
 * 戻り値: シグナルの周辺確率P(s)と、事後確率P(θ|s)(合計1になるよう正規化済み)。
 */
export function bayesPosteriorFromSignal(
  prior: readonly number[],
  likelihoodGivenSignal: readonly number[],
): { signalProbability: number; posterior: number[] } {
  const joint = prior.map((p, j) => p * likelihoodGivenSignal[j]);
  const signalProbability = joint.reduce((s, v) => s + v, 0);
  const posterior =
    signalProbability > 0
      ? joint.map((v) => v / signalProbability)
      : prior.map(() => 1 / prior.length);
  return { signalProbability, posterior };
}

export type PriorPosteriorAnalysisResult = {
  /** 事前確率のみでの最善の期待利得(基準点、max_a ESV(a))。 */
  priorBestEsv: number;
  /** シグナルごとの周辺確率P(s)。 */
  signalProbability: number[];
  /** シグナルごとの事後確率P(θ|s)。 */
  posterior: number[][];
  /** シグナルごとの条件付きESV(a|s)(全行動のスコア)。 */
  esvGivenSignal: CriterionResult[];
  /** シグナルごとのmax_a ESV(a|s)。 */
  bestEsvGivenSignal: number[];
  /** シグナルごとの事後分析VOI_post(s) = max_a ESV(a|s) − max_a ESV(a)。 */
  voiPost: number[];
  /** 事前分析VOI_pre = Σ_s P(s)・max_a ESV(a|s) − max_a ESV(a)(EVSIの考え方)。 */
  voiPre: number;
};

/**
 * 事前/事後分析(Prior/posterior analysis, 第2部第6章・第3部第4章)。
 * 予報(forecast)を観測する前の事前確率priorから、シグナルごとの事後確率・条件付きESV・
 * 事後分析VOI_post(s)・事前分析VOI_pre(EVSI)までを一気に計算する。
 * forecastがsymmetricForecast(1)(完全な的中)のときvoiPreはevpiに一致し、
 * symmetricForecast(0.5)(無情報)のときvoiPreは0になる——EVPIが情報の価値の上限であることの具体例。
 */
export function priorPosteriorAnalysis(
  matrix: PayoffMatrix,
  prior: readonly number[],
  forecast: BinaryForecast,
): PriorPosteriorAnalysisResult {
  if (prior.length !== matrix.states.length) {
    throw new Error("prior の長さは states の数と一致させる必要がある");
  }
  const priorBestEsv = Math.max(...expectedValueCriterion(matrix, prior).scores);

  const signalProbability: number[] = [];
  const posterior: number[][] = [];
  const esvGivenSignal: CriterionResult[] = [];
  const bestEsvGivenSignal: number[] = [];
  const voiPost: number[] = [];

  forecast.signals.forEach((_label, s) => {
    const { signalProbability: pS, posterior: postS } = bayesPosteriorFromSignal(
      prior,
      forecast.likelihoods[s],
    );
    const esv = expectedValueCriterion(matrix, postS);
    const bestEsv = Math.max(...esv.scores);
    signalProbability.push(pS);
    posterior.push(postS);
    esvGivenSignal.push(esv);
    bestEsvGivenSignal.push(bestEsv);
    voiPost.push(bestEsv - priorBestEsv);
  });

  const voiPre =
    signalProbability.reduce((sum, p, s) => sum + p * bestEsvGivenSignal[s], 0) - priorBestEsv;

  return {
    priorBestEsv,
    signalProbability,
    posterior,
    esvGivenSignal,
    bestEsvGivenSignal,
    voiPost,
    voiPre,
  };
}
