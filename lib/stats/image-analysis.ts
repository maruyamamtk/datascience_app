/**
 * 画像解析（Q-4）トピックの計算層（純関数）。
 * [NNモデル（CNN・RNN）](neural-network-models)で見た畳み込み・プーリング «そのもの» の仕組みは
 * 再導出せず（重複回避、issue #98 の指示）、本ファイルは3つの応用に専念する:
 * - 画像処理: エッジ検出（Sobel）・ぼかし（平均化フィルタ）・二値化（閾値処理）。
 * - 画像認識・分類: ソフトマックスによる多クラス確率化。
 * - 物体検出: バウンディングボックスのIoU・NMS（非最大値抑制）・アンカーボックス。
 *
 * トピック間の直接依存は避ける方針（issue #98）のため、畳み込みの基礎演算
 * （padMatrix/convWindowSum/conv2d）はneural-network-models.tsと似た実装を本ファイル内に持つ
 * （コードの重複は許容）。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。
 */

// ---------------------------------------------------------------------------
// 画像処理: 畳み込みの基礎演算（フィルタのスライド）
// ---------------------------------------------------------------------------

export type Matrix = number[][];

/** 入力行列の周囲を padding 幅だけ埋める（既定はゼロ埋め、既定 padValue=0）。 */
export function padMatrix(input: Matrix, padding: number, padValue = 0): Matrix {
  if (padding <= 0) return input.map((row) => [...row]);
  const cols = input[0]?.length ?? 0;
  const paddedCols = cols + 2 * padding;
  const fillRow = () => Array(paddedCols).fill(padValue);
  const out: Matrix = [];
  for (let i = 0; i < padding; i++) out.push(fillRow());
  for (const row of input) {
    out.push([...Array(padding).fill(padValue), ...row, ...Array(padding).fill(padValue)]);
  }
  for (let i = 0; i < padding; i++) out.push(fillRow());
  return out;
}

/** 出力サイズ公式（[NNモデル（CNN・RNN）]と同じ形。ステッパーの走査範囲を求めるのに使う）。 */
export function convOutputSize(inputSize: number, filterSize: number, stride: number, padding: number): number {
  return Math.floor((inputSize + 2 * padding - filterSize) / stride) + 1;
}

/** 1つの窓位置でのフィルタ適用（要素積の総和＋バイアス）。(top,left) は padding 後の座標。 */
export function convWindowSum(input: Matrix, kernel: Matrix, top: number, left: number, bias = 0): number {
  let sum = bias;
  for (let a = 0; a < kernel.length; a++) {
    for (let b = 0; b < kernel[0].length; b++) {
      sum += kernel[a][b] * input[top + a][left + b];
    }
  }
  return sum;
}

export type ConvOptions = { stride: number; padding: number; bias?: number };

/** フィルタを入力全体にスライドさせた出力（畳み込み）。 */
export function conv2d(input: Matrix, kernel: Matrix, options: ConvOptions): Matrix {
  const { stride, padding, bias = 0 } = options;
  const padded = padMatrix(input, padding);
  const outRows = convOutputSize(input.length, kernel.length, stride, padding);
  const outCols = convOutputSize(input[0].length, kernel[0].length, stride, padding);
  const out: Matrix = [];
  for (let i = 0; i < outRows; i++) {
    const row: number[] = [];
    for (let j = 0; j < outCols; j++) {
      row.push(convWindowSum(padded, kernel, i * stride, j * stride, bias));
    }
    out.push(row);
  }
  return out;
}

/** 出力座標を行優先で列挙する（ステッパーのフレーム順）。 */
export function windowPositions(outRows: number, outCols: number): { row: number; col: number }[] {
  const out: { row: number; col: number }[] = [];
  for (let i = 0; i < outRows; i++) {
    for (let j = 0; j < outCols; j++) out.push({ row: i, col: j });
  }
  return out;
}

// ---------------------------------------------------------------------------
// 画像処理: エッジ検出（Sobel）・ぼかし（平均化）・二値化（閾値処理）
// ---------------------------------------------------------------------------

/** Sobel 縦方向フィルタ（横方向の明暗の変化=縦エッジに強く反応する）。 */
export const SOBEL_X: Matrix = [
  [-1, 0, 1],
  [-2, 0, 2],
  [-1, 0, 1],
];

/** Sobel 横方向フィルタ（縦方向の明暗の変化=横エッジに強く反応する）。 */
export const SOBEL_Y: Matrix = [
  [-1, -2, -1],
  [0, 0, 0],
  [1, 2, 1],
];

/** 3×3 平均化（ぼかし）フィルタ。全要素 1/9 で「窓内の平均」を計算する。 */
export const AVERAGE_BLUR_3: Matrix = [
  [1 / 9, 1 / 9, 1 / 9],
  [1 / 9, 1 / 9, 1 / 9],
  [1 / 9, 1 / 9, 1 / 9],
];

/**
 * 勾配強度（エッジの強さ）= √(Gx²+Gy²)。Sobel の縦・横フィルタの出力を三平方の定理と同じ形で合成する。
 * gx・gy は同じ形の行列である前提。
 */
export function gradientMagnitude(gx: Matrix, gy: Matrix): Matrix {
  return gx.map((row, i) => row.map((v, j) => Math.sqrt(v * v + gy[i][j] * gy[i][j])));
}

