/**
 * 決定木・アンサンブル（I-3）の計算層（純関数・副作用なし・Vitest 対象）。
 *
 * 扱う道具:
 * - 決定木（判別木）: 軸に平行な閾値で再帰的にデータを分割する if-then ルールの木。
 *   分岐基準はジニ不純度 / エントロピー（情報利得）。回帰木は分散減少（SSE最小化）が基準になる
 *   （同じ「不純度を減らす方向に貪欲に分割する」考え方の回帰版、bestRegSplit/buildRegTree で実装）。
 * - バギング / ランダムフォレスト: ブートストラップ再標本で木を並列に何本も育て多数決する。
 *   ランダムフォレストはさらに各分割で候補特徴量をランダムに絞る（木どうしの相関を下げる）。
 *   OOB（out-of-bag）誤り率は、各点についてその点をブートストラップに含まなかった木だけで
 *   多数決した誤り率——held-outデータなしに汎化誤差を見積もれる。
 * - ブースティング（AdaBoost・勾配ブースティング）: 弱学習器を «逐次» 追加する点がバギングと違う。
 *   AdaBoost は指数損失を最小化するように標本重みを更新しながら決定株（深さ1の木）を積み上げ、
 *   勾配ブースティングは二乗誤差の負の勾配＝残差に浅い回帰木を逐次フィットする関数勾配降下。
 *
 * データは 2 特徴量 (x1, x2) ∈ [0,1]² の判別問題（決定境界を2D平面に描ける最小構成）を主に使う。
 * 決定的LCG（整数演算のみ）でブートストラップ・特徴量サブサンプリング・ノイズを生成し、
 * SSR/CSR で結果がぶれないようにする（tasks/lessons.md の教訓）。
 */

// ────────────────────────────────────────────────────────────
// 決定的乱数（整数演算だけの LCG。SSR とブラウザで結果がぶれない）
// ────────────────────────────────────────────────────────────

