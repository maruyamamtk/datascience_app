/**
 * ベイズ応用（K-4, A/Bテスト・IRT）の計算層（純関数・副作用なし・Vitest 対象）。
 *
 * 扱う道具（SPEC §3 K-4「ベイズA/Bテスト、IRT（項目反応理論）」
 * 出典: 『Pythonでスラスラわかるベイズ推論「超」入門』第6章「ベイズ推論の業務活用事例」）:
 *
 * - **ベイズA/Bテスト**: 2案(A/B)それぞれのコンバージョン率θをベータ事後分布として推定し、
 *   [ベイズ統計の基礎](bayesian-basics)（K-1）と全く同じベータ-二項共役（`updateBetaWithCounts`）を
 *   «2群の比較» に応用する。頻度論の[A/Bテスト実務](ab-test.ts)（有意水準で「有意/非有意」を二分）と違い、
 *   「P(B>A)=85%」のような直接確率と、意思決定を誤ったときの損失の大きさ（期待損失）で判断する。
 * - **モンテカルロでP(B>A)・期待損失を推定**: 2つの事後分布からそれぞれ大量にサンプリングし、
 *   「Bの方が大きかった割合」を数える（大数の法則）。サンプリングは超越関数を使わない
 *   **一様乱数の順序統計量**（Beta(a,b)は a,b が正整数のとき a+b−1 個の一様乱数の a 番目に小さい値と
 *   厳密に一致する）で行うため、決定的LCG（mulberry32）と組み合わせてSSR/CSRで完全に一致する
 *   （tasks/lessons.md «整数演算だけの決定的LCGで生成する» の教訓をベータ分布サンプリングに拡張）。
 * - **IRT（項目反応理論、2パラメータロジスティックモデル）**: 受験者の能力θ・項目の困難度b・識別力aから
 *   正答確率をロジスティック関数で求める。[ロジスティック回帰](../../content/topics/qualitative-regression.mdx)の
 *   シグモイド関数（`lib/stats/logistic.ts`のsigmoid）をそのまま再利用する（対数オッズが線形という同じ骨格）。
 *   複数項目への回答パターンから尤度曲線がどう決まるか（尤度が peak を持ち、項目が増えるほど尖る）も扱う。
 *
 * 乱数は他トピックと同じ決定的な整数演算 mulberry32 に閉じる（lib/stats/random.ts）。
 */

import { mulberry32, type Rng } from "./random";
import { mean } from "./monte-carlo";
import { sigmoid } from "./logistic";
import {
  betaMean,
  betaPdfCurve,
  updateBetaWithCounts,
  type BetaParams,
} from "./bayesian-basics";

export type { BetaParams };
export { betaMean, betaPdfCurve, updateBetaWithCounts };

// ────────────────────────────────────────────────────────────
// ベイズA/Bテスト: 事後分布・モンテカルロによる P(B>A)・期待損失
// ────────────────────────────────────────────────────────────

/** 無情報事前分布 Beta(1,1)（一様、K-1の DEFAULT_PRIOR と同じ思想）。 */
export const UNIFORM_PRIOR: BetaParams = { alpha: 1, beta: 1 };

export type VariantData = {
  /** バリアント名（表示用）。 */
  label: string;
  /** コンバージョン数（成功数）。 */
  conversions: number;
  /** 訪問者数（試行数）。conversions 以上。 */
  visitors: number;
};

/** バリアントの観測データから事後分布 Beta(α0+conversions, β0+失敗数) を求める。 */
export function variantPosterior(prior: BetaParams, data: VariantData): BetaParams {
  const failures = Math.max(0, data.visitors - data.conversions);
  return updateBetaWithCounts(prior, data.conversions, failures);
}

/**
 * Beta(a,b) を一様乱数の**順序統計量**として厳密にサンプリングする。
 *
 * 根拠: a,b が正整数のとき、n=a+b−1 個の独立な Uniform(0,1) を並べた
 * 順序統計量 U₍₁₎≤…≤U₍ₙ₎ の a 番目 U₍ₐ₎ はちょうど Beta(a,b) に従う
 * （「a 番目までに収まる」という事象は「n 個中 a 個以上が x 以下」という二項確率の和に等しく、
 * これは Beta(a,b) の累積分布関数そのもの——二項分布とベータ分布を結ぶ古典的な恒等式）。
 * 比較・ソートだけで完結し `Math.log`/`Math.pow` 等の超越関数を使わないため、
 * mulberry32 と組み合わせても SSR/CSR で1ビットもずれない。
 *
 * a,b が正整数でない場合は範囲エラーを投げる（本トピックは常に Beta(1,1) 事前分布+整数観測数から
 * 出発するため、事後分布のパラメータは常に正整数になる——呼び出し側の前提）。
 */
