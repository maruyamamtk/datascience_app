import { describe, expect, it } from "vitest";
import {
  buildDecisionTree,
  backwardInductionSteps,
  colMax,
  collectPostOrder,
  dominatedActionIndices,
  evaluateTreeNode,
  expectedValueCriterion,
  hurwiczCriterion,
  laplaceCriterion,
  maximaxCriterion,
  maximinCriterion,
  minimaxRegretCriterion,
  PRIMARY_PAYOFF_MATRIX,
  regretMatrix,
  rowMax,
  rowMean,
  rowMin,
  type PayoffMatrix,
} from "./decision-analysis";

// 出典第2章の工場稼働の例(0台/1台/2台 × 好況/不況、単位: 万円)で
// 手計算した期待値と照合する(CLAUDE.md「数式を誤魔化さない」の検証版)。
describe("利得行列の基本統計量", () => {
  it("rowMax: 各行動の最大利得", () => {
    expect(rowMax(PRIMARY_PAYOFF_MATRIX)).toEqual([-100, 300, 700]);
  });
  it("rowMin: 各行動の最小利得", () => {
    expect(rowMin(PRIMARY_PAYOFF_MATRIX)).toEqual([-100, 300, -300]);
  });
  it("rowMean: 各行動の平均利得", () => {
    expect(rowMean(PRIMARY_PAYOFF_MATRIX)).toEqual([-100, 300, 200]);
  });
  it("colMax: 各状態の最大利得", () => {
    expect(colMax(PRIMARY_PAYOFF_MATRIX)).toEqual([700, 300]);
  });
});

describe("Maximax基準(楽観的)", () => {
  it("各行動の最大利得のうち最大の2台稼働(700)を選ぶ", () => {
    const r = maximaxCriterion(PRIMARY_PAYOFF_MATRIX);
    expect(r.scores).toEqual([-100, 300, 700]);
    expect(r.bestIndex).toBe(2);
  });
});

describe("Maximin基準(悲観的)", () => {
  it("各行動の最小利得のうち最大の1台稼働(300)を選ぶ(2台は最悪-300で不利)", () => {
    const r = maximinCriterion(PRIMARY_PAYOFF_MATRIX);
    expect(r.scores).toEqual([-100, 300, -300]);
    expect(r.bestIndex).toBe(1);
  });
});

describe("Hurwicz基準", () => {
  it("α=0.5では1台稼働(300)を選ぶ(2台のスコアは0.5*700+0.5*(-300)=200)", () => {
    const r = hurwiczCriterion(PRIMARY_PAYOFF_MATRIX, 0.5);
    expect(r.scores[2]).toBeCloseTo(200, 6);
    expect(r.bestIndex).toBe(1);
  });
  it("α=0(Maximinと一致)", () => {
    const hurwicz = hurwiczCriterion(PRIMARY_PAYOFF_MATRIX, 0);
    const maximin = maximinCriterion(PRIMARY_PAYOFF_MATRIX);
    expect(hurwicz.scores).toEqual(maximin.scores);
  });
  it("α=1(Maximaxと一致)", () => {
    const hurwicz = hurwiczCriterion(PRIMARY_PAYOFF_MATRIX, 1);
    const maximax = maximaxCriterion(PRIMARY_PAYOFF_MATRIX);
    expect(hurwicz.scores).toEqual(maximax.scores);
  });
  it("交点はα=0.6(それ未満は1台、それ以上は2台が優位)", () => {
    const below = hurwiczCriterion(PRIMARY_PAYOFF_MATRIX, 0.59);
    const above = hurwiczCriterion(PRIMARY_PAYOFF_MATRIX, 0.61);
    expect(below.bestIndex).toBe(1);
    expect(above.bestIndex).toBe(2);
  });
  it("範囲外のαは0〜1にクランプする", () => {
    const over = hurwiczCriterion(PRIMARY_PAYOFF_MATRIX, 1.5);
    const maximax = maximaxCriterion(PRIMARY_PAYOFF_MATRIX);
    expect(over.scores).toEqual(maximax.scores);
  });
});

describe("Laplace基準(等確率とみなした平均利得最大化)", () => {
  it("1台稼働(平均300)を選ぶ", () => {
    const r = laplaceCriterion(PRIMARY_PAYOFF_MATRIX);
    expect(r.scores).toEqual([-100, 300, 200]);
    expect(r.bestIndex).toBe(1);
  });
});

describe("リグレット行列とMinimax regret基準", () => {
  it("リグレット行列を正しく計算する", () => {
    const regret = regretMatrix(PRIMARY_PAYOFF_MATRIX);
    // 好況列の最大=700, 不況列の最大=300
    expect(regret).toEqual([
      [800, 400], // 0台: 700-(-100)=800, 300-(-100)=400
      [400, 0], // 1台: 700-300=400, 300-300=0
      [0, 600], // 2台: 700-700=0, 300-(-300)=600
    ]);
  });
  it("各行動の最大リグレットのうち最小の1台稼働(400)を選ぶ", () => {
    const r = minimaxRegretCriterion(PRIMARY_PAYOFF_MATRIX);
    expect(r.scores).toEqual([800, 400, 600]);
    expect(r.bestIndex).toBe(1);
  });
});