/** 決定的な線形合同法（整数演算だけなので SSR とブラウザで結果がぶれない）。 */
export function makeLcg(seed: number): () => number {
  let state = (Math.floor(seed) >>> 0) || 1;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** 一様乱数3個の和−1.5 で近似ガウス（Irwin–Hall、超越関数を使わず決定的）。 */
export function pseudoGaussian(rng: () => number): number {
  return rng() + rng() + rng() - 1.5;
}

/** [min,max] を n 点で等分（端点を含む）。 */
export function linspace(min: number, max: number, n: number): number[] {
  if (n <= 1) return [min];
  return Array.from({ length: n }, (_, i) => min + ((max - min) * i) / (n - 1));
}

// ────────────────────────────────────────────────────────────
// 判別データ（2特徴量、軸平行な決定境界と噛み合わせて可視化する）
// ────────────────────────────────────────────────────────────

export type ClassPoint = { x1: number; x2: number; label: 0 | 1 };

/**
 * «真の境界» は波打つ曲線 x2 = 0.5+0.22·sin(2πx1) の上下。決定木は軸平行な矩形でしか
 * 分けられないため、木を深くするほど «階段状» に曲線を近似していく——という Level0 の物語を作る。
 */
export function trueLabel(x1: number, x2: number): 0 | 1 {
  const boundary = 0.5 + 0.22 * Math.sin(2 * Math.PI * x1);
  return x2 > boundary ? 1 : 0;
}

/** ノイズ入り判別データを n 点生成する（決定的LCG）。ラベル反転確率 noiseP でクラスが混じる。 */
export function generateClassificationData(n: number, seed: number, noiseP: number): ClassPoint[] {
  const rng = makeLcg(seed);
  const points: ClassPoint[] = [];
  for (let i = 0; i < n; i++) {
    const x1 = rng();
    const x2 = rng();
    let label = trueLabel(x1, x2);
    if (rng() < noiseP) label = label === 0 ? 1 : 0;
    points.push({ x1, x2, label });
  }
  return points;
}

// ────────────────────────────────────────────────────────────
// 不純度指標（ジニ不純度・エントロピー）と情報利得
// ────────────────────────────────────────────────────────────

export type Criterion = "gini" | "entropy";

/** ラベル 0/1 それぞれの個数。 */
export function classCounts(points: readonly ClassPoint[]): [number, number] {
  let c0 = 0;
  let c1 = 0;
  for (const p of points) {
    if (p.label === 0) c0++;
    else c1++;
  }
  return [c0, c1];
}

/** ジニ不純度 Gini = 1 − Σp_k²（2クラスなら 1−p0²−p1²、最大0.5＝五分五分）。 */
export function giniImpurity(points: readonly ClassPoint[]): number {
  const n = points.length;
  if (n === 0) return 0;
  const [c0, c1] = classCounts(points);
  const p0 = c0 / n;
  const p1 = c1 / n;
  return 1 - p0 * p0 - p1 * p1;
}

/** シャノンエントロピー H = −Σp_k log2(p_k)（2クラスなら最大1ビット＝五分五分）。 */
export function entropyImpurity(points: readonly ClassPoint[]): number {
  const n = points.length;
  if (n === 0) return 0;
  const [c0, c1] = classCounts(points);
  let h = 0;
  for (const c of [c0, c1]) {
    if (c === 0) continue;
    const p = c / n;
    h -= p * Math.log2(p);
  }
  return h;
}

/** 指定した基準で不純度を計算する。 */
export function impurity(points: readonly ClassPoint[], criterion: Criterion): number {
  return criterion === "gini" ? giniImpurity(points) : entropyImpurity(points);
}

// ────────────────────────────────────────────────────────────
// 最良分割の探索（情報利得を最大化する軸平行な閾値）
// ────────────────────────────────────────────────────────────

export type Split = { feature: 0 | 1; threshold: number; gain: number; leftN: number; rightN: number };

const featureValue = (p: ClassPoint, feature: 0 | 1): number => (feature === 0 ? p.x1 : p.x2);

/**
 * 候補特徴量（既定は両方、ランダムフォレストなら 1 個に絞る）の中から、
 * 情報利得 = 親の不純度 − Σ(子の重み×子の不純度) を最大化する軸平行の閾値を探す。
 * 閾値候補は各特徴量のソート済みユニーク値の中点（教科書的な CART の全探索）。
 */
export function bestSplit(
  points: readonly ClassPoint[],
  criterion: Criterion,
  featureSubset: readonly (0 | 1)[] = [0, 1],
): Split | null {
  const n = points.length;
  if (n < 2) return null;
  const parentImpurity = impurity(points, criterion);
  let best: Split | null = null;

  for (const feature of featureSubset) {
    const values = [...new Set(points.map((p) => featureValue(p, feature)))].sort((a, b) => a - b);
    for (let i = 0; i < values.length - 1; i++) {
      const threshold = (values[i] + values[i + 1]) / 2;
      const left = points.filter((p) => featureValue(p, feature) <= threshold);
      const right = points.filter((p) => featureValue(p, feature) > threshold);
      if (left.length === 0 || right.length === 0) continue;
      const weighted = (left.length / n) * impurity(left, criterion) + (right.length / n) * impurity(right, criterion);
      const gain = parentImpurity - weighted;
      if (!best || gain > best.gain + 1e-12) {
        best = { feature, threshold, gain, leftN: left.length, rightN: right.length };
      }
    }
  }
  return best;
}

// ────────────────────────────────────────────────────────────
// 決定木の構築・予測
// ────────────────────────────────────────────────────────────

export type TreeNode = {
  depth: number;
  nSamples: number;
  impurity: number;
  prediction: 0 | 1;
  feature?: 0 | 1;
  threshold?: number;
  gain?: number;
  left?: TreeNode;
  right?: TreeNode;
};

export type TreeOptions = {
  maxDepth: number;
  criterion: Criterion;
  minSamplesLeaf?: number;
  /** ランダムフォレスト用: 各分割で使う候補特徴量を選ぶ関数（既定は両方使う）。 */
  featureSubsetFn?: () => readonly (0 | 1)[];
};

/** 多数決ラベル（同数のときは 1 を返す。決定的にするための取り決め）。 */
function majorityLabel(points: readonly ClassPoint[]): 0 | 1 {
  const [c0, c1] = classCounts(points);
  return c1 >= c0 ? 1 : 0;
}

/** 貪欲な再帰分割で決定木を育てる（純関数、副作用なし）。 */
export function buildTree(points: readonly ClassPoint[], depth: number, opts: TreeOptions): TreeNode {
  const nSamples = points.length;
  const imp = impurity(points, opts.criterion);
  const prediction = majorityLabel(points);
  const minLeaf = opts.minSamplesLeaf ?? 2;

  if (depth >= opts.maxDepth || imp === 0 || nSamples < minLeaf * 2) {
    return { depth, nSamples, impurity: imp, prediction };
  }

  const featureSubset: readonly (0 | 1)[] = opts.featureSubsetFn ? opts.featureSubsetFn() : [0, 1];
  const split = bestSplit(points, opts.criterion, featureSubset);
  if (!split || split.gain <= 1e-12) {
    return { depth, nSamples, impurity: imp, prediction };
  }

  const leftPts = points.filter((p) => featureValue(p, split.feature) <= split.threshold);
  const rightPts = points.filter((p) => featureValue(p, split.feature) > split.threshold);

  return {
    depth,
    nSamples,
    impurity: imp,
    prediction,
    feature: split.feature,
    threshold: split.threshold,
    gain: split.gain,
    left: buildTree(leftPts, depth + 1, opts),
    right: buildTree(rightPts, depth + 1, opts),
  };
}

/** 木をたどって (x1,x2) の予測ラベルを返す。 */
export function predictTree(node: TreeNode, x1: number, x2: number): 0 | 1 {
  if (node.feature === undefined || node.threshold === undefined || !node.left || !node.right) {
    return node.prediction;
  }
  const v = node.feature === 0 ? x1 : x2;
  return v <= node.threshold ? predictTree(node.left, x1, x2) : predictTree(node.right, x1, x2);
}

/** 葉の数を数える。 */
export function countLeaves(node: TreeNode): number {
  if (!node.left || !node.right) return 1;
  return countLeaves(node.left) + countLeaves(node.right);
}

/** 木の最大深さ（葉のみなら0）。 */
export function treeDepth(node: TreeNode): number {
  if (!node.left || !node.right) return 0;
  return 1 + Math.max(treeDepth(node.left), treeDepth(node.right));
}

/** 正解率（分類精度）。 */
export function accuracy(points: readonly ClassPoint[], predictFn: (x1: number, x2: number) => 0 | 1): number {
  if (points.length === 0) return Number.NaN;
  let correct = 0;
  for (const p of points) if (predictFn(p.x1, p.x2) === p.label) correct++;
  return correct / points.length;
}

// ────────────────────────────────────────────────────────────
// 木の分割線（境界を [0,1]² 内の線分として取り出す。決定境界の可視化に使う）
// ────────────────────────────────────────────────────────────

export type SplitLine = { feature: 0 | 1; threshold: number; from: number; to: number; depth: number };
type Bounds = { x1Min: number; x1Max: number; x2Min: number; x2Max: number };

/**
 * 木を再帰的にたどり、各内部ノードの分割線を «祖先の分割で絞られた範囲» に切り取って集める。
 * 決定木は軸平行な矩形の入れ子でしか領域を分けられない、という Level0 の直感を線で見せる。
 */
export function collectSplitLines(
  node: TreeNode,
  bounds: Bounds = { x1Min: 0, x1Max: 1, x2Min: 0, x2Max: 1 },
): SplitLine[] {
  if (node.feature === undefined || node.threshold === undefined || !node.left || !node.right) return [];
  const lines: SplitLine[] = [];
  if (node.feature === 0) {
    lines.push({ feature: 0, threshold: node.threshold, from: bounds.x2Min, to: bounds.x2Max, depth: node.depth });
    lines.push(...collectSplitLines(node.left, { ...bounds, x1Max: node.threshold }));
    lines.push(...collectSplitLines(node.right, { ...bounds, x1Min: node.threshold }));
  } else {
    lines.push({ feature: 1, threshold: node.threshold, from: bounds.x1Min, to: bounds.x1Max, depth: node.depth });
    lines.push(...collectSplitLines(node.left, { ...bounds, x2Max: node.threshold }));
    lines.push(...collectSplitLines(node.right, { ...bounds, x2Min: node.threshold }));
  }
  return lines;
}

/** 決定境界をグリッドで塗るためのセル列。resolution×resolution 個。 */
export type GridCell = { x1: number; x2: number; label: 0 | 1 };

export function decisionBoundaryGrid(predictFn: (x1: number, x2: number) => 0 | 1, resolution: number): GridCell[] {
  const cells: GridCell[] = [];
  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      const x1 = (i + 0.5) / resolution;
      const x2 = (j + 0.5) / resolution;
      cells.push({ x1, x2, label: predictFn(x1, x2) });
    }
  }
  return cells;
}

