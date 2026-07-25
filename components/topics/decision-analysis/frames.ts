/**
 * RegretMatrixStepper(L1)・DecisionTreeStepper(L2)のフレーム構築(純関数・Vitest対象)。
 * 各ステッパーは`@/lib/stats/decision-analysis`の純関数から中間結果を取り出し、
 * コマ送り(StepPlayer)の1コマずつのcallout付きVizFrameへ変換する。
 */
import type { VizFrame } from "@/components/viz";
import {
  backwardInductionSteps,
  colMax,
  regretMatrix,
  type PayoffMatrix,
  type TreeNode,
} from "@/lib/stats/decision-analysis";
import { num } from "./format";

// ────────────────────────────────────────────────────────────
// RegretMatrixStepper(L1): 利得行列 → リグレット行列 → Minimax regretの選択
// ────────────────────────────────────────────────────────────

export type RegretFramePayload = {
  phase: "highlight-max" | "reveal-regret" | "final";
  /** このフレームが対象とする状態のindex(finalではnull)。 */
  stateIndex: number | null;
  /** リグレットが確定済みの状態index一覧(表の描画に使う)。 */
  revealedStates: number[];
  /** finalフレームでのみ使う: 各行動の最大リグレットとMinimax regretが選ぶ行動。 */
  maxRegrets?: number[];
  bestIndex?: number;
};

function argminOf(values: readonly number[]): number {
  let best = 0;
  for (let i = 1; i < values.length; i++) if (values[i] < values[best]) best = i;
  return best;
}

/**
 * リグレット行列の構築過程を、状態(列)ごとに「①最大利得を探す→②リグレットを計算する」の
 * 2コマに分解し、最後に「各行動の最大リグレットを比べてMinimax regretを選ぶ」フレームを1つ追加する。
 * 総フレーム数 = states.length*2 + 1。
 */
export function buildRegretFrames(matrix: PayoffMatrix): VizFrame<RegretFramePayload>[] {
  const cMax = colMax(matrix);
  const regret = regretMatrix(matrix);
  const frames: VizFrame<RegretFramePayload>[] = [];

  matrix.states.forEach((stateLabel, s) => {
    const revealedBefore = matrix.states.slice(0, s).map((_, i) => i);
    const bestActionForState = matrix.payoffs.reduce(
      (bi, row, i) => (row[s] > matrix.payoffs[bi][s] ? i : bi),
      0,
    );

    frames.push({
      highlights: [`col-max-${s}`],
      payload: { phase: "highlight-max", stateIndex: s, revealedStates: revealedBefore },
      callout: {
        title: `状態「${stateLabel}」列の最大利得を探す`,
        body: `${stateLabel}のとき最も利得が大きいのは「${matrix.actions[bestActionForState]}」(${num(
          cMax[s],
        )})——この列の"もし最善の行動を選んでいたら得られたはずの利得"の基準点になる。`,
        note: "リグレット(後悔)は、この最大利得からの差で測る。",
        kind: "explain",
      },
    });

    frames.push({
      highlights: [`col-max-${s}`, `regret-col-${s}`],
      payload: {
        phase: "reveal-regret",
        stateIndex: s,
        revealedStates: [...revealedBefore, s],
      },
      callout: {
        title: `状態「${stateLabel}」列のリグレットを計算`,
        body: matrix.actions
          .map((a, i) => `${a}: ${num(cMax[s])}−${num(matrix.payoffs[i][s])}=${num(regret[i][s])}`)
          .join("、"),
        note: "リグレットが0の行動は、その状態については最善の選択だったことを意味する。",
        kind: "supplement",
      },
    });
  });

  const maxRegrets = regret.map((row) => Math.max(...row));
  const bestIndex = argminOf(maxRegrets);
  frames.push({
    highlights: [`regret-row-${bestIndex}`],
    payload: {
      phase: "final",
      stateIndex: null,
      revealedStates: matrix.states.map((_, i) => i),
      maxRegrets,
      bestIndex,
    },
    callout: {
      title: "各行動の最大リグレットを比較(Minimax regret)",
      body: `各行動の最大リグレットは ${matrix.actions
        .map((a, i) => `${a}=${num(maxRegrets[i])}`)
        .join("、")}。この中で最小の「${matrix.actions[bestIndex]}」を選ぶ。`,
      note: "「どの状態が起きても後悔が一定以上大きくならない」行動を選ぶ、という考え方。",
      kind: "explain",
    },
  });

  return frames;
}

// ────────────────────────────────────────────────────────────
// DecisionTreeStepper(L2): 後ろ向き帰納法(バックワードインダクション)
// ────────────────────────────────────────────────────────────

export type TreeFramePayload = {
  /** これまでに値が確定したノードid一覧。 */
  computedIds: string[];
  /** 今このフレームで新たに計算するノードid(初期フレームではnull)。 */
  currentId: string | null;
  /** 決定ノードが確定した後にのみ設定される、選ばれた枝id。 */
  chosenBranchId?: string;
};

function nodeLabelFor(node: TreeNode): string {
  return node.label;
}

/**
 * 後ろ向き帰納法を1ノードずつ計算していく過程をコマ送りにする。
 * フレーム0は「末端の利得だけが見えている(何も計算していない)」初期状態、
 * 以降は`backwardInductionSteps`の順(確率ノード→決定ノード)で1つずつ値が確定していく。
 * 総フレーム数 = backwardInductionSteps(root).length + 1。
 */
export function buildTreeFrames(root: TreeNode): VizFrame<TreeFramePayload>[] {
  const steps = backwardInductionSteps(root);
  const frames: VizFrame<TreeFramePayload>[] = [
    {
      highlights: [],
      payload: { computedIds: [], currentId: null },
      callout: {
        title: "末端の利得だけが分かっている状態",
        body: "決定木の末端(葉)には、利得行列と同じ数値がそのまま入っている。ここから根に向かって、後ろ向き(バックワード)に値を計算していく。",
        note: "▶ 再生で、確率ノード→決定ノードの順に値が確定していく様子を見よう。",
        kind: "explain",
      },
    },
  ];

  const computedIds: string[] = [];
  steps.forEach((step) => {
    const isDecision = step.node.kind === "decision";
    const body = isDecision
      ? `決定ノード「${nodeLabelFor(step.node)}」: 子(各行動)の期待値のうち最大の ${num(
          step.value,
        )} を選ぶ。`
      : `確率ノード「${nodeLabelFor(step.node)}」: 各枝の(確率×子の値)を足し合わせた期待値は ${num(
          step.value,
        )}。`;
    frames.push({
      highlights: [step.node.id],
      payload: {
        computedIds: [...computedIds],
        currentId: step.node.id,
        chosenBranchId: step.chosenBranchId,
      },
      callout: {
        title: isDecision ? "決定ノードで最大の枝を選ぶ" : "確率ノードの期待値を計算",
        body,
        note: isDecision
          ? "これが後ろ向き帰納法の最終結果——期待値による意思決定と同じ答えになる。"
          : undefined,
        kind: isDecision ? "explain" : "supplement",
      },
    });
    computedIds.push(step.node.id);
  });

  return frames;
}
