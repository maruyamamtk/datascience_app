import { describe, expect, it } from "vitest";
import {
  accuracy,
  adaBoostFit,
  adaBoostPredict,
  bestRegSplit,
  bestSplit,
  bestStump,
  bootstrapSample,
  buildEnsemble,
  buildRegTree,
  buildTree,
  type ClassPoint,
  classCounts,
  collectSplitLines,
  countLeaves,
  decisionBoundaryGrid,
  ensemblePredict,
  entropyImpurity,
  gbPredict,
  generateClassificationData,
  generateRegressionData,
  giniImpurity,
  gradientBoostingFit,
  linspace,
  makeLcg,
  meanSquaredError,
  oobErrorRate,
  predictRegTree,
  predictTree,
  pseudoGaussian,
  randomFeatureSubset,
  stumpPredict,
  treeDepth,
  trueLabel,
} from "./decision-trees-ensembles";

function pts(labels: (0 | 1)[]): ClassPoint[] {
  return labels.map((label, i) => ({ x1: i / labels.length, x2: 0.5, label }));
}

describe("classCounts / giniImpurity / entropyImpurity", () => {
  it("純粋なノード（全部同じラベル）は不純度0", () => {
    expect(giniImpurity(pts([0, 0, 0, 0]))).toBeCloseTo(0, 10);
    expect(entropyImpurity(pts([1, 1, 1]))).toBeCloseTo(0, 10);
  });

  it("五分五分のノードはジニ0.5・エントロピー1ビットで最大", () => {
    const half = pts([0, 0, 1, 1]);
    expect(giniImpurity(half)).toBeCloseTo(0.5, 10);
    expect(entropyImpurity(half)).toBeCloseTo(1, 10);
  });

  it("classCounts は各ラベルの個数を数える", () => {
    expect(classCounts(pts([0, 0, 1]))).toEqual([2, 1]);
  });

  it("空配列の不純度は0（0割りを起こさない）", () => {
    expect(giniImpurity([])).toBe(0);
    expect(entropyImpurity([])).toBe(0);
  });

  it("偏った分布ほど不純度が小さい（単調性）", () => {
    const balanced = pts([0, 0, 1, 1]);
    const skewed = pts([0, 0, 0, 1]);
    expect(giniImpurity(skewed)).toBeLessThan(giniImpurity(balanced));
    expect(entropyImpurity(skewed)).toBeLessThan(entropyImpurity(balanced));
  });
});

describe("bestSplit", () => {
  it("x1<0.5でラベルがきれいに分かれるデータなら閾値0.5付近・利得>0を見つける", () => {
    const data: ClassPoint[] = [
      { x1: 0.1, x2: 0.5, label: 0 },
      { x1: 0.2, x2: 0.5, label: 0 },
      { x1: 0.3, x2: 0.5, label: 0 },
      { x1: 0.7, x2: 0.5, label: 1 },
      { x1: 0.8, x2: 0.5, label: 1 },
      { x1: 0.9, x2: 0.5, label: 1 },
    ];
    const split = bestSplit(data, "gini");
    expect(split).not.toBeNull();
    expect(split!.feature).toBe(0);
    expect(split!.threshold).toBeGreaterThan(0.3);
    expect(split!.threshold).toBeLessThan(0.7);
    expect(split!.gain).toBeCloseTo(0.5, 5); // 完全分離: 親gini0.5→子は両方0
  });

  it("featureSubset を1個に絞ると、その特徴量の中でしか探さない", () => {
    const data: ClassPoint[] = [
      { x1: 0.1, x2: 0.9, label: 0 },
      { x1: 0.2, x2: 0.8, label: 0 },
      { x1: 0.8, x2: 0.2, label: 1 },
      { x1: 0.9, x2: 0.1, label: 1 },
    ];
    const split = bestSplit(data, "gini", [1]);
    expect(split?.feature).toBe(1);
  });

  it("2点未満はnull", () => {
    expect(bestSplit([{ x1: 0.5, x2: 0.5, label: 0 }], "gini")).toBeNull();
  });

  it("利得はどんな分割でも非負", () => {
    const data = generateClassificationData(30, 111, 0.1);
    const split = bestSplit(data, "entropy");
    if (split) expect(split.gain).toBeGreaterThanOrEqual(-1e-9);
  });
});

