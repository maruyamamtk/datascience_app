/**
 * 不均衡データ・異常検知（I-6）の計算層（純関数・副作用なし・Vitest 対象）。
 *
 * 題材は2つ:
 * 1) **不均衡データ**: 多数派クラス（正常）に対して少数派クラス（陽性）が極端に少ない2特徴量の判別データ。
 *    - **SMOTE**: 少数派クラス «内» の k近傍を線分で結び、その線分上に合成サンプルを1点ずつ生成する
 *      オーバーサンプリング。
 *    - **ADASYN**: SMOTEと同じ線分補間だが、«多数派に囲まれて学習しづらい» 少数派点ほど多く合成する
 *      （局所的な困難度で重み付けした適応的なサンプリング）。
 *    - **コスト考慮型学習**: 見逃し（偽陰性）と誤報（偽陽性）のコストが非対称なとき、確率の分類しきい値を
 *      0.5 から動かすことで期待コストを最小化する。
 * 2) **異常検知**: 正常クラスタから離れた点を検出する3手法。
 *    - **LOF（局所外れ値因子）**: 自分の局所密度と近傍の局所密度の «比»。
 *    - **Isolation Forest**: ランダム分割木で «少ない分割で孤立するほど異常» という考え方。
 *    - **MSPC（多変量統計プロセス管理）**: T²統計量（平均からの大域的なズレ）と Q統計量
 *      （主成分1本への射影残差——隠れ層1・活性化関数が恒等関数の線形オートエンコーダの
 *      再構成誤差と数学的に一致する）。
 *
 * 乱数は決定的な整数演算 LCG（tasks/lessons.md の教訓・reinforcement-learning.ts と同じ方式）。
 * ガウス風ノイズは Box–Muller ではなく «一様乱数3個の和−1.5»（Irwin–Hall近似, naive-bayes-knn.ts と同じ）
 * で作り、超越関数を使わず SSR/ブラウザ間でビット一致させる。
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

export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
export const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));

// ────────────────────────────────────────────────────────────
// 2特徴量データ・距離
// ────────────────────────────────────────────────────────────

export type Point2D = { x1: number; x2: number };
export type LabeledPoint = Point2D & { label: 0 | 1 };

/** ユークリッド距離（2次元、ピタゴラスの定理そのもの）。 */
export function euclideanDistance(a: Point2D, b: Point2D): number {
  return Math.sqrt((a.x1 - b.x1) ** 2 + (a.x2 - b.x2) ** 2);
}

type GaussCluster = { mean1: number; mean2: number; sd1: number; sd2: number; n: number; label: 0 | 1 };

function generateCluster(c: GaussCluster, rng: () => number): LabeledPoint[] {
  const points: LabeledPoint[] = [];
  for (let i = 0; i < c.n; i++) {
    const x1 = clamp01(c.mean1 + c.sd1 * pseudoGaussian(rng));
    const x2 = clamp01(c.mean2 + c.sd2 * pseudoGaussian(rng));
    points.push({ x1, x2, label: c.label });
  }
  return points;
}

/** 多数派クラス（正常, label=0）の人数。 */
export const N_MAJORITY = 40;
/** 少数派クラス（陽性, label=1）のうち «核»（多数派から離れた典型例）の人数。 */
export const N_MINORITY_CORE = 5;
/** 少数派クラスのうち «境界»（多数派に近く学習しづらい例）の人数。 */
export const N_MINORITY_BORDERLINE = 3;

/**
 * 不均衡データを決定的に生成する: 多数派クラス40点 + 少数派クラス8点
 * （うち核5点は多数派から離れた領域、境界3点は多数派クラスタに近い領域）。
 * 核と境界を分けておくことで、ADASYNが «境界の少数派点ほど多く合成する» という性質を
 * SMOTE（一様）との対比で可視化できる。
 */