export function sampleBetaInteger(a: number, b: number, rng: Rng): number {
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b < 1) {
    throw new RangeError(`sampleBetaInteger requires positive integers (got a=${a}, b=${b})`);
  }
  const n = a + b - 1;
  const samples = new Array<number>(n);
  for (let i = 0; i < n; i++) samples[i] = rng();
  samples.sort((x, y) => x - y);
  return samples[a - 1];
}

export type AbMonteCarloResult = {
  /** モンテカルロで推定した P(θ_B > θ_A)。 */
  probBBeatsA: number;
  /** Bを選んだのに実際はAの方が良かった場合の期待損失 E[max(θ_A-θ_B, 0)]。 */
  expectedLossChooseB: number;
  /** Aを選んだのに実際はBの方が良かった場合の期待損失 E[max(θ_B-θ_A, 0)]。 */
  expectedLossChooseA: number;
  /** 使用したサンプル数。 */
  nSamples: number;
};

/**
 * 2つのベータ事後分布から nSamples 組サンプリングし、P(B>A) と両方向の期待損失を
 * まとめてモンテカルロ推定する（同じサンプル列を使い回すことで呼び出しごとの乱数消費を1回に抑える）。
 */
export function runAbMonteCarlo(
  posteriorA: BetaParams,
  posteriorB: BetaParams,
  nSamples: number,
  rng: Rng,
): AbMonteCarloResult {
  if (nSamples <= 0) {
    return { probBBeatsA: 0.5, expectedLossChooseB: 0, expectedLossChooseA: 0, nSamples: 0 };
  }
  let bWins = 0;
  let sumLossChooseB = 0; // Bを選んだ時の損失: max(A-B, 0)
  let sumLossChooseA = 0; // Aを選んだ時の損失: max(B-A, 0)
  for (let i = 0; i < nSamples; i++) {
    const thetaA = sampleBetaInteger(posteriorA.alpha, posteriorA.beta, rng);
    const thetaB = sampleBetaInteger(posteriorB.alpha, posteriorB.beta, rng);
    if (thetaB > thetaA) bWins++;
    sumLossChooseB += Math.max(thetaA - thetaB, 0);
    sumLossChooseA += Math.max(thetaB - thetaA, 0);
  }
  return {
    probBBeatsA: bWins / nSamples,
    expectedLossChooseB: sumLossChooseB / nSamples,
    expectedLossChooseA: sumLossChooseA / nSamples,
    nSamples,
  };
}

/** Labのモンテカルロ標本数の既定値（sliderの範囲でも実時間で計算が返る程度に抑える）。 */
export const AB_MC_SAMPLES = 2000;
/** モンテカルロ乱数の既定シード（決定的・再現可能）。 */
export const AB_MC_SEED = 20260728;

/** 既定のシード・標本数でモンテカルロP(B>A)・期待損失を計算する便利関数。 */
export function estimateAbComparison(
  posteriorA: BetaParams,
  posteriorB: BetaParams,
  nSamples: number = AB_MC_SAMPLES,
  seed: number = AB_MC_SEED,
): AbMonteCarloResult {
  return runAbMonteCarlo(posteriorA, posteriorB, nSamples, mulberry32(seed));
}

// ────────────────────────────────────────────────────────────
// A/B観測ステッパー: 固定の観測系列を1件ずつ反映する
// ────────────────────────────────────────────────────────────

export type AbObservation = { variant: "A" | "B"; converted: 0 | 1 };

/**
 * 決定的な固定観測系列（A/B交互ではなく実際のオンライン実験のように非同期に届く想定）。
 * Bの方が真のコンバージョン率が高い設定（A: 見かけ8/40→本当は0.18、B: 見かけ14/40→本当は0.30相当）で、
 * 観測が進むほどP(B>A)が0.5付近から上昇し、終盤には高い確率へ収束する物語になるよう選んだ。
 */
