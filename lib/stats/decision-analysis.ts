/**
 * 決定分析(P-1)の計算層(純関数・副作用なし・Vitest対象)。
 *
 * 扱う道具(SPEC §3 P-1「利得行列、決定基準（Maximax/Maximin/Hurwicz/Minimax regret/Laplace）、
 * 期待値による意思決定、決定木」出典: 『意思決定分析と予測の活用』第2部「決定分析の基本」第1・3・4章):
 *
 * - 利得行列: 意思決定問題 D={A,Θ,c}(行動空間A・状態空間Θ・利得c(a,θ))を表に落としたもの。
 * - 5つの決定基準(確率なし): Maximax(楽観)・Maximin(悲観)・Hurwicz(楽観係数αで加重)・
 *   Minimax regret(後悔=リグレットの最大値を最小化)・Laplace(等確率とみなした平均利得最大化)。
 * - 期待値による意思決定(ESV, Expected State Value): 自然の状態の確率が既知(リスク下)のとき
 *   期待利得を最大化する。
 * - 決定木: 決定ノード(□, 意思決定者が選ぶ)と確率ノード(○, 自然の状態が確率的に決まる)からなる木を
 *   後ろ向き帰納法(バックワードインダクション、末端から親へ畳み込む)で解く。
 *
 * 具体例(CLAUDE.md「まず小さな具体例で原理を見せる」/「Bookmemoを一次情報に」):
 * 出典第2章の工場稼働の例をそのまま使う——行動=稼働台数(0台/1台/2台)、
 * 状態=景気(好況/不況)、利得=売上-製造コストの試算値。
 * 乱数を使わないためSSR/CSRのハイドレーション不一致の心配は生じない(固定データ)。
 */

// ────────────────────────────────────────────────────────────
// 利得行列
// ────────────────────────────────────────────────────────────

/** 利得行列。payoffs[行動index][状態index]。 */
export type PayoffMatrix = {
  /** 行動(選択肢)のラベル。 */
  actions: readonly string[];
  /** 自然の状態のラベル。 */
  states: readonly string[];
  /** payoffs[i][j] = 行動 actions[i] を選び 状態 states[j] が起きたときの利得。 */
  payoffs: readonly (readonly number[])[];
};

/** 決定基準が計算した各行動のスコアと、その基準が選ぶ行動のindex。 */
export type CriterionResult = {
  /** 行動ごとのスコア(基準により意味が異なる: 最大利得・最小利得・Hurwicz加重・平均利得・最大リグレット・期待利得)。 */
  scores: number[];
  /** 基準が選ぶ(最善とする)行動のindex。 */
  bestIndex: number;
};

/**
 * 出典第2章のPandas例そのもの(工場の稼働台数×景気の利得行列、単位: 万円)。
 * 0台は稼働コストのみでほぼ確実な赤字、2台は好況なら大きく儲かるが不況では大きく損する
 * ハイリスク・ハイリターン——決定基準ごとに選ぶ行動が割れる、決定分析の教材として典型的な形。
 */
export const PRIMARY_PAYOFF_MATRIX: PayoffMatrix = {
  actions: ["0台稼働", "1台稼働", "2台稼働"],
  states: ["好況", "不況"],
  payoffs: [
    [-100, -100],
    [300, 300],
    [700, -300],
  ],
};

/** 自然の状態が等確率でないとき(既定はESV/決定木で使う「好況になる確率」)。 */
export const DEFAULT_PROB_GOOD = 0.5;

function argmax(values: readonly number[]): number {
  let best = 0;
  for (let i = 1; i < values.length; i++) if (values[i] > values[best]) best = i;
  return best;
}

function argmin(values: readonly number[]): number {
  let best = 0;
  for (let i = 1; i < values.length; i++) if (values[i] < values[best]) best = i;
  return best;
}

/** 行動ごとの最大利得(各行の最大値)。 */
export function rowMax(matrix: PayoffMatrix): number[] {
  return matrix.payoffs.map((row) => Math.max(...row));
}

/** 行動ごとの最小利得(各行の最小値)。 */
export function rowMin(matrix: PayoffMatrix): number[] {
  return matrix.payoffs.map((row) => Math.min(...row));
}

/** 行動ごとの平均利得(各行の算術平均)。 */
export function rowMean(matrix: PayoffMatrix): number[] {
  return matrix.payoffs.map((row) => row.reduce((s, v) => s + v, 0) / row.length);
}

