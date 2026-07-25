import { PRIMARY_PAYOFF_MATRIX } from "@/lib/stats/decision-analysis";
import {
  certaintyEquivalentCara,
  classifyRiskAttitudeFromAlpha,
  compareEvAndEuDecisions,
  expectedValue,
  riskPremium,
  type EvEuComparison,
  type RiskAttitude,
} from "@/lib/stats/utility-theory";
import { createTopicStore } from "./topicStore";

// ────────────────────────────────────────────────────────────
// 効用理論(P-4)トピックのストア(single source of truth)。
// - 利得行列は決定分析(P-1)のPRIMARY_PAYOFF_MATRIX(工場稼働台数×景気)をそのまま再利用する
//   (本トピックの主題は"新しいくじを作ること"ではなく"同じ利得行列を期待金額でなく期待効用で
//   評価するとどう変わるか"なので、前提トピックとの連続性を保つ)。
// - 「リスク回避度パラメータα(CARA効用)」と「好況になる確率probGood」の2つが操作値
//   (UtilityDecisionLabがこのストアのcontrols・derivedを読む)。
// - CE・リスクプレミアムの可視化対象は、行列の中で最もハイリスク・ハイリターンな「2台稼働」
//   (好況700/不況−300)のくじ——リスク態度による効用曲線の違いが最も見えやすい行だから選ぶ。
// - ステッパー(StPetersburgStepper・RiskAttitudeStepper)は1トピックに2つあるため、
//   tasks/lessons.md #76の基準どおりメインストアのframeは共用せず、個別の空ストアに分離する。
// ────────────────────────────────────────────────────────────

/** 可視化対象のくじ(2台稼働: 好況700万円/不況−300万円)。 */
export const FOCUS_LOTTERY_OUTCOMES: readonly number[] = [
  PRIMARY_PAYOFF_MATRIX.payoffs[2][0],
  PRIMARY_PAYOFF_MATRIX.payoffs[2][1],
];

export type MainControls = {
  /** CARA効用のリスク回避度パラメータα(α>0:リスク回避的、α=0:リスク中立、α<0:リスク受容的)。 */
  alpha: number;
  /** 好況になる事前確率(不況は1-probGoodとする。決定分析(P-1)と同じ役割)。 */
  probGood: number;
};

export type MainDerived = {
  actions: string[];
  states: string[];
  riskAttitude: RiskAttitude;
  /** 期待金額(ESV)による意思決定と期待効用(EU)による意思決定の比較。 */
  comparison: EvEuComparison;
  /** 可視化対象のくじ(2台稼働)の期待金額 E[X]。 */
  focusExpectedValue: number;
  /** 可視化対象のくじの確実同値額 CE。 */
  focusCertaintyEquivalent: number;
  /** 可視化対象のくじのリスクプレミアム RP=E[X]-CE。 */
  focusRiskPremium: number;
};

export const INITIAL_CONTROLS: MainControls = {
  alpha: 0.002,
  probGood: 0.7,
};

/**
 * 効用理論(P-4)トピックのZustandストア。
 * Control層(α・probGoodのスライダー)はsetControlを呼び、Render層(UtilityDecisionLab等)は
 * このストアのcontrols・derivedを購読するだけ(3層疎結合、CLAUDE.md §2)。
 */
export const useUtilityTheoryStore = createTopicStore<MainControls, MainDerived>({
  initialControls: INITIAL_CONTROLS,
  derive: (controls) => {
    const matrix = PRIMARY_PAYOFF_MATRIX;
    const probabilities = [controls.probGood, 1 - controls.probGood];

    const comparison = compareEvAndEuDecisions(matrix, probabilities, controls.alpha);
    const focusExpectedValue = expectedValue(FOCUS_LOTTERY_OUTCOMES, probabilities);
    const focusCertaintyEquivalent = certaintyEquivalentCara(
      FOCUS_LOTTERY_OUTCOMES,
      probabilities,
      controls.alpha,
    );
    const focusRiskPremium = riskPremium(FOCUS_LOTTERY_OUTCOMES, probabilities, controls.alpha);

    return {
      actions: [...matrix.actions],
      states: [...matrix.states],
      riskAttitude: classifyRiskAttitudeFromAlpha(controls.alpha),
      comparison,
      focusExpectedValue,
      focusCertaintyEquivalent,
      focusRiskPremium,
    };
  },
});

/**
 * コマ送りステッパー専用の«空controls»ストア(StPetersburgStepper・RiskAttitudeStepperで使う)。
 * フレーム«中身»は各コンポーネントのframes.tsが純関数で作り、ストアはframe(index/count/playing)だけを
 * single source of truthとして提供する——2つのステッパーが同一ページに同時に存在するため、
 * メインストアのframeとは独立させる(tasks/lessons.md #76)。
 */
export type EmptyControls = Record<string, never>;
export type EmptyDerived = Record<string, never>;

export const useStPetersburgStepperStore = createTopicStore<EmptyControls, EmptyDerived>({
  initialControls: {},
  derive: () => ({}),
});

export const useRiskAttitudeStepperStore = createTopicStore<EmptyControls, EmptyDerived>({
  initialControls: {},
  derive: () => ({}),
});
