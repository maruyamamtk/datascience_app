/**
 * 単純ベイズ・k近傍法（I-4）の計算層（純関数・副作用なし・Vitest 対象）。
 *
 * 扱う道具:
 * - ガウス型ナイーブベイズ: 各クラスの特徴量が正規分布に従うと仮定し、«特徴量どうしはクラスが
 *   分かれば独立»（ナイーブな仮定）のもとで尤度を各特徴量の密度の積として計算する確率的な分類器。
 *   ベイズの定理 P(k|x)∝P(x|k)P(k)（probability-basics と同じ骨格）をそのまま使う
 *   ——事後確率が最大のクラスを選ぶ。
 * - k近傍法: 学習フェーズを持たない «怠惰学習»。新しい点から距離が近い順に k 個の訓練点を探し、
 *   多数決でラベルを決める。k を大きくすると決定境界は滑らかに（分散が下がる代わりにバイアスが増す）、
 *   小さくすると複雑に（分散が増える）——決定木・アンサンブル（#76）のバギングと同じ
 *   «平均する/多数決すると分散が下がる» ロジックがここでも成り立つ。
 *
 * データは 2 特徴量 (x1, x2) ∈ [0,1]² の判別問題（2つのガウス分布から生成）を主に使う。
 * 決定的LCG（整数演算のみ）でノイズを生成し、SSR/CSR で結果がぶれないようにする
 * （tasks/lessons.md の教訓・decision-trees-ensembles.ts と同じ方式）。
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

/** [0,1] にクランプする。 */
export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

// ────────────────────────────────────────────────────────────
// 判別データ（2特徴量、2つのガウス分布から生成）
// ────────────────────────────────────────────────────────────

export type Point2D = { x1: number; x2: number; label: 0 | 1 };

export type ClassGaussianParams = { mean1: number; mean2: number; sd1: number; sd2: number };

/**
 * クラスごとのガウス分布パラメータから 2 特徴量の判別データを生成する（決定的LCG）。
 * ナイーブベイズの «各クラスの特徴量は正規分布» という仮定に噛み合うデータを最初から作ることで、
 * Level0〜1 の物語（ガウス分布の等高線がそのままデータの «山» の形になる）を成立させる。
 */
export function generateGaussianClassData(
  nPerClass: number,
  seed: number,
  params: Record<0 | 1, ClassGaussianParams>,
): Point2D[] {
  const rng = makeLcg(seed);
  const points: Point2D[] = [];
  for (const label of [0, 1] as const) {
    const p = params[label];
    for (let i = 0; i < nPerClass; i++) {
      const x1 = clamp01(p.mean1 + p.sd1 * pseudoGaussian(rng));
      const x2 = clamp01(p.mean2 + p.sd2 * pseudoGaussian(rng));
      points.push({ x1, x2, label });
    }
  }
  return points;
}

// ────────────────────────────────────────────────────────────
// ガウス型ナイーブベイズ
// ────────────────────────────────────────────────────────────

/** 1次元ガウス密度 p(x)=1/(σ√(2π))·exp(−(x−μ)²/(2σ²))。σ は数値安定のため下限を持つ。 */
export function gaussianPdf(x: number, mean: number, sd: number): number {
  const s = Math.max(sd, 1e-6);
  const z = (x - mean) / s;
  return Math.exp(-0.5 * z * z) / (s * Math.sqrt(2 * Math.PI));
}

export type ClassStats = {
  label: 0 | 1;
  /** 事前確率（訓練データでのクラス比率）。 */
  prior: number;
  n: number;
  mean1: number;
  mean2: number;
  sd1: number;
  sd2: number;
};

/**
 * クラスごとに標本平均・標本分散（不偏, n≥2 なら ddof=1）を推定する（最尤法/モーメント法の実務的近似）。
 * この平均・分散がそのままガウス分布の «山» の中心と広がりになる。
 */
export function fitGaussianNB(points: readonly Point2D[]): ClassStats[] {
  const n = points.length;
  return ([0, 1] as const).map((label) => {
    const pts = points.filter((p) => p.label === label);
    const m = pts.length;
    const mean1 = m > 0 ? pts.reduce((s, p) => s + p.x1, 0) / m : 0.5;
    const mean2 = m > 0 ? pts.reduce((s, p) => s + p.x2, 0) / m : 0.5;
    const varOf = (vals: number[], mean: number) =>
      vals.length > 1 ? vals.reduce((s, v) => s + (v - mean) ** 2, 0) / (vals.length - 1) : 0.01;
    const sd1 = Math.sqrt(Math.max(varOf(pts.map((p) => p.x1), mean1), 1e-4));
    const sd2 = Math.sqrt(Math.max(varOf(pts.map((p) => p.x2), mean2), 1e-4));
    return { label, prior: n > 0 ? m / n : 0.5, n: m, mean1, mean2, sd1, sd2 };
  });
}

export type NBPrediction = {
  label: 0 | 1;
  /** [クラス0, クラス1] の事前確率。 */
  prior: [number, number];
  /** [クラス0, クラス1] の x1 尤度 p(x1|k)。 */
  likelihood1: [number, number];
  /** [クラス0, クラス1] の x2 尤度 p(x2|k)。 */
  likelihood2: [number, number];
  /** [クラス0, クラス1] の未正規化スコア（事前×尤度×尤度）。 */
  score: [number, number];
  /** [クラス0, クラス1] の事後確率（正規化済み、合計1）。 */
  posterior: [number, number];
};