export function generateImbalancedData(seed: number): LabeledPoint[] {
  const rng = makeLcg(seed);
  const majority = generateCluster({ mean1: 0.58, mean2: 0.45, sd1: 0.16, sd2: 0.16, n: N_MAJORITY, label: 0 }, rng);
  const core = generateCluster(
    { mean1: 0.14, mean2: 0.78, sd1: 0.045, sd2: 0.045, n: N_MINORITY_CORE, label: 1 },
    rng,
  );
  const borderline = generateCluster(
    { mean1: 0.34, mean2: 0.54, sd1: 0.045, sd2: 0.045, n: N_MINORITY_BORDERLINE, label: 1 },
    rng,
  );
  return [...majority, ...core, ...borderline];
}

// ────────────────────────────────────────────────────────────
// クラス不均衡の指標
// ────────────────────────────────────────────────────────────

export type ClassCounts = { majority: number; minority: number };

/** クラスごとの人数（多数派=label0, 少数派=label1）。 */
export function classCounts(points: readonly LabeledPoint[]): ClassCounts {
  let majority = 0;
  let minority = 0;
  for (const p of points) if (p.label === 0) majority++;
  else minority++;
  return { majority, minority };
}

/** 不均衡比（多数派÷少数派）。値が大きいほど不均衡が深刻。 */
export function imbalanceRatio(counts: ClassCounts): number {
  return counts.minority > 0 ? counts.majority / counts.minority : Number.POSITIVE_INFINITY;
}

/** «常に多数派を予測する» 素朴な分類器の正解率（accuracy paradox の実演に使う）。 */
export function majorityBaselineAccuracy(counts: ClassCounts): number {
  const total = counts.majority + counts.minority;
  return total > 0 ? counts.majority / total : Number.NaN;
}

// ────────────────────────────────────────────────────────────
// SMOTE / ADASYN
// ────────────────────────────────────────────────────────────

/** 点集合の中で index 番目の点から見た距離昇順の他点インデックス（自分自身は除く）。 */
export function nearestIndicesWithin(points: readonly Point2D[], index: number, k: number): number[] {
  return points
    .map((p, i) => ({ i, dist: i === index ? Number.POSITIVE_INFINITY : euclideanDistance(p, points[index]) }))
    .sort((a, b) => a.dist - b.dist || a.i - b.i)
    .slice(0, Math.max(0, Math.min(Math.floor(k), points.length - 1)))
    .map((e) => e.i);
}

/** 2点 a, b を結ぶ線分上に gap∈[0,1) の位置で新しい点を作る（SMOTE/ADASYNに共通の補間式）。 */
export function interpolate(a: Point2D, b: Point2D, gap: number): Point2D {
  return { x1: a.x1 + gap * (b.x1 - a.x1), x2: a.x2 + gap * (b.x2 - a.x2) };
}

export type SmoteStep = {
  /** 何番目に合成したか（0始まり）。 */
  order: number;
  /** 種になった少数派点の（少数派配列内の）添字。 */
  seedIndex: number;
  seed: Point2D;
  /** 選ばれた少数派内近傍の添字。 */
  neighborIndex: number;
  neighbor: Point2D;
  /** 線分上の位置 gap∈[0,1)。 */
  gap: number;
  /** 生成された合成サンプル。 */
  synthetic: Point2D;
};

/**
 * SMOTE（Synthetic Minority Oversampling Technique）で合成サンプルの列を決定的に生成する。
 * 少数派点を順番に巡回しながら（0,1,2,...,n-1,0,1,...）、その点の少数派内 k近傍からランダムに
 * 1点選び、線分上のランダムな位置（gap）に合成点を打つ——教科書の説明そのままの手順。
 */
export function generateSmoteSequence(
  minorityPoints: readonly Point2D[],
  k: number,
  count: number,
  seed: number,
): SmoteStep[] {
  const rng = makeLcg(seed);
  const n = minorityPoints.length;
  const steps: SmoteStep[] = [];
  if (n === 0) return steps;
  for (let order = 0; order < count; order++) {
    const seedIndex = order % n;
    const neighbors = nearestIndicesWithin(minorityPoints, seedIndex, k);
    if (neighbors.length === 0) continue;
    const neighborIndex = neighbors[Math.min(neighbors.length - 1, Math.floor(rng() * neighbors.length))];
    const gap = rng();
    const synthetic = interpolate(minorityPoints[seedIndex], minorityPoints[neighborIndex], gap);
    steps.push({ order, seedIndex, seed: minorityPoints[seedIndex], neighborIndex, neighbor: minorityPoints[neighborIndex], gap, synthetic });
  }
  return steps;
}