export const AB_OBSERVATIONS: readonly AbObservation[] = [
  { variant: "A", converted: 0 },
  { variant: "B", converted: 1 },
  { variant: "A", converted: 1 },
  { variant: "B", converted: 0 },
  { variant: "A", converted: 0 },
  { variant: "B", converted: 1 },
  { variant: "A", converted: 0 },
  { variant: "B", converted: 1 },
  { variant: "A", converted: 1 },
  { variant: "B", converted: 1 },
  { variant: "A", converted: 0 },
  { variant: "B", converted: 0 },
  { variant: "A", converted: 0 },
  { variant: "B", converted: 1 },
  { variant: "A", converted: 1 },
  { variant: "B", converted: 1 },
  { variant: "A", converted: 0 },
  { variant: "B", converted: 1 },
  { variant: "A", converted: 0 },
  { variant: "B", converted: 1 },
];

export type AbSequentialStep = {
  /** 0=観測前(事前分布のみ)、1..n=i件目までの観測を反映。 */
  index: number;
  observation: AbObservation | null;
  dataA: VariantData;
  dataB: VariantData;
  posteriorA: BetaParams;
  posteriorB: BetaParams;
  comparison: AbMonteCarloResult;
};

/**
 * 観測を1件ずつ反映していく過程を全ステップぶん計算する（ステッパー用）。
 * 各ステップでモンテカルロP(B>A)・期待損失も再計算する（累計試行数が小さいため十分高速）。
 */
export function sequentialAbUpdates(
  prior: BetaParams,
  observations: readonly AbObservation[],
  nSamples: number = AB_MC_SAMPLES,
  seed: number = AB_MC_SEED,
): AbSequentialStep[] {
  const steps: AbSequentialStep[] = [];
  let dataA: VariantData = { label: "A", conversions: 0, visitors: 0 };
  let dataB: VariantData = { label: "B", conversions: 0, visitors: 0 };

  const pushStep = (index: number, observation: AbObservation | null) => {
    const posteriorA = variantPosterior(prior, dataA);
    const posteriorB = variantPosterior(prior, dataB);
    steps.push({
      index,
      observation,
      dataA,
      dataB,
      posteriorA,
      posteriorB,
      comparison: estimateAbComparison(posteriorA, posteriorB, nSamples, seed),
    });
  };

  pushStep(0, null);
  observations.forEach((obs, i) => {
    if (obs.variant === "A") {
      dataA = { ...dataA, conversions: dataA.conversions + obs.converted, visitors: dataA.visitors + 1 };
    } else {
      dataB = { ...dataB, conversions: dataB.conversions + obs.converted, visitors: dataB.visitors + 1 };
    }
    pushStep(i + 1, obs);
  });
  return steps;
}

// ────────────────────────────────────────────────────────────
// IRT（2パラメータロジスティックモデル）
// ────────────────────────────────────────────────────────────

export type IrtItem = {
  id: string;
  label: string;
  /** 識別力パラメータ a（曲線の傾きの急さ）。 */
  a: number;
  /** 困難度パラメータ b（正答確率0.5になる能力θの位置）。 */
  b: number;
};

/**
 * 2パラメータロジスティックモデル（2PLモデル）: 能力θ・識別力a・困難度bから正答確率を求める。
 * ロジスティック回帰と全く同じ骨格（`lib/stats/logistic.ts`のsigmoidをそのまま使う）——
 * 対数オッズ ln(P/(1-P)) = a(θ-b) が θ について線形という点が共通。
 */
export function irtProbability(theta: number, item: Pick<IrtItem, "a" | "b">): number {
  return sigmoid(item.a * (theta - item.b));
}

/** 項目特性曲線(ICC)：θ範囲を走査した{theta, p}の折れ線データ。 */
export function itemCharacteristicCurve(
  item: Pick<IrtItem, "a" | "b">,
  thetaMin = -4,
  thetaMax = 4,
  n = 121,
): { theta: number; p: number }[] {
  const points: { theta: number; p: number }[] = [];
  for (let i = 0; i < n; i++) {
    const theta = thetaMin + (i / (n - 1)) * (thetaMax - thetaMin);
    points.push({ theta, p: irtProbability(theta, item) });
  }
  return points;
}

/**
 * 項目情報量 I(θ) = a²·P(θ)·(1-P(θ))（2PLモデルのFisher情報量）。
 * 識別力aが大きく、θがbに近いほど情報量が大きい（＝その能力帯を精密に測れる項目）。
 */
export function itemInformation(theta: number, item: Pick<IrtItem, "a" | "b">): number {
  const p = irtProbability(theta, item);
  return item.a * item.a * p * (1 - p);
}

