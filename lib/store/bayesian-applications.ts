import { twoProportionTest, type TwoPropResult } from "@/lib/stats/ab-test";
import {
  AB_MC_SAMPLES,
  AB_OBSERVATIONS,
  DEFAULT_ITEMS,
  DEFAULT_RESPONSES,
  ICC_COMPARISON_ITEMS,
  UNIFORM_PRIOR,
  answeredCount,
  correctCount,
  estimateAbComparison,
  irtProbability,
  likelihoodCurve,
  mleTheta,
  sequentialAbUpdates,
  variantPosterior,
  type AbMonteCarloResult,
  type AbSequentialStep,
  type BetaParams,
  type LikelihoodCurvePoint,
} from "@/lib/stats/bayesian-applications";
import { createTopicStore } from "./topicStore";

// ────────────────────────────────────────────────────────────
// 固定データ(controlsに依存しない、モジュール定数として一度だけ計算する)
// ────────────────────────────────────────────────────────────

/** A/B観測ステッパー(Level1)の全ステップ(controlsに依存しないため事前計算)。frameのcountに使う。 */
export const AB_SEQUENTIAL_STEPS: AbSequentialStep[] = sequentialAbUpdates(
  UNIFORM_PRIOR,
  AB_OBSERVATIONS,
  AB_MC_SAMPLES,
);

export { DEFAULT_ITEMS, ICC_COMPARISON_ITEMS };

export type MainControls = {
  /** L0: AバリアントのコンバージョンLab(スライダー)。 */
  successesA: number;
  trialsA: number;
  /** L0: BバリアントのコンバージョンLab(スライダー)。 */
  successesB: number;
  trialsB: number;
  /** L2: ICC比較Labで動かす能力θ。 */
  iccTheta: number;
  /** L2: 尤度ラボの回答パターン(DEFAULT_ITEMSと同じ順、未回答はundefined)。 */
  itemResponses: (0 | 1 | undefined)[];
};

export type MainDerived = {
  posteriorA: BetaParams;
  posteriorB: BetaParams;
  mcResult: AbMonteCarloResult;
  freqResult: TwoPropResult;
  iccProbs: { theta: number; p: number }[];
  likelihood: LikelihoodCurvePoint[];
  mleThetaEstimate: number;
  answered: number;
  correct: number;
};

export const INITIAL_CONTROLS: MainControls = {
  successesA: 8,
  trialsA: 40,
  successesB: 14,
  trialsB: 40,
  iccTheta: 0,
  itemResponses: [...DEFAULT_RESPONSES],
};

/**
 * ベイズ応用(K-4)トピックのZustandストア(single source of truth)。
 * Control層(コンバージョン数・試行数のスライダー、θスライダー、回答パターンのトグル)はsetControl/patchControlsを
 * 呼び、Render層(ベータ曲線・ICC・尤度曲線・数式ハイライト)はこのストアのcontrols・derivedを購読するだけ
 * (3層疎結合)。A/B観測ステッパー(Level1)はこのページで唯一のStepPlayerなので
 * (tasks/lessons.md #76の判断目安どおり)mainストアのframeを共用する。
 */
export const useBayesianApplicationsStore = createTopicStore<MainControls, MainDerived>({
  initialControls: INITIAL_CONTROLS,
  initialFrameCount: AB_SEQUENTIAL_STEPS.length,
  derive: (controls) => {
    const posteriorA = variantPosterior(UNIFORM_PRIOR, {
      label: "A",
      conversions: controls.successesA,
      visitors: controls.trialsA,
    });
    const posteriorB = variantPosterior(UNIFORM_PRIOR, {
      label: "B",
      conversions: controls.successesB,
      visitors: controls.trialsB,
    });
    const mcResult = estimateAbComparison(posteriorA, posteriorB);
    const freqResult = twoProportionTest({
      x1: controls.successesA,
      n1: controls.trialsA,
      x2: controls.successesB,
      n2: controls.trialsB,
    });

    const iccProbs = ICC_COMPARISON_ITEMS.map((item) => ({
      theta: controls.iccTheta,
      p: irtProbability(controls.iccTheta, item),
    }));

    const likelihood = likelihoodCurve(DEFAULT_ITEMS, controls.itemResponses);
    const mleThetaEstimate = mleTheta(DEFAULT_ITEMS, controls.itemResponses);

    return {
      posteriorA,
      posteriorB,
      mcResult,
      freqResult,
      iccProbs,
      likelihood,
      mleThetaEstimate,
      answered: answeredCount(controls.itemResponses),
      correct: correctCount(controls.itemResponses),
    };
  },
});