/**
 * ある少数派点の «局所的な学習の困難度»: 全データ（多数派+少数派)内でのk近傍のうち
 * 多数派が占める割合 Δ_i/k。値が大きいほど «多数派に囲まれている=決定境界に近い=学習しづらい»。
 */
export function localDifficulty(minorityPoint: Point2D, allPoints: readonly LabeledPoint[], k: number): number {
  const withDist = allPoints
    .map((p) => ({ p, dist: euclideanDistance(p, minorityPoint) }))
    .sort((a, b) => a.dist - b.dist);
  // allPoints に minorityPoint 自身が含まれる場合は距離0の自分自身を除いて数える。
  const neighbors = withDist.filter((e) => e.dist > 0).slice(0, Math.max(0, Math.floor(k)));
  if (neighbors.length === 0) return 0;
  const majorityCount = neighbors.filter((e) => e.p.label === 0).length;
  return majorityCount / neighbors.length;
}

/**
 * ADASYN の適応重み g_i = Δ_i / ΣΔ_i（困難度が高い少数派点ほど大きい重み＝より多く合成される）。
 * 全点のΔが0（=どの少数派点も多数派に囲まれていない）場合は一様重みにフォールバックする。
 */
export function adasynWeights(minorityPoints: readonly Point2D[], allPoints: readonly LabeledPoint[], k: number): number[] {
  const diffs = minorityPoints.map((p) => localDifficulty(p, allPoints, k));
  const total = diffs.reduce((s, d) => s + d, 0);
  if (total <= 0) return minorityPoints.map(() => 1 / Math.max(1, minorityPoints.length));
  return diffs.map((d) => d / total);
}

/** 重み配列から累積分布で1つを選ぶ（一様乱数 u∈[0,1) を使う決定的な重み付きサンプリング）。 */
export function weightedPick(weights: readonly number[], u: number): number {
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return 0;
  let acc = 0;
  const target = u * total;
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i];
    if (target < acc) return i;
  }
  return weights.length - 1;
}

/**
 * ADASYN で合成サンプルの列を決定的に生成する。種点の選び方だけが SMOTE と異なる
 * （SMOTEは巡回で一様、ADASYNは困難度で重み付けした乱択）——近傍選択・線分補間は共通。
 */
export function generateAdasynSequence(
  minorityPoints: readonly Point2D[],
  allPoints: readonly LabeledPoint[],
  k: number,
  count: number,
  seed: number,
): SmoteStep[] {
  const rng = makeLcg(seed);
  const n = minorityPoints.length;
  const steps: SmoteStep[] = [];
  if (n === 0) return steps;
  const weights = adasynWeights(minorityPoints, allPoints, k);
  for (let order = 0; order < count; order++) {
    const seedIndex = weightedPick(weights, rng());
    const neighbors = nearestIndicesWithin(minorityPoints, seedIndex, k);
    if (neighbors.length === 0) continue;
    const neighborIndex = neighbors[Math.min(neighbors.length - 1, Math.floor(rng() * neighbors.length))];
    const gap = rng();
    const synthetic = interpolate(minorityPoints[seedIndex], minorityPoints[neighborIndex], gap);
    steps.push({ order, seedIndex, seed: minorityPoints[seedIndex], neighborIndex, neighbor: minorityPoints[neighborIndex], gap, synthetic });
  }
  return steps;
}

// ────────────────────────────────────────────────────────────
// コスト考慮型学習
// ────────────────────────────────────────────────────────────

/**
 * 期待コストを最小化する分類しきい値 p*。
 * y=1 と予測すべきは C_FN·p(x) > C_FP·(1−p(x)) のとき——これを p(x) について解くと
 * p(x) > C_FP/(C_FP+C_FN) となり、この右辺が最適しきい値。
 * コストが対称（C_FP=C_FN）なら p*=0.5（既定のロジスティック回帰の判定と一致）。
 */
