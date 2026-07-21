import {
  bayesFactor10,
  betaMean,
  COIN_SEQUENCE,
  type BetaParams,
  type GaussianClass,
  findDecisionBoundaries,
  interpretBayesFactor,
  posteriorMeanTrajectory,
  posteriorOddsFromBayesFactor,
  posteriorProbClass1,
  priorOddsFromProb,
  binomialTwoSidedPValue,
  sequentialUpdates,
  type UpdateStep,
} from "@/lib/stats/bayesian-basics";
import { createTopicStore } from "./topicStore";

// ────────────────────────────────────────────────────────────
// ベイズ判別Labの固定クラス設定(1特徴量・2クラスのガウス尤度)
// ────────────────────────────────────────────────────────────

export const DISC_CLASS0: GaussianClass = { mean: 3, sd: 2 };
export const DISC_CLASS1: GaussianClass = { mean: 8, sd: 2.2 };
export const DISC_X_MIN = -4;
export const DISC_X_MAX = 15;

// ────────────────────────────────────────────────────────────
// メインストア(single source of truth)
// - PosteriorUpdateLab(Level0の中核ステッパー)がframeを使う唯一のステッパーなので
//   tasks/lessons.md #76 の判断目安どおりmainストアのframeを共用する。
// ────────────────────────────────────────────────────────────

export type MainControls = {
  /** 事後分布ステッパー(Level0)の事前分布 α。 */
  priorAlpha: number;
  /** 事後分布ステッパー(Level0)の事前分布 β。 */
  priorBeta: number;
  /** 事前分布の感度(Level1)ラボで動かす、対照用の「選択した」シンメトリック事前分布の重み。 */
  sensitivityWeight: number;
  /** ベイズファクターLab(Level2)の試行数n。 */
  bfN: number;
  /** ベイズファクターLab(Level2)の成功数k(0≤k≤bfN)。 */
  bfK: number;
  /** ベイズファクターLab(Level2)の点仮説 H0: θ=theta0。 */
  bfTheta0: number;
  /** ベイズ判別Lab(Level2)のクラス1の事前確率。 */
  discPrior1: number;
  /** ベイズ判別Lab(Level2)で動かす、判別したい特徴量xの値。 */
  discX: number;
};

export type MainDerived = {
  // Level0: 事後分布ステッパー(現在のフレームは frame.index を使い、
  // 描画層側で updateSteps[frame.index] を読む——derive はcontrolsのみを引数に取り
  // frame状態を持たないため、frameに依存する「現在のステップ」はここでは確定しない)。
  updateSteps: UpdateStep[];
  priorMean: number;
  // Level1: 事前分布の感度
  weakTrajectory: number[];
  chosenTrajectory: number[];
  strongTrajectory: number[];
  // Level2: ベイズファクター
  bf10: number;
  bfInterpretation: ReturnType<typeof interpretBayesFactor>;
  pValue: number;
  posteriorProbH1: number;
  // Level2: ベイズ判別
  discPosterior: number;
  discBoundaries: number[];
};

export const INITIAL_CONTROLS: MainControls = {
  priorAlpha: 1,
  priorBeta: 1,
  sensitivityWeight: 5,
  bfN: 20,
  bfK: 15,
  bfTheta0: 0.5,
  discPrior1: 0.5,
  discX: 5.5,
};

const WEAK_PRIOR_WEIGHT = 1;
const STRONG_PRIOR_WEIGHT = 20;

/**
 * ベイズ統計の基礎(K-1)トピックのZustandストア(single source of truth)。
 * Control層(事前分布のα・β選択、n・k・θ0選択、判別の事前確率・xの選択)はsetControlを呼び、
 * Render層(ベータ曲線・ベイズファクター表示・判別境界の描画・数式ハイライト)はこのストアの
 * controls・derivedを購読するだけ(3層疎結合)。
 */
export const useBayesianBasicsStore = createTopicStore<MainControls, MainDerived>({
  initialControls: INITIAL_CONTROLS,
  initialFrameCount: COIN_SEQUENCE.length + 1,
  derive: (controls) => {
    const prior: BetaParams = { alpha: controls.priorAlpha, beta: controls.priorBeta };
    const updateSteps = sequentialUpdates(prior, COIN_SEQUENCE);

    const bf10 = bayesFactor10(controls.bfN, controls.bfK, controls.bfTheta0, {
      alpha: 1,
      beta: 1,
    });
    const priorOdds = priorOddsFromProb(0.5); // 事前オッズ1:1(帰無仮説・対立仮説を五分五分とみなす)を既定にする
    const posteriorOddsH1 = posteriorOddsFromBayesFactor(bf10, priorOdds);

    return {
      updateSteps,
      priorMean: betaMean(prior),
      weakTrajectory: posteriorMeanTrajectory(WEAK_PRIOR_WEIGHT, COIN_SEQUENCE),
      chosenTrajectory: posteriorMeanTrajectory(controls.sensitivityWeight, COIN_SEQUENCE),
      strongTrajectory: posteriorMeanTrajectory(STRONG_PRIOR_WEIGHT, COIN_SEQUENCE),
      bf10,
      bfInterpretation: interpretBayesFactor(bf10),
      pValue: binomialTwoSidedPValue(controls.bfN, controls.bfK, controls.bfTheta0),
      posteriorProbH1: posteriorOddsH1 / (1 + posteriorOddsH1),
      discPosterior: posteriorProbClass1(
        controls.discX,
        controls.discPrior1,
        DISC_CLASS0,
        DISC_CLASS1,
      ),
      discBoundaries: findDecisionBoundaries(
        controls.discPrior1,
        DISC_CLASS0,
        DISC_CLASS1,
        DISC_X_MIN,
        DISC_X_MAX,
      ),
    };
  },
});
