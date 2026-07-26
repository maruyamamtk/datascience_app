import { PRIMARY_PAYOFF_MATRIX, type PayoffMatrix } from "@/lib/stats/decision-analysis";
import {
  DEFAULT_DISCOUNT,
  DEFAULT_PERIODS,
  DEFAULT_PERSISTENCE,
  backwardInduction,
  chronological,
  economyTransition,
  type PeriodResult,
  type SequentialDecisionProblem,
  type TransitionMatrix,
} from "@/lib/stats/sequential-decision";
import { createTopicStore } from "./topicStore";

/** 選択中のセル(期,状態)。L2のMdpLabでクリックした格子セルとBellman方程式の数式を連動させる。 */
export type SelectedCell = { period: number; stateIndex: number };

// ────────────────────────────────────────────────────────────
// メインストア(single source of truth)
// - 景気の続きやすさ(persistence)・割引率γ・期間数T・選択中セルを操作値に持つ。
// - PolicyLab(L0) / MdpLab(L2) がこのストアのcontrols・derivedを共有して読む(操作→図→数式の強連動)。
// - コマ送りステッパー(BackwardInductionStepper, L1)はframeを共用せず、下の空controlsストアを
//   個別に使う(tasks/lessons.md: 複数StepPlayerが同一ページに共存するときはストアを分離する)。
// ────────────────────────────────────────────────────────────

export type MainControls = {
  /** 景気の続きやすさ P(好況→好況)=P(不況→不況)(0〜1)。markov-chainsのrainStickと同じ発想。 */
  persistence: number;
  /** 割引率γ(0〜1)。将来の価値をどれだけ今の価値として重視するか。 */
  discount: number;
  /** 期間数T(意思決定が行われる時点の数)。 */
  periods: number;
  /** MdpLabで選択中の格子セル(期,状態)。Bellman方程式の数式ハイライトに使う。nullは未選択。 */
  selectedCell: SelectedCell | null;
};

export type MainDerived = {
  actions: string[];
  states: string[];
  matrix: PayoffMatrix;
  transition: TransitionMatrix;
  problem: SequentialDecisionProblem;
  /** 計算順(t=T→1)の結果。 */
  resultsBackward: PeriodResult[];
  /** 時系列順(t=1→T)の結果。政策表・PolicyLabで使う。 */
  resultsChronological: PeriodResult[];
};

export const INITIAL_CONTROLS: MainControls = {
  persistence: DEFAULT_PERSISTENCE,
  discount: DEFAULT_DISCOUNT,
  periods: DEFAULT_PERIODS,
  selectedCell: null,
};

/**
 * 逐次決定(P-6)トピックのZustandストア(single source of truth)。
 * Control層(景気の続きやすさ・割引率・期間数のスライダー、格子セルのクリック)はsetControl/patchControlsを
 * 呼び、Render層(政策表・価値関数の格子・Bellman方程式)はこのストアのcontrols・derivedを購読するだけ
 * (3層疎結合)。decision-analysisの利得行列(PRIMARY_PAYOFF_MATRIX)をそのまま毎期の即時報酬として使う。
 */
export const useSequentialDecisionStore = createTopicStore<MainControls, MainDerived>({
  initialControls: INITIAL_CONTROLS,
  derive: (controls) => {
    const matrix = PRIMARY_PAYOFF_MATRIX;
    const transition = economyTransition(controls.persistence);
    const problem: SequentialDecisionProblem = {
      matrix,
      transition,
      periods: controls.periods,
      discount: controls.discount,
    };
    const resultsBackward = backwardInduction(problem);
    const resultsChronological = chronological(resultsBackward);

    return {
      actions: [...matrix.actions],
      states: [...matrix.states],
      matrix,
      transition,
      problem,
      resultsBackward,
      resultsChronological,
    };
  },
});

/**
 * BackwardInductionStepper(L1)専用の«空controls»ストア。フレーム«中身»(格子セルの計算過程)は
 * frames.tsが純関数で作り、ストアはframe(index/count/playing)だけをsingle source of truthとして
 * 提供する(tasks/lessons.md: 複数ステッパー共存時はストアを分離する)。
 */
export type EmptyControls = Record<string, never>;
export type EmptyDerived = Record<string, never>;

export const useBackwardInductionStepperStore = createTopicStore<EmptyControls, EmptyDerived>({
  initialControls: {},
  derive: () => ({}),
});