export function costOptimalThreshold(costFP: number, costFN: number): number {
  const total = costFP + costFN;
  return total > 0 ? costFP / total : 0.5;
}

/** しきい値で確率スコアを二値分類する。 */
export function classifyByThreshold(probability: number, threshold: number): 0 | 1 {
  return probability >= threshold ? 1 : 0;
}

export type ConfusionCounts = { tp: number; fp: number; tn: number; fn: number };

/** しきい値を適用したときの混同行列（真のラベルと確率スコアの配列から集計）。 */
export function confusionAt(
  labels: readonly (0 | 1)[],
  probabilities: readonly number[],
  threshold: number,
): ConfusionCounts {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  for (let i = 0; i < labels.length; i++) {
    const pred = classifyByThreshold(probabilities[i], threshold);
    if (labels[i] === 1 && pred === 1) tp++;
    else if (labels[i] === 0 && pred === 1) fp++;
    else if (labels[i] === 0 && pred === 0) tn++;
    else fn++;
  }
  return { tp, fp, tn, fn };
}

/** 混同行列と単価から期待総コストを計算する（FP×costFP + FN×costFN）。 */
export function expectedCost(counts: ConfusionCounts, costFP: number, costFN: number): number {
  return counts.fp * costFP + counts.fn * costFN;
}

/** 点群の重心（平均）。 */
export function meanOf(points: readonly Point2D[]): Point2D {
  const n = Math.max(1, points.length);
  return {
    x1: points.reduce((s, p) => s + p.x1, 0) / n,
    x2: points.reduce((s, p) => s + p.x2, 0) / n,
  };
}

/**
 * «多数派重心 → 少数派重心» の方向へ射影し [0,1] に正規化した疑似スコア（実際の分類器は
 * 訓練しない——MVP範囲外の重い学習を避けつつ、コスト考慮型学習のしきい値操作を教育的に
 * 見せるための決定論的な代理指標）。0=多数派側に深く、1=少数派側に深く対応する。
 */
export function projectionScore(point: Point2D, majorityMean: Point2D, minorityMean: Point2D): number {
  const dx = minorityMean.x1 - majorityMean.x1;
  const dy = minorityMean.x2 - majorityMean.x2;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-9) return 0.5;
  const t = ((point.x1 - majorityMean.x1) * dx + (point.x2 - majorityMean.x2) * dy) / len2;
  return clamp01(t);
}

// ────────────────────────────────────────────────────────────
// LOF（局所外れ値因子）
// ────────────────────────────────────────────────────────────

/** point から見た points 内の距離昇順インデックス（excludeIndex が渡されればそれを除く）。 */
export function kNearestIndices(points: readonly Point2D[], from: Point2D, k: number, excludeIndex?: number): number[] {
  return points
    .map((p, i) => ({ i, dist: i === excludeIndex ? Number.POSITIVE_INFINITY : euclideanDistance(p, from) }))
    .sort((a, b) => a.dist - b.dist || a.i - b.i)
    .slice(0, Math.max(0, Math.min(Math.floor(k), points.length - (excludeIndex !== undefined ? 1 : 0))))
    .map((e) => e.i);
}

/** k距離: 自分の k番目に近い点までの距離。 */
export function kDistance(points: readonly Point2D[], index: number, k: number): number {
  const neighbors = kNearestIndices(points, points[index], k, index);
  if (neighbors.length === 0) return 0;
  const last = neighbors[neighbors.length - 1];
  return euclideanDistance(points[index], points[last]);
}

/** 到達可能距離: max(kDistance(neighbor), dist(point, neighbor))。近すぎる点の距離を «底上げ» して平滑化する。 */
export function reachabilityDistance(points: readonly Point2D[], pointIndex: number, neighborIndex: number, k: number): number {
  return Math.max(kDistance(points, neighborIndex, k), euclideanDistance(points[pointIndex], points[neighborIndex]));
}