// ────────────────────────────────────────────────────────────
// バギング・ランダムフォレスト（ブートストラップ + 多数決）
// ────────────────────────────────────────────────────────────

export type EnsembleMethod = "bagging" | "randomForest";

/** 復元抽出で n 個選ぶ（決定的LCG）。同時に「どの添字が選ばれたか」も返す（OOB判定に使う）。 */
export function bootstrapSample(
  points: readonly ClassPoint[],
  rng: () => number,
): { sample: ClassPoint[]; inBagIndices: Set<number> } {
  const n = points.length;
  const sample: ClassPoint[] = [];
  const inBagIndices = new Set<number>();
  for (let i = 0; i < n; i++) {
    const idx = Math.min(n - 1, Math.floor(rng() * n));
    sample.push(points[idx]);
    inBagIndices.add(idx);
  }
  return { sample, inBagIndices };
}

/** ランダムフォレスト用: 2特徴量のうち1個だけをランダムに候補にする（決定的LCG）。 */
export function randomFeatureSubset(rng: () => number): readonly (0 | 1)[] {
  return rng() < 0.5 ? [0] : [1];
}

export type EnsembleTree = { tree: TreeNode; inBagIndices: Set<number> };

/**
 * バギング／ランダムフォレストで nTrees 本の木を育てる。
 * バギングは全特徴量を使い、ランダムフォレストは各分割で特徴量を1個に絞る（木どうしの相関を下げる）。
 */