/** 状態ごとの最大利得(各列の最大値。Minimax regretの基準点になる)。 */
export function colMax(matrix: PayoffMatrix): number[] {
  return matrix.states.map((_, s) => Math.max(...matrix.payoffs.map((row) => row[s])));
}

/**
 * Maximax基準(最も楽観的): 各行動の最大利得のうち最大のものを選ぶ。
 * 「うまくいったときの上振れ」だけを見て、下振れリスクは無視する。
 */
export function maximaxCriterion(matrix: PayoffMatrix): CriterionResult {
  const scores = rowMax(matrix);
  return { scores, bestIndex: argmax(scores) };
}

/**
 * Maximin基準(最も悲観的): 各行動の最小利得(最悪の場合)のうち最大のものを選ぶ。
 * 「最悪の場合にどれだけマシか」だけを見る、リスク回避的な基準。
 */
export function maximinCriterion(matrix: PayoffMatrix): CriterionResult {
  const scores = rowMin(matrix);
  return { scores, bestIndex: argmax(scores) };
}

/**
 * Hurwicz基準: 楽観係数α(0〜1)で最大利得と最小利得を加重平均し、最大のものを選ぶ。
 * α=1でMaximax、α=0でMaximinと一致する(2つの極端な基準を連続的につなぐ)。
 */
export function hurwiczCriterion(matrix: PayoffMatrix, alpha: number): CriterionResult {
  const a = Math.min(1, Math.max(0, alpha));
  const maxes = rowMax(matrix);
  const mins = rowMin(matrix);
  const scores = maxes.map((mx, i) => a * mx + (1 - a) * mins[i]);
  return { scores, bestIndex: argmax(scores) };
}

/**
 * Laplace基準: 自然の状態がすべて等確率だとみなし(「理由不十分の原則」)、
 * 各行動の平均利得が最大のものを選ぶ。
 */
export function laplaceCriterion(matrix: PayoffMatrix): CriterionResult {
  const scores = rowMean(matrix);
  return { scores, bestIndex: argmax(scores) };
}

/**
 * リグレット(後悔・機会損失)行列: regret[i][j] = (状態jでの最大利得) − (行動iを選んだときの利得)。
 * 「その状態が実際に起きたと後から分かったとき、最善の行動を選んでいれば得られたはずの利得との差」。
 */
export function regretMatrix(matrix: PayoffMatrix): number[][] {
  const cMax = colMax(matrix);
  return matrix.payoffs.map((row) => row.map((v, s) => cMax[s] - v));
}

/**
 * Minimax regret基準: リグレット行列の行ごとの最大値(最悪の後悔)のうち、最小のものを選ぶ。
 * 「どの状態が起きても、後悔が一定以上大きくならない」行動を選ぶ基準。
 */
export function minimaxRegretCriterion(matrix: PayoffMatrix): CriterionResult {
  const regret = regretMatrix(matrix);
  const scores = regret.map((row) => Math.max(...row));
  return { scores, bestIndex: argmin(scores) };
}

/**
 * 期待値による意思決定(ESV: Expected State Value)。自然の状態の確率が既知(リスク下)のとき、
 * ESV(a)=Σ_θ P(θ)c(a,θ) が最大の行動を選ぶ。probabilities は matrix.states と同じ長さ・合計1を想定。
 */
export function expectedValueCriterion(
  matrix: PayoffMatrix,
  probabilities: readonly number[],
): CriterionResult {
  if (probabilities.length !== matrix.states.length) {
    throw new Error("probabilities の長さは states の数と一致させる必要がある");
  }
  const scores = matrix.payoffs.map((row) =>
    row.reduce((sum, v, s) => sum + v * probabilities[s], 0),
  );
  return { scores, bestIndex: argmax(scores) };
}

/**
 * 優越される行動(dominated action)のindex一覧。行動iが行動jに「弱優越」される
 * (すべての状態でj≥i、かつ少なくとも1つの状態でj>i)とき、iは最初に排除できる。
 */
export function dominatedActionIndices(matrix: PayoffMatrix): number[] {
  const n = matrix.payoffs.length;
  const dominated: number[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const weaklyBetterEverywhere = matrix.payoffs[j].every((v, s) => v >= matrix.payoffs[i][s]);
      const strictlyBetterSomewhere = matrix.payoffs[j].some((v, s) => v > matrix.payoffs[i][s]);
      if (weaklyBetterEverywhere && strictlyBetterSomewhere) {
        dominated.push(i);
        break;
      }
    }
  }
  return dominated;
}