describe("buildTree / predictTree / countLeaves / treeDepth", () => {
  const clean: ClassPoint[] = [
    { x1: 0.1, x2: 0.5, label: 0 },
    { x1: 0.2, x2: 0.5, label: 0 },
    { x1: 0.3, x2: 0.5, label: 0 },
    { x1: 0.7, x2: 0.5, label: 1 },
    { x1: 0.8, x2: 0.5, label: 1 },
    { x1: 0.9, x2: 0.5, label: 1 },
  ];

  it("完全分離できるデータは深さ1の木で訓練精度100%になる", () => {
    const tree = buildTree(clean, 0, { maxDepth: 3, criterion: "gini" });
    expect(accuracy(clean, (x1, x2) => predictTree(tree, x1, x2))).toBeCloseTo(1, 10);
    expect(tree.impurity).toBeCloseTo(0.5, 10); // ルートは五分五分
  });

  it("maxDepth=0 だと分割せず葉1枚（多数決のみ）", () => {
    const tree = buildTree(clean, 0, { maxDepth: 0, criterion: "gini" });
    expect(tree.feature).toBeUndefined();
    expect(countLeaves(tree)).toBe(1);
  });

  it("木を深くするほど（上限内で）訓練精度は単調に悪化しない", () => {
    const data = generateClassificationData(60, 2024, 0.05);
    const accShallow = accuracy(data, (x1, x2) => predictTree(buildTree(data, 0, { maxDepth: 1, criterion: "gini" }), x1, x2));
    const accDeep = accuracy(data, (x1, x2) => predictTree(buildTree(data, 0, { maxDepth: 6, criterion: "gini" }), x1, x2));
    expect(accDeep).toBeGreaterThanOrEqual(accShallow - 1e-9);
  });

  it("純粋ノードでは分割しない（葉が増えない）", () => {
    const pure = pts([1, 1, 1, 1, 1, 1]);
    const tree = buildTree(pure, 0, { maxDepth: 5, criterion: "gini" });
    expect(countLeaves(tree)).toBe(1);
    expect(tree.prediction).toBe(1);
  });

  it("treeDepth は葉のみで0、1回分割で1", () => {
    const leaf = buildTree(pts([0, 0]), 0, { maxDepth: 3, criterion: "gini" });
    expect(treeDepth(leaf)).toBe(0);
    const split = buildTree(clean, 0, { maxDepth: 3, criterion: "gini" });
    expect(treeDepth(split)).toBeGreaterThanOrEqual(1);
  });
});

describe("collectSplitLines", () => {
  it("葉ノードだけの木は分割線0本", () => {
    const leaf = buildTree(pts([0, 0, 0]), 0, { maxDepth: 3, criterion: "gini" });
    expect(collectSplitLines(leaf)).toEqual([]);
  });

  it("1回分割した木は1本の分割線を [0,1] 全体に持つ", () => {
    const clean: ClassPoint[] = [
      { x1: 0.1, x2: 0.5, label: 0 },
      { x1: 0.2, x2: 0.5, label: 0 },
      { x1: 0.8, x2: 0.5, label: 1 },
      { x1: 0.9, x2: 0.5, label: 1 },
    ];
    const tree = buildTree(clean, 0, { maxDepth: 1, criterion: "gini" });
    const lines = collectSplitLines(tree);
    expect(lines).toHaveLength(1);
    expect(lines[0].from).toBe(0);
    expect(lines[0].to).toBe(1);
  });

  it("2回分割すると、子の分割線は親の閾値で切り取られる", () => {
    const data: ClassPoint[] = [
      { x1: 0.1, x2: 0.1, label: 0 },
      { x1: 0.1, x2: 0.9, label: 1 },
      { x1: 0.9, x2: 0.1, label: 0 },
      { x1: 0.9, x2: 0.9, label: 0 },
    ];
    const tree = buildTree(data, 0, { maxDepth: 3, criterion: "gini", minSamplesLeaf: 1 });
    const lines = collectSplitLines(tree);
    // 少なくとも1本は [0,1] 全域ではなく祖先の閾値で狭められているはず
    expect(lines.some((l) => l.from > 0 || l.to < 1)).toBe(true);
  });
});