/**
 * ガウス型ナイーブベイズで (x1,x2) を分類する。
 * P(k|x) ∝ π_k·p(x1|k)·p(x2|k)（«特徴量はクラス条件付きで独立» という conditional-independence
 * の仮定で尤度を積に分解）。分母（正規化定数）は大小関係に影響しないので、スコアの比較だけで
 * 分類は完了する（正規化は «確率らしく見せる» ための後処理）。
 */
export function naiveBayesPredict(classStats: readonly ClassStats[], x1: number, x2: number): NBPrediction {
  const c0 = classStats.find((c) => c.label === 0);
  const c1 = classStats.find((c) => c.label === 1);
  if (!c0 || !c1) throw new Error("naiveBayesPredict: クラス0/1の統計量が両方必要");

  const prior: [number, number] = [c0.prior, c1.prior];
  const likelihood1: [number, number] = [gaussianPdf(x1, c0.mean1, c0.sd1), gaussianPdf(x1, c1.mean1, c1.sd1)];
  const likelihood2: [number, number] = [gaussianPdf(x2, c0.mean2, c0.sd2), gaussianPdf(x2, c1.mean2, c1.sd2)];
  const score: [number, number] = [
    prior[0] * likelihood1[0] * likelihood2[0],
    prior[1] * likelihood1[1] * likelihood2[1],
  ];
  const total = score[0] + score[1];
  const posterior: [number, number] = total > 0 ? [score[0] / total, score[1] / total] : [0.5, 0.5];
  const label: 0 | 1 = posterior[1] >= posterior[0] ? 1 : 0;
  return { label, prior, likelihood1, likelihood2, score, posterior };
}

/** `naiveBayesPredict` のラベルだけを返す薄いラッパー（決定境界グリッド計算などで使う）。 */
export function naiveBayesPredictLabel(classStats: readonly ClassStats[], x1: number, x2: number): 0 | 1 {
  return naiveBayesPredict(classStats, x1, x2).label;
}

export type Ellipse = { cx: number; cy: number; rx: number; ry: number };

/**
 * kSigma·標準偏差 を半径とする «信頼楕円»（等高線の近似）。ガウス型ナイーブベイズは特徴量の
 * 独立を仮定するため共分散が対角行列になり、等高線は軸に平行な楕円になる——グリッドで密度を
 * サンプリングせず、平均・標準偏差から直接 SVG の `<ellipse>` として描ける（超越関数を
 * SVG座標に直接渡さないので Math.exp の 1ULP 差によるハイドレーション不一致の心配がない）。
 */
export function confidenceEllipse(stats: ClassStats, kSigma: number): Ellipse {
  return { cx: stats.mean1, cy: stats.mean2, rx: stats.sd1 * kSigma, ry: stats.sd2 * kSigma };
}

// ────────────────────────────────────────────────────────────
// k近傍法
// ────────────────────────────────────────────────────────────

/** ユークリッド距離（2次元、ピタゴラスの定理そのもの）。 */
export function euclideanDistance(a: { x1: number; x2: number }, b: { x1: number; x2: number }): number {
  return Math.sqrt((a.x1 - b.x1) ** 2 + (a.x2 - b.x2) ** 2);
}

export type Neighbor = { index: number; point: Point2D; dist: number };

/** 距離昇順（同点は元の添字順）にソートした全訓練点。ステッパーが «距離順に1つずつ見る» のに使う。 */
export function sortByDistance(points: readonly Point2D[], query: { x1: number; x2: number }): Neighbor[] {
  return points
    .map((point, index) => ({ index, point, dist: euclideanDistance(point, query) }))
    .sort((a, b) => a.dist - b.dist || a.index - b.index);
}

/** 距離が近い順に k 個の訓練点を返す（k が点数を超える場合は全点）。 */
export function kNearestNeighbors(points: readonly Point2D[], query: { x1: number; x2: number }, k: number): Neighbor[] {
  return sortByDistance(points, query).slice(0, Math.max(0, Math.min(Math.floor(k), points.length)));
}

export type KnnPrediction = { label: 0 | 1; voteFraction: number; neighbors: Neighbor[] };

/** k近傍法の予測（多数決）。同数のときはラベル1を選ぶ（決定木の majorityLabel と同じ取り決め）。 */
export function knnPredict(points: readonly Point2D[], query: { x1: number; x2: number }, k: number): KnnPrediction {
  const neighbors = kNearestNeighbors(points, query, k);
  const votes1 = neighbors.reduce((s, nb) => s + nb.point.label, 0);
  const voteFraction = neighbors.length > 0 ? votes1 / neighbors.length : 0.5;
  const label: 0 | 1 = voteFraction >= 0.5 ? 1 : 0;
  return { label, voteFraction, neighbors };
}

// ────────────────────────────────────────────────────────────
// 決定境界グリッド・正解率（ナイーブベイズ・k近傍法で共通に使う純関数）
// ────────────────────────────────────────────────────────────

export type GridCell = { x1: number; x2: number; label: 0 | 1 };

/** 決定境界をグリッドで塗るためのセル列。resolution×resolution 個（decision-trees-ensembles.ts と同じ形）。 */
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

/** 正解率（分類精度）。 */
export function accuracy(points: readonly Point2D[], predictFn: (x1: number, x2: number) => 0 | 1): number {
  if (points.length === 0) return Number.NaN;
  let correct = 0;
  for (const p of points) if (predictFn(p.x1, p.x2) === p.label) correct++;
  return correct / points.length;
}