export function buildEnsemble(
  points: readonly ClassPoint[],
  nTrees: number,
  method: EnsembleMethod,
  criterion: Criterion,
  maxDepth: number,
  seed: number,
): EnsembleTree[] {
  const rng = makeLcg(seed);
  const trees: EnsembleTree[] = [];
  for (let t = 0; t < nTrees; t++) {
    const { sample, inBagIndices } = bootstrapSample(points, rng);
    const featureSubsetFn = method === "randomForest" ? () => randomFeatureSubset(rng) : undefined;
    const tree = buildTree(sample, 0, { maxDepth, criterion, featureSubsetFn });
    trees.push({ tree, inBagIndices });
  }
  return trees;
}

/** アンサンブルの多数決予測（賛成票の割合も返す＝予測の «自信»）。 */
export function ensemblePredict(trees: readonly EnsembleTree[], x1: number, x2: number): { label: 0 | 1; voteFraction: number } {
  let votes1 = 0;
  for (const { tree } of trees) votes1 += predictTree(tree, x1, x2);
  const voteFraction = trees.length === 0 ? 0.5 : votes1 / trees.length;
  return { label: voteFraction >= 0.5 ? 1 : 0, voteFraction };
}

/**
 * OOB（out-of-bag）誤り率: 各点について「その点をブートストラップに含まなかった木」だけで
 * 多数決し、真のラベルと比較する。held-out データを別に用意しなくても汎化誤差を見積もれる
 * ——バギング／ランダムフォレストならではの利点。
 */