describe("decisionBoundaryGrid", () => {
  it("resolution×resolution 個のセルを返す", () => {
    const grid = decisionBoundaryGrid(() => 0, 5);
    expect(grid).toHaveLength(25);
  });

  it("セルの座標は (0,1) の範囲に収まる", () => {
    const grid = decisionBoundaryGrid((x1, x2) => (x1 + x2 > 1 ? 1 : 0), 10);
    for (const c of grid) {
      expect(c.x1).toBeGreaterThan(0);
      expect(c.x1).toBeLessThan(1);
      expect(c.x2).toBeGreaterThan(0);
      expect(c.x2).toBeLessThan(1);
    }
  });
});

describe("bootstrapSample / randomFeatureSubset", () => {
  it("同じ大きさの再標本を返す", () => {
    const data = pts([0, 1, 0, 1, 0]);
    const rng = makeLcg(1);
    const { sample } = bootstrapSample(data, rng);
    expect(sample).toHaveLength(data.length);
  });

  it("同じシードなら同じ再標本になる（決定的）", () => {
    const data = pts([0, 1, 0, 1, 0, 1, 0, 1]);
    const a = bootstrapSample(data, makeLcg(42));
    const b = bootstrapSample(data, makeLcg(42));
    expect(a.sample).toEqual(b.sample);
    expect([...a.inBagIndices].sort()).toEqual([...b.inBagIndices].sort());
  });

  it("復元抽出なので通常は全員が選ばれるわけではない（in-bag集合がn未満になりうる）", () => {
    const data = pts(new Array(20).fill(0));
    const { inBagIndices } = bootstrapSample(data, makeLcg(7));
    expect(inBagIndices.size).toBeLessThan(data.length);
  });

  it("randomFeatureSubset は常に長さ1の配列を返す", () => {
    const rng = makeLcg(9);
    for (let i = 0; i < 20; i++) {
      const subset = randomFeatureSubset(rng);
      expect(subset).toHaveLength(1);
    }
  });
});

describe("buildEnsemble / ensemblePredict / oobErrorRate", () => {
  const data = generateClassificationData(60, 555, 0.05);

  it("nTrees本の木を返す", () => {
    const trees = buildEnsemble(data, 9, "bagging", "gini", 3, 1);
    expect(trees).toHaveLength(9);
  });

  it("木の本数を増やすとOOB誤り率が計算できnanにならない", () => {
    const trees = buildEnsemble(data, 15, "bagging", "gini", 3, 2);
    const err = oobErrorRate(data, trees);
    expect(Number.isFinite(err)).toBe(true);
    expect(err).toBeGreaterThanOrEqual(0);
    expect(err).toBeLessThanOrEqual(1);
  });

  it("ensemblePredictの投票割合は0〜1", () => {
    const trees = buildEnsemble(data, 11, "randomForest", "gini", 3, 3);
    const { voteFraction } = ensemblePredict(trees, 0.5, 0.5);
    expect(voteFraction).toBeGreaterThanOrEqual(0);
    expect(voteFraction).toBeLessThanOrEqual(1);
  });

  it("木が1本もないとOOB誤り率はNaN", () => {
    expect(Number.isNaN(oobErrorRate(data, []))).toBe(true);
  });

  it("同じシードなら同じアンサンブルになる（決定的、SSR/CSR一致に必須）", () => {
    const a = buildEnsemble(data, 5, "bagging", "gini", 2, 99);
    const b = buildEnsemble(data, 5, "bagging", "gini", 2, 99);
    expect(a.map((t) => predictTree(t.tree, 0.3, 0.6))).toEqual(b.map((t) => predictTree(t.tree, 0.3, 0.6)));
  });
});