/** 局所到達可能密度 lrd(i) = 1 / (k近傍への到達可能距離の平均)。 */
export function localReachabilityDensity(points: readonly Point2D[], index: number, k: number): number {
  const neighbors = kNearestIndices(points, points[index], k, index);
  if (neighbors.length === 0) return 0;
  const meanReach = neighbors.reduce((s, j) => s + reachabilityDistance(points, index, j, k), 0) / neighbors.length;
  return meanReach > 0 ? 1 / meanReach : Number.POSITIVE_INFINITY;
}

/** LOF(i) = 近傍の lrd の平均 ÷ 自分の lrd。1に近いほど正常、大きく上回るほど異常。 */
export function lofScore(points: readonly Point2D[], index: number, k: number): number {
  const neighbors = kNearestIndices(points, points[index], k, index);
  const ownLrd = localReachabilityDensity(points, index, k);
  if (neighbors.length === 0 || ownLrd === 0) return 1;
  const meanNeighborLrd = neighbors.reduce((s, j) => s + localReachabilityDensity(points, j, k), 0) / neighbors.length;
  return ownLrd > 0 ? meanNeighborLrd / ownLrd : Number.POSITIVE_INFINITY;
}

/** 全点の LOF スコア。 */
export function lofAll(points: readonly Point2D[], k: number): number[] {
  return points.map((_, i) => lofScore(points, i, k));
}

/**
 * 訓練データの外側の任意のクエリ点における LOF 風スコア（ヒートマップ用）。
 * クエリ自身の lrd は「自分の k近傍点への到達可能距離」から計算し、比較対象の lrd は
 * 訓練データ側で事前計算済みの値を使う（クエリ点は «訪問者» としてのみ扱い、
 * 訓練データのグラフ構造は変えない——ヒートマップ計算を軽量に保つ近似）。
 */
export function lofAt(points: readonly Point2D[], trainLrd: readonly number[], query: Point2D, k: number): number {
  const neighbors = kNearestIndices(points, query, k);
  if (neighbors.length === 0) return 1;
  const reach = neighbors.map((j) => Math.max(kDistance(points, j, k), euclideanDistance(query, points[j])));
  const meanReach = reach.reduce((s, v) => s + v, 0) / reach.length;
  const ownLrd = meanReach > 0 ? 1 / meanReach : Number.POSITIVE_INFINITY;
  const meanNeighborLrd = neighbors.reduce((s, j) => s + trainLrd[j], 0) / neighbors.length;
  return ownLrd > 0 ? meanNeighborLrd / ownLrd : Number.POSITIVE_INFINITY;
}

// ────────────────────────────────────────────────────────────
// Isolation Forest（簡易・決定的）
// ────────────────────────────────────────────────────────────

export type IsoNode =
  | { kind: "leaf"; size: number }
  | { kind: "split"; feature: "x1" | "x2"; value: number; left: IsoNode; right: IsoNode };

/**
 * ランダム分割による孤立木を1本構築する（決定的LCGで特徴量・分割値を選ぶ）。
 * 深さの上限（maxDepth）または要素数1以下で葉にする——«少ない分割で孤立する=異常» という
 * Isolation Forest の考え方をそのまま木構造にしたもの。
 */