export function oobErrorRate(points: readonly ClassPoint[], trees: readonly EnsembleTree[]): number {
  let wrong = 0;
  let evaluated = 0;
  points.forEach((p, i) => {
    const oobTrees = trees.filter(({ inBagIndices }) => !inBagIndices.has(i));
    if (oobTrees.length === 0) return;
    let votes1 = 0;
    for (const { tree } of oobTrees) votes1 += predictTree(tree, p.x1, p.x2);
    const pred: 0 | 1 = votes1 / oobTrees.length >= 0.5 ? 1 : 0;
    evaluated++;
    if (pred !== p.label) wrong++;
  });
  return evaluated === 0 ? Number.NaN : wrong / evaluated;
}

// ────────────────────────────────────────────────────────────
// AdaBoost（決定株を逐次追加し、指数損失を最小化するように標本重みを更新する）
// ────────────────────────────────────────────────────────────

export type StumpModel = { feature: 0 | 1; threshold: number; leftValue: 1 | -1; rightValue: 1 | -1 };

/** 重み付き多数決で ±1 を決める（AdaBoost はラベルを ±1 で扱う教科書的定式化）。 */
function weightedMajoritySign(points: readonly ClassPoint[], weights: readonly number[]): 1 | -1 {
  let wPos = 0;
  let wNeg = 0;
  points.forEach((p, i) => {
    if (p.label === 1) wPos += weights[i];
    else wNeg += weights[i];
  });
  return wPos >= wNeg ? 1 : -1;
}

/** 標本重み付きで加重誤差を最小化する決定株（深さ1の木）を全探索する。 */
export function bestStump(points: readonly ClassPoint[], weights: readonly number[]): { stump: StumpModel; weightedError: number } {
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  let best: { stump: StumpModel; weightedError: number } | null = null;

  for (const feature of [0, 1] as const) {
    const values = [...new Set(points.map((p) => featureValue(p, feature)))].sort((a, b) => a - b);
    for (let i = 0; i < values.length - 1; i++) {
      const threshold = (values[i] + values[i + 1]) / 2;
      const leftIdx: number[] = [];
      const rightIdx: number[] = [];
      points.forEach((p, idx) => {
        (featureValue(p, feature) <= threshold ? leftIdx : rightIdx).push(idx);
      });
      if (leftIdx.length === 0 || rightIdx.length === 0) continue;

      const leftValue = weightedMajoritySign(
        leftIdx.map((idx) => points[idx]),
        leftIdx.map((idx) => weights[idx]),
      );
      const rightValue = weightedMajoritySign(
        rightIdx.map((idx) => points[idx]),
        rightIdx.map((idx) => weights[idx]),
      );

      let err = 0;
      points.forEach((p, idx) => {
        const y: 1 | -1 = p.label === 1 ? 1 : -1;
        const v = featureValue(p, feature);
        const pred = v <= threshold ? leftValue : rightValue;
        if (pred !== y) err += weights[idx];
      });
      err /= totalWeight;

      if (!best || err < best.weightedError) {
        best = { stump: { feature, threshold, leftValue, rightValue }, weightedError: err };
      }
    }
  }
  if (!best) throw new Error("bestStump: 有効な分割が見つからない（点が少なすぎる）");
  return best;
}

/** 決定株の予測（±1）。 */
export function stumpPredict(stump: StumpModel, x1: number, x2: number): 1 | -1 {
  const v = stump.feature === 0 ? x1 : x2;
  return v <= stump.threshold ? stump.leftValue : stump.rightValue;
}