describe("bestStump / stumpPredict / adaBoostFit / adaBoostPredict", () => {
  const clean: ClassPoint[] = [
    { x1: 0.1, x2: 0.5, label: 0 },
    { x1: 0.2, x2: 0.5, label: 0 },
    { x1: 0.3, x2: 0.5, label: 0 },
    { x1: 0.7, x2: 0.5, label: 1 },
    { x1: 0.8, x2: 0.5, label: 1 },
    { x1: 0.9, x2: 0.5, label: 1 },
  ];

  it("完全分離できるデータでは加重誤差0の株が見つかる", () => {
    const weights = new Array(clean.length).fill(1 / clean.length);
    const { weightedError, stump } = bestStump(clean, weights);
    expect(weightedError).toBeCloseTo(0, 10);
    for (const p of clean) {
      const pred = stumpPredict(stump, p.x1, p.x2);
      expect(pred).toBe(p.label === 1 ? 1 : -1);
    }
  });

  it("adaBoostFitはnRounds個のラウンドを返し、各ラウンドで重みの合計は1に正規化される", () => {
    const rounds = adaBoostFit(clean, 3);
    expect(rounds).toHaveLength(3);
    for (const r of rounds) {
      const total = r.weightsAfter.reduce((s, w) => s + w, 0);
      expect(total).toBeCloseTo(1, 8);
    }
  });

  it("完全分離できるデータなら1ラウンドでアンサンブル精度100%", () => {
    const rounds = adaBoostFit(clean, 1);
    const preds = clean.map((p) => adaBoostPredict(rounds, p.x1, p.x2));
    const correct = preds.filter((pred, i) => pred === (clean[i].label === 1 ? 1 : -1)).length;
    expect(correct).toBe(clean.length);
  });

  it("誤分類した点は次ラウンドで重みが増える（指数損失の性質）", () => {
    const data = generateClassificationData(40, 321, 0.15);
    const rounds = adaBoostFit(data, 2);
    const round0 = rounds[0];
    round0.misclassified.forEach((wrong, i) => {
      if (wrong) {
        expect(round0.weightsAfter[i]).toBeGreaterThan(round0.weightsBefore[i]);
      } else {
        expect(round0.weightsAfter[i]).toBeLessThanOrEqual(round0.weightsBefore[i] + 1e-12);
      }
    });
  });

  it("uptoRoundを指定すると途中経過の予測になる（ラウンド数が増えるほど株が増える）", () => {
    const rounds = adaBoostFit(generateClassificationData(30, 8, 0.1), 4);
    const p1 = adaBoostPredict(rounds, 0.4, 0.4, 1);
    const p4 = adaBoostPredict(rounds, 0.4, 0.4, 4);
    expect([1, -1]).toContain(p1);
    expect([1, -1]).toContain(p4);
  });
});

describe("bestRegSplit / buildRegTree / predictRegTree", () => {
  it("階段状データ（x<0.5でy=0, x>=0.5でy=10）なら閾値0.5付近を見つける", () => {
    const data = [
      { x: 0.1, y: 0 },
      { x: 0.2, y: 0 },
      { x: 0.3, y: 0 },
      { x: 0.6, y: 10 },
      { x: 0.7, y: 10 },
      { x: 0.8, y: 10 },
    ];
    const split = bestRegSplit(data);
    expect(split).not.toBeNull();
    expect(split!.threshold).toBeGreaterThan(0.3);
    expect(split!.threshold).toBeLessThan(0.6);
  });

  it("回帰木は葉でその区間の平均を予測する", () => {
    const data = [
      { x: 0.1, y: 2 },
      { x: 0.2, y: 4 },
      { x: 0.8, y: 10 },
      { x: 0.9, y: 12 },
    ];
    const tree = buildRegTree(data, 0, 1);
    expect(predictRegTree(tree, 0.15)).toBeCloseTo(3, 10);
    expect(predictRegTree(tree, 0.85)).toBeCloseTo(11, 10);
  });

  it("maxDepth=0では全体平均を返す葉1枚", () => {
    const data = [
      { x: 0.1, y: 0 },
      { x: 0.9, y: 10 },
    ];
    const tree = buildRegTree(data, 0, 0);
    expect(tree.threshold).toBeUndefined();
    expect(predictRegTree(tree, 0.5)).toBeCloseTo(5, 10);
  });
});