export function buildIsolationTree(indices: readonly number[], points: readonly Point2D[], depth: number, maxDepth: number, rng: () => number): IsoNode {
  if (depth >= maxDepth || indices.length <= 1) return { kind: "leaf", size: indices.length };
  const feature: "x1" | "x2" = rng() < 0.5 ? "x1" : "x2";
  const values = indices.map((i) => points[i][feature]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return { kind: "leaf", size: indices.length };
  const value = min + rng() * (max - min);
  const left = indices.filter((i) => points[i][feature] < value);
  const right = indices.filter((i) => points[i][feature] >= value);
  if (left.length === 0 || right.length === 0) return { kind: "leaf", size: indices.length };
  return {
    kind: "split",
    feature,
    value,
    left: buildIsolationTree(left, points, depth + 1, maxDepth, rng),
    right: buildIsolationTree(right, points, depth + 1, maxDepth, rng),
  };
}

/** 平均二分探索木の «探索失敗までの平均比較回数» c(n)（Isolation Forestのパス長正規化に使う）。 */
export function cFactor(n: number): number {
  if (n <= 1) return 0;
  const harmonic = Math.log(n - 1) + 0.5772156649; // オイラー定数の近似（調和数 H_{n-1} の近似）
  return 2 * harmonic - (2 * (n - 1)) / n;
}

/** 木の根から point を辿ったときのパス長（分割回数。葉での平均パス長 c(size) を加算する）。 */
export function pathLength(node: IsoNode, point: Point2D, depth = 0): number {
  if (node.kind === "leaf") return depth + cFactor(node.size);
  return point[node.feature] < node.value
    ? pathLength(node.left, point, depth + 1)
    : pathLength(node.right, point, depth + 1);
}

/**
 * numTrees 本の孤立木からなる森を構築する。各木は points から subsampleSize 個を
 * 決定的LCGで非復元抽出したサブサンプルから作る（本来のIsolation Forestの手順どおり）。
 */
export function buildIsolationForest(points: readonly Point2D[], numTrees: number, subsampleSize: number, seed: number): IsoNode[] {
  const rng = makeLcg(seed);
  const maxDepth = Math.max(1, Math.ceil(Math.log2(Math.max(2, subsampleSize))));
  const trees: IsoNode[] = [];
  for (let t = 0; t < numTrees; t++) {
    const pool = points.map((_, i) => i);
    const sample: number[] = [];
    const n = Math.min(subsampleSize, pool.length);
    for (let s = 0; s < n; s++) {
      const j = Math.floor(rng() * pool.length);
      sample.push(pool[j]);
      pool.splice(j, 1);
    }
    trees.push(buildIsolationTree(sample, points, 0, maxDepth, rng));
  }
  return trees;
}

/** Isolation Forest の異常スコア s = 2^(−E[パス長]/c(subsampleSize))。1に近いほど異常、0.5前後は正常。 */
export function isolationScore(forest: readonly IsoNode[], subsampleSize: number, point: Point2D): number {
  const avgPath = forest.reduce((s, tree) => s + pathLength(tree, point), 0) / forest.length;
  const c = cFactor(subsampleSize);
  return c > 0 ? Math.pow(2, -avgPath / c) : 0.5;
}

// ────────────────────────────────────────────────────────────
// MSPC（T² 統計量・Q 統計量）— 線形オートエンコーダの再構成誤差と Q は数学的に一致
// ────────────────────────────────────────────────────────────

export type Moments2D = { mean1: number; mean2: number; var1: number; var2: number; cov: number };

/** 2特徴量の標本平均・(不偏)分散・共分散（多変量統計プロセス管理の出発点）。 */
export function computeMoments(points: readonly Point2D[]): Moments2D {
  const n = points.length;
  const mean1 = points.reduce((s, p) => s + p.x1, 0) / n;
  const mean2 = points.reduce((s, p) => s + p.x2, 0) / n;
  const denom = Math.max(1, n - 1);
  const var1 = points.reduce((s, p) => s + (p.x1 - mean1) ** 2, 0) / denom;
  const var2 = points.reduce((s, p) => s + (p.x2 - mean2) ** 2, 0) / denom;
  const cov = points.reduce((s, p) => s + (p.x1 - mean1) * (p.x2 - mean2), 0) / denom;
  return { mean1, mean2, var1: Math.max(var1, 1e-6), var2: Math.max(var2, 1e-6), cov };
}

/**
 * T²統計量（マハラノビス距離の2乗）: T²=(x−μ)ᵀΣ⁻¹(x−μ)。«平均から大域的にどれだけ離れているか»
 * を分散・相関の形（共分散行列）で正しく測る——2×2の逆行列は解析的に書ける。
 */
export function mahalanobisT2(point: Point2D, m: Moments2D): number {
  const det = m.var1 * m.var2 - m.cov * m.cov;
  if (Math.abs(det) < 1e-9) return 0;
  const dx1 = point.x1 - m.mean1;
  const dx2 = point.x2 - m.mean2;
  // Σ⁻¹ = 1/det * [[var2, -cov], [-cov, var1]]
  const inv11 = m.var2 / det;
  const inv22 = m.var1 / det;
  const inv12 = -m.cov / det;
  return dx1 * dx1 * inv11 + 2 * dx1 * dx2 * inv12 + dx2 * dx2 * inv22;
}

/** 第1主成分方向（単位ベクトル）を共分散行列の最大固有ベクトルから解析的に求める（2×2対称行列）。 */
export function firstPrincipalDirection(m: Moments2D): { u1: number; u2: number } {
  const { var1, var2, cov } = m;
  if (Math.abs(cov) < 1e-9) {
    return var1 >= var2 ? { u1: 1, u2: 0 } : { u1: 0, u2: 1 };
  }
  const trace = var1 + var2;
  const diff = Math.sqrt((var1 - var2) ** 2 + 4 * cov * cov);
  const lambda1 = (trace + diff) / 2;
  // (Σ - λI)v = 0 の固有ベクトル。
  const u1 = lambda1 - var2;
  const u2 = cov;
  const norm = Math.sqrt(u1 * u1 + u2 * u2);
  return norm > 1e-9 ? { u1: u1 / norm, u2: u2 / norm } : { u1: 1, u2: 0 };
}

/**
 * Q統計量（SPE, Squared Prediction Error）: 主成分1本（PC1）へ射影して復元した点との誤差（残差の2乗）。
 * 隠れ層1・活性化関数が恒等関数の線形オートエンコーダは「入力をPC1へ射影して復元する」のと
 * 数学的に一致することが知られており（詳細_第6章）、この Q はそのままそのオートエンコーダの
 * 再構成誤差でもある。
 */
export function pcaResidualQ(point: Point2D, m: Moments2D): number {
  const { u1, u2 } = firstPrincipalDirection(m);
  const dx1 = point.x1 - m.mean1;
  const dx2 = point.x2 - m.mean2;
  const proj = dx1 * u1 + dx2 * u2;
  const recon1 = m.mean1 + proj * u1;
  const recon2 = m.mean2 + proj * u2;
  return (point.x1 - recon1) ** 2 + (point.x2 - recon2) ** 2;
}

// ────────────────────────────────────────────────────────────
// 異常検知データ・ランキング共通ヘルパー
// ────────────────────────────────────────────────────────────

export const N_NORMAL = 32;
export const N_OUTLIERS = 5;

/** 正常クラスタ32点 + 明示的な外れ値5点からなる決定的データ（LOF/IsolationForest/MSPC共通）。 */
export function generateAnomalyData(seed: number): (Point2D & { isPlantedOutlier: boolean })[] {
  const rng = makeLcg(seed);
  const normal = Array.from({ length: N_NORMAL }, () => ({
    x1: clamp01(0.5 + 0.14 * pseudoGaussian(rng)),
    x2: clamp01(0.5 + 0.14 * pseudoGaussian(rng)),
    isPlantedOutlier: false,
  }));
  const outlierSeeds: Point2D[] = [
    { x1: 0.08, x2: 0.9 },
    { x1: 0.93, x2: 0.85 },
    { x1: 0.05, x2: 0.12 },
    { x1: 0.88, x2: 0.06 },
    { x1: 0.5, x2: 0.96 },
  ];
  const outliers = outlierSeeds.slice(0, N_OUTLIERS).map((o) => ({
    x1: clamp01(o.x1 + 0.02 * pseudoGaussian(rng)),
    x2: clamp01(o.x2 + 0.02 * pseudoGaussian(rng)),
    isPlantedOutlier: true,
  }));
  return [...normal, ...outliers];
}

/** スコア降順の添字列（同点は元の添字順）。 */
export function rankByScoreDescending(scores: readonly number[]): number[] {
  return scores.map((s, i) => ({ s, i })).sort((a, b) => b.s - a.s || a.i - b.i).map((e) => e.i);
}

/** 上位 percentile% を異常とみなすときのカットオフ件数（0件〜全件）。 */
export function percentileCutoffCount(n: number, percentile: number): number {
  return clamp(Math.round((clamp(percentile, 0, 100) / 100) * n), 0, n);
}