export type AdaBoostRound = {
  round: number;
  weightsBefore: number[];
  stump: StumpModel;
  weightedError: number;
  alpha: number;
  weightsAfter: number[];
  /** このラウンドの株「単体」で誤分類した点（重み更新の対象）。 */
  misclassified: boolean[];
};

/**
 * AdaBoost（SAMME の2クラス版 = 教科書的な AdaBoost.M1）を nRounds 回まわす。
 * 各ラウンド: (1) 現在の重みで最良の決定株を選ぶ → (2) 加重誤差 err から
 * α=½ln((1−err)/err) を計算（誤差が小さいほど大きな発言権）→
 * (3) 誤分類した点の重みを exp(α) 倍・正解した点を exp(−α) 倍して正規化。
 */
export function adaBoostFit(points: readonly ClassPoint[], nRounds: number): AdaBoostRound[] {
  const n = points.length;
  let weights: number[] = new Array(n).fill(1 / n);
  const rounds: AdaBoostRound[] = [];

  for (let r = 0; r < nRounds; r++) {
    const weightsBefore = [...weights];
    const { stump, weightedError } = bestStump(points, weights);
    const err = Math.min(Math.max(weightedError, 1e-6), 1 - 1e-6);
    const alpha = 0.5 * Math.log((1 - err) / err);

    const misclassified: boolean[] = [];
    const newWeights = points.map((p, i) => {
      const y: 1 | -1 = p.label === 1 ? 1 : -1;
      const pred = stumpPredict(stump, p.x1, p.x2);
      const wrong = pred !== y;
      misclassified.push(wrong);
      return weights[i] * Math.exp(-alpha * y * pred);
    });
    const total = newWeights.reduce((s, w) => s + w, 0);
    weights = newWeights.map((w) => w / total);

    rounds.push({ round: r, weightsBefore, stump, weightedError, alpha, weightsAfter: [...weights], misclassified });
  }
  return rounds;
}

/** AdaBoost アンサンブルの予測（α で重み付けした投票の符号）。uptoRound で途中経過も見られる。 */
export function adaBoostPredict(rounds: readonly AdaBoostRound[], x1: number, x2: number, uptoRound?: number): 1 | -1 {
  const limit = uptoRound ?? rounds.length;
  let sum = 0;
  for (let i = 0; i < limit; i++) sum += rounds[i].alpha * stumpPredict(rounds[i].stump, x1, x2);
  return sum >= 0 ? 1 : -1;
}

// ────────────────────────────────────────────────────────────
// 勾配ブースティング（回帰、二乗誤差損失）: 残差に浅い回帰木を逐次フィットする関数勾配降下
// ────────────────────────────────────────────────────────────

export type RegPoint = { x: number; y: number };

/** 回帰用の1次元合成データ（真の関数 sin(2πx) にノイズを乗せる）。 */
export function generateRegressionData(n: number, seed: number, noiseSd: number): RegPoint[] {
  const rng = makeLcg(seed);
  const xs = linspace(0.02, 0.98, n);
  return xs.map((x) => ({ x, y: Math.sin(2 * Math.PI * x) + noiseSd * pseudoGaussian(rng) }));
}

function meanY(points: readonly RegPoint[]): number {
  return points.reduce((s, p) => s + p.y, 0) / points.length;
}

function varianceY(points: readonly RegPoint[]): number {
  const m = meanY(points);
  return points.reduce((s, p) => s + (p.y - m) ** 2, 0) / points.length;
}