/** 二値化（閾値処理）: 各画素を閾値 t 以上なら1（白）、未満なら0（黒）に変換する。 */
export function binarize(input: Matrix, t: number): Matrix {
  return input.map((row) => row.map((v) => (v >= t ? 1 : 0)));
}

// ---------------------------------------------------------------------------
// 画像認識・分類: ソフトマックスによる多クラス確率化
// ---------------------------------------------------------------------------

/**
 * ソフトマックス関数。CNNなどが出力する生のスコア（ロジット）を、
 * 「非負」「総和1」を満たす確率分布に変換する。
 * オーバーフロー対策として最大値を引いてから exp を取る（結果は数学的に同一、数値的に安定）。
 */
export function softmax(logits: readonly number[]): number[] {
  if (logits.length === 0) return [];
  const max = Math.max(...logits);
  const exps = logits.map((z) => Math.exp(z - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

/** 値が最大の index（同点は最初の index）。 */
export function argmax(values: readonly number[]): number {
  let best = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[best]) best = i;
  }
  return best;
}

export type ClassPrediction = { label: string; prob: number; index: number };

/** ラベル付きの確率を降順に並べ、上位 k 件を返す（top-k 予測）。 */
export function topKPredictions(labels: readonly string[], probs: readonly number[], k: number): ClassPrediction[] {
  return labels
    .map((label, index) => ({ label, prob: probs[index] ?? 0, index }))
    .sort((a, b) => b.prob - a.prob)
    .slice(0, k);
}

// ---------------------------------------------------------------------------
// 物体検出: バウンディングボックス・IoU・NMS・アンカーボックス
// ---------------------------------------------------------------------------

/** バウンディングボックス（左上座標 x,y と幅 w・高さ h）。 */
export type Box = { x: number; y: number; w: number; h: number };

/** ボックスの面積。 */
export function boxArea(b: Box): number {
  return Math.max(0, b.w) * Math.max(0, b.h);
}

/** 2つのボックスの共通部分（重なり）の面積。重ならなければ0。 */
export function intersectionArea(a: Box, b: Box): number {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.w, b.x + b.w);
  const bottom = Math.min(a.y + a.h, b.y + b.h);
  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);
  return width * height;
}

/** 2つのボックスの和集合の面積 = 各面積の和 − 共通部分（重複を1回だけ数える）。 */
export function unionArea(a: Box, b: Box): number {
  return boxArea(a) + boxArea(b) - intersectionArea(a, b);
}

/** IoU（Intersection over Union） = 共通部分の面積 / 和集合の面積。重なりが無ければ0、完全一致なら1。 */
export function iou(a: Box, b: Box): number {
  const union = unionArea(a, b);
  if (union <= 0) return 0;
  return intersectionArea(a, b) / union;
}

/** スコア（確信度）付きのボックス。 */
export type ScoredBox = Box & { score: number; label?: string };

/** NMS の1ステップ分の記録（コマ送りステッパーが使う）。 */
export type NmsStep = {
  /** このステップで「採用」した候補の index（元の boxes 配列の index）。 */
  keepIndex: number;
  /** この採用によって「抑制（除去）」された候補の index と、そのIoU。 */
  suppressed: { index: number; iouValue: number }[];
  /** このステップ終了時点でまだ判定されていない残り候補の index。 */
  remainingIndices: number[];
};

/**
 * 非最大値抑制（Non-Maximum Suppression）。
 * スコア降順で候補を1つずつ確定させ、採用した候補とIoUがしきい値以上の残り候補を全て取り除く
 * （＝同じ物体を指している重複検出とみなして捨てる）ことを、候補が尽きるまで繰り返す。
 * 返り値の steps は「採用 → 抑制」を1ステップとして記録した実行トレース（アルゴリズム図鑑の元データ）。
 */
export function nonMaxSuppression(
  boxes: readonly ScoredBox[],
  iouThreshold: number,
): { kept: number[]; steps: NmsStep[] } {
  let remaining = boxes.map((_, i) => i).sort((i, j) => boxes[j].score - boxes[i].score);
  const kept: number[] = [];
  const steps: NmsStep[] = [];

  while (remaining.length > 0) {
    const keepIndex = remaining[0];
    kept.push(keepIndex);
    const rest = remaining.slice(1);
    const suppressed: { index: number; iouValue: number }[] = [];
    const nextRemaining: number[] = [];
    for (const idx of rest) {
      const overlap = iou(boxes[keepIndex], boxes[idx]);
      if (overlap >= iouThreshold) {
        suppressed.push({ index: idx, iouValue: overlap });
      } else {
        nextRemaining.push(idx);
      }
    }
    steps.push({ keepIndex, suppressed, remainingIndices: [...nextRemaining] });
    remaining = nextRemaining;
  }

  return { kept, steps };
}

/**
 * アンカーボックスを生成する。中心座標・面積の目安（scale²）・縦横比（ratio=w/h）の組から、
 * w·h=scale² かつ w/h=ratio を満たす w,h を連立方程式として解く: w=scale·√ratio, h=scale/√ratio。
 */
export function generateAnchors(
  center: { x: number; y: number },
  scales: readonly number[],
  ratios: readonly number[],
): Box[] {
  const boxes: Box[] = [];
  for (const scale of scales) {
    for (const ratio of ratios) {
      const w = scale * Math.sqrt(ratio);
      const h = scale / Math.sqrt(ratio);
      boxes.push({ x: center.x - w / 2, y: center.y - h / 2, w, h });
    }
  }
  return boxes;
}