// ────────────────────────────────────────────────────────────
// 決定木(デシジョンツリー): 決定ノード(□)・確率ノード(○)・末端(利得)
// ────────────────────────────────────────────────────────────

/** 決定木のノード(判別共用体)。 */
export type TreeNode =
  | { id: string; kind: "terminal"; label: string; value: number }
  | {
      id: string;
      kind: "chance";
      label: string;
      branches: readonly { id: string; label: string; probability: number; child: TreeNode }[];
    }
  | {
      id: string;
      kind: "decision";
      label: string;
      branches: readonly { id: string; label: string; child: TreeNode }[];
    };

/**
 * 評価結果: このノードの(期待/最適)利得の値。決定ノードのときは選ばれた枝のidも返す。
 */
export type EvaluatedNode = {
  value: number;
  chosenBranchId?: string;
};

/**
 * 後ろ向き帰納法(バックワードインダクション)で1ノードを評価する再帰関数。
 * - 末端: そのまま利得を返す。
 * - 確率ノード: Σ probability × 子の評価値(期待値)。
 * - 決定ノード: 子の評価値が最大の枝を選ぶ(その値と選んだ枝idを返す)。
 */
export function evaluateTreeNode(node: TreeNode): EvaluatedNode {
  if (node.kind === "terminal") return { value: node.value };
  if (node.kind === "chance") {
    const value = node.branches.reduce(
      (sum, b) => sum + b.probability * evaluateTreeNode(b.child).value,
      0,
    );
    return { value };
  }
  // decision
  let bestValue = Number.NEGATIVE_INFINITY;
  let chosenBranchId: string | undefined;
  for (const b of node.branches) {
    const v = evaluateTreeNode(b.child).value;
    if (v > bestValue) {
      bestValue = v;
      chosenBranchId = b.id;
    }
  }
  return { value: bestValue, chosenBranchId };
}

/**
 * ノードを post-order(子→親、末端に近い側から)で列挙する。末端は「計算不要(すでに値がある)」
 * ため含めない——ステッパーで「計算する」対象(確率ノード・決定ノード)だけを順番に返す。
 */
export function collectPostOrder(node: TreeNode): TreeNode[] {
  if (node.kind === "terminal") return [];
  const childNodes = node.branches.flatMap((b) => collectPostOrder(b.child));
  return [...childNodes, node];
}

export type BackwardInductionStep = {
  node: TreeNode;
  value: number;
  chosenBranchId?: string;
};

/**
 * 後ろ向き帰納法の1コマずつの計算ステップ(post-order)。末端から近い確率ノードが先に計算され、
 * 最後に根の決定ノードが「子の中で最大の枝」を選ぶ——コマ送り(StepPlayer)でそのまま使える。
 */
export function backwardInductionSteps(root: TreeNode): BackwardInductionStep[] {
  return collectPostOrder(root).map((node) => {
    const r = evaluateTreeNode(node);
    return { node, value: r.value, chosenBranchId: r.chosenBranchId };
  });
}

/**
 * 利得行列と状態確率から、決定分析の決定木を機械的に組み立てる。
 * 根が「行動を選ぶ」決定ノード、各行動の先に「状態が決まる」確率ノード、その先が利得の末端
 * ——このトピックの利得行列と1対1に対応する木(期待値による意思決定と同じ計算を木で表現する)。
 */
export function buildDecisionTree(
  matrix: PayoffMatrix,
  probabilities: readonly number[],
  rootLabel = "行動を選ぶ",
): TreeNode {
  if (probabilities.length !== matrix.states.length) {
    throw new Error("probabilities の長さは states の数と一致させる必要がある");
  }
  return {
    id: "root",
    kind: "decision",
    label: rootLabel,
    branches: matrix.actions.map((actionLabel, ai) => ({
      id: `action-${ai}`,
      label: actionLabel,
      child: {
        id: `chance-${ai}`,
        kind: "chance",
        label: "自然の状態",
        branches: matrix.states.map((stateLabel, si) => ({
          id: `chance-${ai}-${si}`,
          label: stateLabel,
          probability: probabilities[si],
          child: {
            id: `terminal-${ai}-${si}`,
            kind: "terminal",
            label: stateLabel,
            value: matrix.payoffs[ai][si],
          },
        })),
      },
    })),
  };
}