/** 既定の項目バンク（識別力・困難度が異なる5項目、ICC比較・尤度ラボ双方で使う）。 */
export const DEFAULT_ITEMS: readonly IrtItem[] = [
  { id: "q1", label: "問1(易しい)", a: 1.0, b: -1.5 },
  { id: "q2", label: "問2(やや易しい)", a: 1.4, b: -0.5 },
  { id: "q3", label: "問3(標準)", a: 1.8, b: 0 },
  { id: "q4", label: "問4(やや難しい)", a: 1.4, b: 0.8 },
  { id: "q5", label: "問5(難しい)", a: 1.0, b: 1.8 },
];

/** ICC比較ラボで既定表示する3項目（識別力が異なる例: 緩やか/標準/急）。 */
export const ICC_COMPARISON_ITEMS: readonly IrtItem[] = [
  { id: "gentle", label: "識別力低(a=0.7)", a: 0.7, b: 0 },
  { id: "standard", label: "識別力標準(a=1.5)", a: 1.5, b: 0 },
  { id: "steep", label: "識別力高(a=2.8)", a: 2.8, b: 0 },
];

/**
 * 回答パターン(項目ごとの0/1、undefinedは未回答)から対数尤度 ln L(θ) を計算する。
 * L(θ)=∏ P(θ)^{u_i}(1-P(θ))^{1-u_i}（各項目の正誤は独立というIRTの局所独立性の仮定）。
 */
export function logLikelihoodTheta(
  theta: number,
  items: readonly IrtItem[],
  responses: readonly (0 | 1 | undefined)[],
): number {
  let logL = 0;
  items.forEach((item, i) => {
    const u = responses[i];
    if (u === undefined) return;
    const p = irtProbability(theta, item);
    const term = u === 1 ? p : 1 - p;
    // pがちょうど0/1に極めて近いと log(0) になりうるため下限をクランプする。
    logL += Math.log(Math.max(term, 1e-12));
  });
  return logL;
}

export type LikelihoodCurvePoint = { theta: number; logLik: number; lik: number };

/**
 * θ範囲を走査した尤度曲線。表示用に最大対数尤度を0へシフトしてから exp することで
 * 相対尤度（ピークで1になる曲線）にする——回答項目数が増えると尤度自体は指数的に小さくなり
 * そのままではグラフが潰れて見えるため、可視化上は常に「ピーク=1」に正規化するのが定石。
 */
export function likelihoodCurve(
  items: readonly IrtItem[],
  responses: readonly (0 | 1 | undefined)[],
  thetaMin = -4,
  thetaMax = 4,
  n = 121,
): LikelihoodCurvePoint[] {
  const raw = Array.from({ length: n }, (_, i) => {
    const theta = thetaMin + (i / (n - 1)) * (thetaMax - thetaMin);
    return { theta, logLik: logLikelihoodTheta(theta, items, responses) };
  });
  const maxLogLik = Math.max(...raw.map((p) => p.logLik));
  return raw.map((p) => ({
    ...p,
    lik: Number.isFinite(maxLogLik) ? Math.exp(p.logLik - maxLogLik) : 0,
  }));
}

/**
 * 尤度曲線の格子探索で対数尤度を最大にするθ(最尤推定, MLE)を求める
 * （bayesian-basicsのfindDecisionBoundariesと同じ「格子探索+線形補間ではなく単純なargmax」の方針。
 * IRTの尤度は単峰なことが多くグリッド解像度を上げれば十分な精度で近似できる）。
 */
export function mleTheta(
  items: readonly IrtItem[],
  responses: readonly (0 | 1 | undefined)[],
  thetaMin = -4,
  thetaMax = 4,
  steps = 400,
): number {
  let bestTheta = thetaMin;
  let bestLogLik = Number.NEGATIVE_INFINITY;
  for (let i = 0; i <= steps; i++) {
    const theta = thetaMin + (i / steps) * (thetaMax - thetaMin);
    const logLik = logLikelihoodTheta(theta, items, responses);
    if (logLik > bestLogLik) {
      bestLogLik = logLik;
      bestTheta = theta;
    }
  }
  return bestTheta;
}

/** 回答済み項目数（未回答=undefinedを除いた数）。 */
export function answeredCount(responses: readonly (0 | 1 | undefined)[]): number {
  return responses.filter((r) => r !== undefined).length;
}

/** 正答数。 */
export function correctCount(responses: readonly (0 | 1 | undefined)[]): number {
  return responses.filter((r) => r === 1).length;
}

export const DEFAULT_RESPONSES: readonly (0 | 1 | undefined)[] = DEFAULT_ITEMS.map(() => undefined);

/** 便利関数: mean を re-export（描画層で正答率などの平均を出すのに使う）。 */
export { mean };