describe("gradientBoostingFit / gbPredict / meanSquaredError", () => {
  it("ラウンドを重ねるほど訓練MSEは単調に減少する（学習が進む）", () => {
    const data = generateRegressionData(30, 55, 0.05);
    const rounds = gradientBoostingFit(data, 10, 0.3, 2);
    const initial = data.reduce((s, p) => s + p.y, 0) / data.length;
    const mseAt = (upto: number) =>
      meanSquaredError(
        data.map((p) => gbPredict(rounds, initial, p.x, 0.3, upto)),
        data.map((p) => p.y),
      );
    const mse2 = mseAt(2);
    const mse10 = mseAt(10);
    expect(mse10).toBeLessThanOrEqual(mse2 + 1e-9);
  });

  it("uptoRound=0だと初期値（全体平均）だけを返す", () => {
    const data = generateRegressionData(20, 3, 0.05);
    const rounds = gradientBoostingFit(data, 5, 0.2, 2);
    const initial = data.reduce((s, p) => s + p.y, 0) / data.length;
    expect(gbPredict(rounds, initial, 0.5, 0.2, 0)).toBeCloseTo(initial, 10);
  });

  it("meanSquaredErrorは完全一致なら0", () => {
    expect(meanSquaredError([1, 2, 3], [1, 2, 3])).toBeCloseTo(0, 10);
  });
});

describe("trueLabel / generateClassificationData / generateRegressionData", () => {
  it("trueLabelは境界の上下でラベルが変わる", () => {
    expect(trueLabel(0.5, 0.99)).toBe(1);
    expect(trueLabel(0.5, 0.01)).toBe(0);
  });

  it("generateClassificationDataは指定した点数を返す", () => {
    const data = generateClassificationData(25, 1, 0.1);
    expect(data).toHaveLength(25);
    for (const p of data) {
      expect(p.x1).toBeGreaterThanOrEqual(0);
      expect(p.x1).toBeLessThanOrEqual(1);
    }
  });

  it("noiseP=0ならラベルは常にtrueLabelと一致する", () => {
    const data = generateClassificationData(40, 77, 0);
    for (const p of data) expect(p.label).toBe(trueLabel(p.x1, p.x2));
  });

  it("同じシードなら同じデータになる（決定的）", () => {
    const a = generateClassificationData(10, 123, 0.1);
    const b = generateClassificationData(10, 123, 0.1);
    expect(a).toEqual(b);
  });

  it("generateRegressionDataは指定した点数を返す", () => {
    expect(generateRegressionData(15, 5, 0.1)).toHaveLength(15);
  });
});

describe("makeLcg / pseudoGaussian / linspace", () => {
  it("同じシードなら同じ列を返す（決定的）", () => {
    const a = makeLcg(2024);
    const b = makeLcg(2024);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("[0,1)の一様乱数を返す", () => {
    const rng = makeLcg(1);
    for (let i = 0; i < 50; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("pseudoGaussianは概ね0付近に分布する（極端な偏りがない）", () => {
    const rng = makeLcg(3);
    const samples = Array.from({ length: 1000 }, () => pseudoGaussian(rng));
    const mean = samples.reduce((s, v) => s + v, 0) / samples.length;
    expect(Math.abs(mean)).toBeLessThan(0.2);
  });

  it("linspaceは端点を含みn点で等分する", () => {
    expect(linspace(0, 1, 5)).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });
});