/** 回帰木の分割基準: 分割後の重み付き分散（SSE/n）が最小になる閾値＝分散減少が最大の閾値。 */
export function bestRegSplit(points: readonly RegPoint[]): { threshold: number; gain: number } | null {
  const n = points.length;
  if (n < 2) return null;
  const parentVar = varianceY(points);
  const values = [...new Set(points.map((p) => p.x))].sort((a, b) => a - b);
  let best: { threshold: number; gain: number } | null = null;
  for (let i = 0; i < values.length - 1; i++) {
    const threshold = (values[i] + values[i + 1]) / 2;
    const left = points.filter((p) => p.x <= threshold);
    const right = points.filter((p) => p.x > threshold);
    if (left.length === 0 || right.length === 0) continue;
    const weighted = (left.length / n) * varianceY(left) + (right.length / n) * varianceY(right);
    const gain = parentVar - weighted;
    if (!best || gain > best.gain + 1e-12) best = { threshold, gain };
  }
  return best;
}

export type RegTreeNode = {
  depth: number;
  nSamples: number;
  prediction: number;
  threshold?: number;
  left?: RegTreeNode;
  right?: RegTreeNode;
};

/** 浅い回帰木（CART, 二乗誤差損失）。勾配ブースティングの弱学習器として使う。 */
export function buildRegTree(points: readonly RegPoint[], depth: number, maxDepth: number): RegTreeNode {
  const prediction = meanY(points);
  if (depth >= maxDepth || points.length < 4) return { depth, nSamples: points.length, prediction };
  const split = bestRegSplit(points);
  if (!split || split.gain <= 1e-9) return { depth, nSamples: points.length, prediction };
  const left = points.filter((p) => p.x <= split.threshold);
  const right = points.filter((p) => p.x > split.threshold);
  return {
    depth,
    nSamples: points.length,
    prediction,
    threshold: split.threshold,
    left: buildRegTree(left, depth + 1, maxDepth),
    right: buildRegTree(right, depth + 1, maxDepth),
  };
}

export function predictRegTree(node: RegTreeNode, x: number): number {
  if (node.threshold === undefined || !node.left || !node.right) return node.prediction;
  return x <= node.threshold ? predictRegTree(node.left, x) : predictRegTree(node.right, x);
}

export type GbRound = { round: number; residuals: number[]; tree: RegTreeNode };

/**
 * 勾配ブースティング（回帰、二乗誤差損失 L=½(y−F)²）。
 * 二乗誤差の負の勾配 −∂L/∂F = y−F はちょうど «残差» になるので、各ラウンドは
 * 「今の予測 F の残差に浅い回帰木を1本フィットし、learningRate 倍して足す」という
 * 関数空間での最急降下法として書ける（F_{m}=F_{m-1}+\eta\,h_m,\ h_m\approx \arg\min\sum(r_i-h(x_i))^2）。
 */
export function gradientBoostingFit(points: readonly RegPoint[], nRounds: number, learningRate: number, maxDepth: number): GbRound[] {
  const initial = meanY(points);
  let predictions = new Array(points.length).fill(initial);
  const rounds: GbRound[] = [];
  for (let r = 0; r < nRounds; r++) {
    const residuals = points.map((p, i) => p.y - predictions[i]);
    const treePoints: RegPoint[] = points.map((p, i) => ({ x: p.x, y: residuals[i] }));
    const tree = buildRegTree(treePoints, 0, maxDepth);
    predictions = predictions.map((pred, i) => pred + learningRate * predictRegTree(tree, points[i].x));
    rounds.push({ round: r, residuals, tree });
  }
  return rounds;
}

/** 勾配ブースティングの予測（初期値 + Σ学習率×各木の出力）。uptoRound で途中経過も見られる。 */
export function gbPredict(rounds: readonly GbRound[], initial: number, x: number, learningRate: number, uptoRound?: number): number {
  const limit = uptoRound ?? rounds.length;
  let pred = initial;
  for (let i = 0; i < limit; i++) pred += learningRate * predictRegTree(rounds[i].tree, x);
  return pred;
}

export function meanSquaredError(preds: readonly number[], targets: readonly number[]): number {
  if (preds.length === 0) return Number.NaN;
  let sum = 0;
  for (let i = 0; i < preds.length; i++) sum += (preds[i] - targets[i]) ** 2;
  return sum / preds.length;
}