describe("期待値による意思決定(ESV)", () => {
  it("p(好況)=0.5では1台稼働(300)を選ぶ", () => {
    const r = expectedValueCriterion(PRIMARY_PAYOFF_MATRIX, [0.5, 0.5]);
    expect(r.scores).toEqual([-100, 300, 200]);
    expect(r.bestIndex).toBe(1);
  });
  it("p(好況)=0.7では2台稼働(700*0.7-300*0.3=400)を選ぶ", () => {
    const r = expectedValueCriterion(PRIMARY_PAYOFF_MATRIX, [0.7, 0.3]);
    expect(r.scores[2]).toBeCloseTo(400, 6);
    expect(r.bestIndex).toBe(2);
  });
  it("交点はp=0.6(それ未満は1台、それ以上は2台が優位)", () => {
    const below = expectedValueCriterion(PRIMARY_PAYOFF_MATRIX, [0.59, 0.41]);
    const above = expectedValueCriterion(PRIMARY_PAYOFF_MATRIX, [0.61, 0.39]);
    expect(below.bestIndex).toBe(1);
    expect(above.bestIndex).toBe(2);
  });
  it("probabilitiesの長さがstatesと不一致ならエラー", () => {
    expect(() => expectedValueCriterion(PRIMARY_PAYOFF_MATRIX, [1])).toThrow();
  });
});

describe("優越される行動(dominated action)", () => {
  it("0台稼働は1台稼働に弱優越されている(全状態でより良く、少なくとも1つは厳密に良い)", () => {
    expect(dominatedActionIndices(PRIMARY_PAYOFF_MATRIX)).toEqual([0]);
  });
  it("互いに優越関係がなければ空配列", () => {
    const matrix: PayoffMatrix = {
      actions: ["A", "B"],
      states: ["好況", "不況"],
      payoffs: [
        [100, -50],
        [-50, 100],
      ],
    };
    expect(dominatedActionIndices(matrix)).toEqual([]);
  });
});

describe("決定木(決定ノード・確率ノード・後ろ向き帰納法)", () => {
  it("buildDecisionTree: 根は決定ノード、各行動の先に確率ノードを持つ", () => {
    const tree = buildDecisionTree(PRIMARY_PAYOFF_MATRIX, [0.5, 0.5]);
    expect(tree.kind).toBe("decision");
    if (tree.kind !== "decision") throw new Error("unreachable");
    expect(tree.branches).toHaveLength(3);
    expect(tree.branches[0].child.kind).toBe("chance");
  });

  it("evaluateTreeNode: p=0.5では1台稼働の枝(期待値300)が選ばれる", () => {
    const tree = buildDecisionTree(PRIMARY_PAYOFF_MATRIX, [0.5, 0.5]);
    const result = evaluateTreeNode(tree);
    expect(result.value).toBeCloseTo(300, 6);
    expect(result.chosenBranchId).toBe("action-1");
  });

  it("evaluateTreeNode: p(好況)=0.7では2台稼働の枝(期待値400)が選ばれる", () => {
    const tree = buildDecisionTree(PRIMARY_PAYOFF_MATRIX, [0.7, 0.3]);
    const result = evaluateTreeNode(tree);
    expect(result.value).toBeCloseTo(400, 6);
    expect(result.chosenBranchId).toBe("action-2");
  });

  it("決定木の期待値はexpectedValueCriterionのスコアと一致する(同じ計算の別表現)", () => {
    const probs = [0.5, 0.5] as const;
    const esv = expectedValueCriterion(PRIMARY_PAYOFF_MATRIX, probs);
    const tree = buildDecisionTree(PRIMARY_PAYOFF_MATRIX, probs);
    const result = evaluateTreeNode(tree);
    expect(result.value).toBeCloseTo(Math.max(...esv.scores), 6);
  });

  it("collectPostOrder: 末端は含まず、確率ノード(3個)→決定ノード(1個)の順で並ぶ", () => {
    const tree = buildDecisionTree(PRIMARY_PAYOFF_MATRIX, [0.5, 0.5]);
    const order = collectPostOrder(tree);
    expect(order).toHaveLength(4);
    expect(order.slice(0, 3).every((n) => n.kind === "chance")).toBe(true);
    expect(order[3].kind).toBe("decision");
  });

  it("backwardInductionSteps: 各確率ノードの期待値と、最終決定ノードの選択が正しい", () => {
    const tree = buildDecisionTree(PRIMARY_PAYOFF_MATRIX, [0.5, 0.5]);
    const steps = backwardInductionSteps(tree);
    expect(steps).toHaveLength(4);
    // 確率ノード: 0台=-100, 1台=300, 2台=200
    expect(steps[0].value).toBeCloseTo(-100, 6);
    expect(steps[1].value).toBeCloseTo(300, 6);
    expect(steps[2].value).toBeCloseTo(200, 6);
    // 決定ノード: 最大の1台稼働(300)を選ぶ
    const last = steps[3];
    expect(last.node.kind).toBe("decision");
    expect(last.value).toBeCloseTo(300, 6);
    expect(last.chosenBranchId).toBe("action-1");
  });
});
