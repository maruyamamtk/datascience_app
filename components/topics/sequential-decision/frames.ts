/**
 * BackwardInductionStepper(L1)のフレーム構築(純関数・Vitest対象)。
 * `@/lib/stats/sequential-decision`のbackwardInductionCellsから中間結果を取り出し、
 * コマ送り(StepPlayer)の1コマずつのcallout付きVizFrameへ変換する。
 * decision-analysisのDecisionTreeStepper用frames.ts(post-orderで1ノードずつ確定)と同じ設計を
 * 「期×状態の格子」に適用したもの。
 */
import type { VizFrame } from "@/components/viz";
import {
  backwardInductionCells,
  type SequentialDecisionProblem,
} from "@/lib/stats/sequential-decision";
import { num } from "./format";

export type CellKey = { period: number; stateIndex: number };

export type BackwardInductionFramePayload = {
  /** これまでに値が確定したセル一覧(period, stateIndex)。 */
  computed: CellKey[];
  /** 今このフレームで新たに計算するセル(初期フレームではnull)。 */
  current:
    | (CellKey & { qValues: number[]; value: number; actionIndex: number })
    | null;
  /** 総期間数(格子の列数を描くのに使う)。 */
  periods: number;
};

/**
 * 後ろ向き帰納法を1セル(期,状態)ずつ計算していく過程をコマ送りにする。
 * フレーム0は「まだ何も計算していない(格子が空)」初期状態、以降は
 * backwardInductionCellsの順(期T→1、各期は状態の順)で1セルずつ値が確定していく。
 * 総フレーム数 = periods*states.length + 1。
 */
export function buildBackwardInductionFrames(
  problem: SequentialDecisionProblem,
): VizFrame<BackwardInductionFramePayload>[] {
  const cells = backwardInductionCells(problem);
  const { actions, states } = problem.matrix;

  const frames: VizFrame<BackwardInductionFramePayload>[] = [
    {
      payload: { computed: [], current: null, periods: problem.periods },
      callout: {
        title: "まだ何も計算していない状態",
        body: `期間はt=1〜${problem.periods}(全${problem.periods}期)、状態は${states.join(
          "・",
        )}の${states.length}通り。最終期(t=${problem.periods})には「その先」がないので、まずそこから計算できる。`,
        note: "▶ 再生で、最終期→過去へ、1セルずつ価値関数V_t(s)が確定していく様子を見よう。",
        kind: "explain",
      },
    },
  ];

  const computed: CellKey[] = [];
  cells.forEach((cell) => {
    const isFirstOfLastPeriod = cell.period === problem.periods && cell.stateIndex === 0;
    const qLine = actions
      .map((a, ai) => `${a}:${num(cell.qValues[ai])}`)
      .join("、");
    const isLastPeriod = cell.period === problem.periods;
    const body = isLastPeriod
      ? `t=${cell.period}(最終期)・状態「${states[cell.stateIndex]}」: 先がないので即時報酬だけを比べる。Q値=[${qLine}] → 最大は「${
          actions[cell.actionIndex]
        }」(V=${num(cell.value)})。`
      : `t=${cell.period}・状態「${states[cell.stateIndex]}」: Q(a)=即時報酬+γ×Σ次状態の確率×V_{t+1}(次状態)。Q値=[${qLine}] → 最大は「${
          actions[cell.actionIndex]
        }」(V=${num(cell.value)})。`;

    frames.push({
      payload: {
        computed: [...computed],
        current: { ...cell },
        periods: problem.periods,
      },
      callout: {
        title: isFirstOfLastPeriod
          ? `最終期(t=${cell.period})から計算を始める`
          : `t=${cell.period}・状態「${states[cell.stateIndex]}」を計算`,
        body,
        note: isLastPeriod
          ? "最終期はΣ次状態の項がない(将来がないため)——期待値による意思決定(ESV)の1期版そのもの。"
          : "1期先の価値関数V_{t+1}(s')はすでに確定済み(右側の列)なので、それを使って今の期を計算できる。",
        kind: isLastPeriod ? "explain" : "supplement",
      },
    });
    computed.push({ period: cell.period, stateIndex: cell.stateIndex });
  });

  return frames;
}
