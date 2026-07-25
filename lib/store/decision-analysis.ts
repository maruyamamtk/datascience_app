import {
  buildDecisionTree,
  dominatedActionIndices,
  expectedValueCriterion,
  hurwiczCriterion,
  laplaceCriterion,
  maximaxCriterion,
  maximinCriterion,
  minimaxRegretCriterion,
  PRIMARY_PAYOFF_MATRIX,
  regretMatrix,
  type CriterionResult,
  type PayoffMatrix,
  type TreeNode,
} from "@/lib/stats/decision-analysis";
import { createTopicStore } from "./topicStore";

/** 決定基準の選択肢(利得行列Lab: PayoffMatrixLabの選択スイッチ)。 */
export type CriterionKey = "maximax" | "maximin" | "hurwicz" | "minimax-regret" | "laplace";

// ────────────────────────────────────────────────────────────
// メインストア(single source of truth)
// - 利得行列(セル編集)・決定基準の選択・Hurwiczのα・状態確率p(好況)を操作値に持つ。
// - PayoffMatrixLab / RegretMatrixStepper / ExpectedValueLab / DecisionTreeStepper が
//   このストアの controls・derived を共有して読む(操作→図→数式の強連動)。
// - コマ送りステッパー(Regret・決定木)はframeを共用せず、下の空controlsストアを個別に使う
//   (tasks/lessons.md #76: 1トピックに複数StepPlayerがあるときはストアを分離する)。
// ────────────────────────────────────────────────────────────

export type MainControls = {
  /** 利得行列(payoffs[行動index][状態index])。セルを編集すると全基準が再計算される。 */
  payoffs: number[][];
  /** PayoffMatrixLabで選択中の決定基準。 */
  criterion: CriterionKey;
  /** Hurwicz基準の楽観係数α(0〜1)。 */
  hurwiczAlpha: number;
  /** 状態確率(好況になる確率)。ESV・決定木で使う。不況の確率は1-probGoodとする。 */
  probGood: number;
};

export type MainDerived = {
  actions: string[];
  states: string[];
  maximax: CriterionResult;
  maximin: CriterionResult;
  hurwicz: CriterionResult;
  laplace: CriterionResult;
  regret: number[][];
  minimaxRegret: CriterionResult;
  esv: CriterionResult;
  dominated: number[];
  /** controls.criterionに対応する結果(汎用ハイライトに使う)。 */
  selected: CriterionResult;
  /** 決定木(root=行動を選ぶ決定ノード、その先に確率ノード、末端に利得)。 */
  tree: TreeNode;
};

export const INITIAL_CONTROLS: MainControls = {
  payoffs: PRIMARY_PAYOFF_MATRIX.payoffs.map((row) => [...row]),
  criterion: "maximax",
  hurwiczAlpha: 0.5,
  probGood: 0.5,
};

function toMatrix(controls: MainControls): PayoffMatrix {
  return {
    actions: PRIMARY_PAYOFF_MATRIX.actions,
    states: PRIMARY_PAYOFF_MATRIX.states,
    payoffs: controls.payoffs,
  };
}

function selectResult(controls: MainControls, results: Omit<MainDerived, "selected" | "tree" | "actions" | "states" | "regret" | "dominated">): CriterionResult {
  switch (controls.criterion) {
    case "maximax":
      return results.maximax;
    case "maximin":
      return results.maximin;
    case "hurwicz":
      return results.hurwicz;
    case "minimax-regret":
      return results.minimaxRegret;
    case "laplace":
      return results.laplace;
    default:
      return results.maximax;
  }
}

/**
 * 決定分析(P-1)トピックのZustandストア(single source of truth)。
 * Control層(利得行列のセル編集、決定基準の選択、Hurwiczのα、状態確率)はsetControl/patchControlsを呼び、
 * Render層(利得行列表・決定基準ハイライト・リグレット行列・決定木)はこのストアのcontrols・derivedを
 * 購読するだけ(3層疎結合)。
 */
export const useDecisionAnalysisStore = createTopicStore<MainControls, MainDerived>({
  initialControls: INITIAL_CONTROLS,
  derive: (controls) => {
    const matrix = toMatrix(controls);
    const probabilities = [controls.probGood, 1 - controls.probGood];

    const maximax = maximaxCriterion(matrix);
    const maximin = maximinCriterion(matrix);
    const hurwicz = hurwiczCriterion(matrix, controls.hurwiczAlpha);
    const laplace = laplaceCriterion(matrix);
    const regret = regretMatrix(matrix);
    const minimaxRegret = minimaxRegretCriterion(matrix);
    const esv = expectedValueCriterion(matrix, probabilities);
    const dominated = dominatedActionIndices(matrix);
    const tree = buildDecisionTree(matrix, probabilities);

    const selected = selectResult(controls, { maximax, maximin, hurwicz, laplace, minimaxRegret, esv });

    return {
      actions: [...matrix.actions],
      states: [...matrix.states],
      maximax,
      maximin,
      hurwicz,
      laplace,
      regret,
      minimaxRegret,
      esv,
      dominated,
      selected,
      tree,
    };
  },
});

/**
 * コマ送りステッパー専用の«空controls»ストア(RegretMatrixStepper・DecisionTreeStepperで使う)。
 * フレーム«中身»は各コンポーネントのframes.tsが純関数で作り、ストアはframe(index/count/playing)だけを
 * single source of truthとして提供する——2つのステッパーが同一ページに同時に存在するため、
 * メインストアのframeとは独立させる(tasks/lessons.md #76)。
 */
export type EmptyControls = Record<string, never>;
export type EmptyDerived = Record<string, never>;

export const useRegretStepperStore = createTopicStore<EmptyControls, EmptyDerived>({
  initialControls: {},
  derive: () => ({}),
});

export const useDecisionTreeStepperStore = createTopicStore<EmptyControls, EmptyDerived>({
  initialControls: {},
  derive: () => ({}),
});
