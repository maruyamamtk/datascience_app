/**
 * NNモデル（CNN・RNN）（Q-2）トピックの計算層（純関数）。
 * [ニューラルネットワークの仕組み](neural-network-basics)で見た「重み付き和→活性化関数」という
 * 全結合層の計算を、データの構造に応じて2通りに特殊化する:
 * - CNN: 画像の近傍だけを見る畳み込み層（フィルタのスライド）とプーリング層（縮約）。
 * - RNN/LSTM: 時系列を1ステップずつ処理し、隠れ状態を«記憶»として持ち越す再帰計算。
 *   LSTM はゲート機構で[勾配消失](vanishing-gradient)を緩和する（加法的なセル状態の経路）。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。
 */

import { sigmoid } from "./logistic";

// ---------------------------------------------------------------------------
// CNN: 畳み込み層（フィルタ・ストライド・パディング）
// ---------------------------------------------------------------------------

export type Matrix = number[][];

/**
 * 畳み込み・プーリングの出力サイズ公式: floor((n + 2p − f) / s) + 1。
 * 「パディング後の長さ n+2p の中に、幅 f の窓が何個ぴったり収まるか」を s おきに数えた個数
 * （高校数学の橋渡し: 窓の左端が置ける位置は 0, s, 2s, … のうち n+2p−f 以下のものだけ、その個数）。
 */
export function convOutputSize(inputSize: number, filterSize: number, stride: number, padding: number): number {
  return Math.floor((inputSize + 2 * padding - filterSize) / stride) + 1;
}

/** 入力行列の周囲をゼロで padding 幅だけ埋める（padding=0 ならコピーを返す）。 */
export function padMatrix(input: Matrix, padding: number): Matrix {
  if (padding <= 0) return input.map((row) => [...row]);
  const cols = input[0]?.length ?? 0;
  const paddedCols = cols + 2 * padding;
  const zerosRow = () => Array(paddedCols).fill(0);
  const out: Matrix = [];
  for (let i = 0; i < padding; i++) out.push(zerosRow());
  for (const row of input) out.push([...Array(padding).fill(0), ...row, ...Array(padding).fill(0)]);
  for (let i = 0; i < padding; i++) out.push(zerosRow());
  return out;
}

/**
 * 1つの窓位置での畳み込み（フィルタとの要素積の総和＋バイアス）。
 * (top, left) は padding 後の入力上での窓の左上座標。
 */
export function convWindowSum(input: Matrix, filter: Matrix, top: number, left: number, bias = 0): number {
  let sum = bias;
  for (let a = 0; a < filter.length; a++) {
    for (let b = 0; b < filter[0].length; b++) {
      sum += filter[a][b] * input[top + a][left + b];
    }
  }
  return sum;
}

export type ConvOptions = { stride: number; padding: number; bias?: number };

/** 畳み込み層の出力全体（フィルタを入力全体にスライドさせる）。 */
export function conv2d(input: Matrix, filter: Matrix, options: ConvOptions): Matrix {
  const { stride, padding, bias = 0 } = options;
  const padded = padMatrix(input, padding);
  const outRows = convOutputSize(input.length, filter.length, stride, padding);
  const outCols = convOutputSize(input[0].length, filter[0].length, stride, padding);
  const out: Matrix = [];
  for (let i = 0; i < outRows; i++) {
    const row: number[] = [];
    for (let j = 0; j < outCols; j++) {
      row.push(convWindowSum(padded, filter, i * stride, j * stride, bias));
    }
    out.push(row);
  }
  return out;
}

/** 出力座標 (outRows × outCols) を走査順（行優先）で列挙する（ステッパーのフレーム順に使う）。 */
export function windowPositions(outRows: number, outCols: number): { row: number; col: number }[] {
  const out: { row: number; col: number }[] = [];
  for (let i = 0; i < outRows; i++) {
    for (let j = 0; j < outCols; j++) out.push({ row: i, col: j });
  }
  return out;
}

// ---------------------------------------------------------------------------
// CNN: プーリング層（Max / Average）
// ---------------------------------------------------------------------------

export type PoolMode = "max" | "avg";

/** プーリング層（padding なし。畳み込みと同じ出力サイズ公式で p=0 として求まる）。 */
export function pool2d(input: Matrix, poolSize: number, stride: number, mode: PoolMode): Matrix {
  const outRows = convOutputSize(input.length, poolSize, stride, 0);
  const outCols = convOutputSize(input[0]?.length ?? 0, poolSize, stride, 0);
  const out: Matrix = [];
  for (let i = 0; i < outRows; i++) {
    const row: number[] = [];
    for (let j = 0; j < outCols; j++) {
      const top = i * stride;
      const left = j * stride;
      const values: number[] = [];
      for (let a = 0; a < poolSize; a++) {
        for (let b = 0; b < poolSize; b++) values.push(input[top + a][left + b]);
      }
      row.push(mode === "max" ? Math.max(...values) : values.reduce((s, v) => s + v, 0) / values.length);
    }
    out.push(row);
  }
  return out;
}

// ---------------------------------------------------------------------------
// RNN: 再帰計算（隠れ状態の時間展開）
// ---------------------------------------------------------------------------

/** tanh の微分 tanh'(z) = 1 − tanh(z)²（RNN の活性化に tanh を使うため）。 */
export function tanhDerivative(z: number): number {
  const t = Math.tanh(z);
  return 1 - t * t;
}

/** シンプルな RNN セル（入力・隠れ状態ともスカラー）のパラメータ。 */
export type RnnParams = {
  wxh: number;
  whh: number;
  bh: number;
  why: number;
  by: number;
};

export type RnnStepResult = { z: number; h: number };

/** RNN の1ステップ: h_t=tanh(w_xh·x_t + w_hh·h_{t-1} + b_h)。 */
export function rnnStep(x: number, hPrev: number, params: RnnParams): RnnStepResult {
  const z = params.wxh * x + params.whh * hPrev + params.bh;
  const h = Math.tanh(z);
  return { z, h };
}

/** 系列 xs を先頭から順に処理し、各ステップの (z, h) を返す（時間方向の展開）。 */
export function rnnUnroll(xs: readonly number[], h0: number, params: RnnParams): RnnStepResult[] {
  const out: RnnStepResult[] = [];
  let hPrev = h0;
  for (const x of xs) {
    const step = rnnStep(x, hPrev, params);
    out.push(step);
    hPrev = step.h;
  }
  return out;
}

/** 隠れ状態から出力へ（線形）: y=w_hy·h + b_y。 */
export function rnnOutput(h: number, params: RnnParams): number {
  return params.why * h + params.by;
}

/**
 * RNN の時間方向 BPTT 勾配プロファイル: ∂h_t/∂h_0 ≈ Π_{k=1}^{t} (w_hh・tanh'(z_k))。
 * [ニューラルネットワークの仕組み]の cumulativeGradientProfile（層方向）と同じ構造を、
 * 「層」ではなく「時間ステップ」を貫通する掛け算として time 方向に適用したもの。
 * |w_hh・tanh'| < 1 が続くと積は急速に 0 へ縮む（RNN 版の勾配消失）。
 */
export function rnnGradientProfile(steps: readonly RnnStepResult[], whh: number): number[] {
  const out: number[] = [1];
  for (const s of steps) {
    out.push(out[out.length - 1] * whh * tanhDerivative(s.z));
  }
  return out;
}

// ---------------------------------------------------------------------------
// LSTM: ゲート機構（忘却・入力・出力ゲートとセル状態）
// ---------------------------------------------------------------------------

/** LSTM セル（入力・隠れ状態・セル状態ともスカラー）のパラメータ。ゲートごとに独立した重みを持つ。 */
export type LstmParams = {
  wf: number;
  uf: number;
  bf: number;
  wi: number;
  ui: number;
  bi: number;
  wg: number;
  ug: number;
  bg: number;
  wo: number;
  uo: number;
  bo: number;
};

export type LstmStepResult = {
  /** 忘却ゲート（前のセル状態をどれだけ残すか、0=全部忘れる〜1=全部残す）。 */
  f: number;
  /** 入力ゲート（新しい候補値をどれだけ取り込むか）。 */
  i: number;
  /** 候補値（新しく書き込む«内容»、tanh で −1〜1）。 */
  g: number;
  /** 出力ゲート（セル状態をどれだけ隠れ状態へ出すか）。 */
  o: number;
  /** セル状態（忘却ゲートと入力ゲートで更新される«長期記憶»）。 */
  c: number;
  /** 隠れ状態（出力ゲートでセル状態を絞った«短期出力»）。 */
  h: number;
};

/**
 * LSTM の1ステップ。3つのゲート（forget/input/output）とセル状態の更新式:
 * f_t=σ(w_f x_t+u_f h_{t-1}+b_f)、i_t=σ(w_i x_t+u_i h_{t-1}+b_i)、g_t=tanh(w_g x_t+u_g h_{t-1}+b_g)、
 * c_t=f_t·c_{t-1}+i_t·g_t（加法的更新——ここが RNN との核心的な違い）、
 * o_t=σ(w_o x_t+u_o h_{t-1}+b_o)、h_t=o_t·tanh(c_t)。
 */
export function lstmStep(x: number, hPrev: number, cPrev: number, params: LstmParams): LstmStepResult {
  const f = sigmoid(params.wf * x + params.uf * hPrev + params.bf);
  const i = sigmoid(params.wi * x + params.ui * hPrev + params.bi);
  const g = Math.tanh(params.wg * x + params.ug * hPrev + params.bg);
  const o = sigmoid(params.wo * x + params.uo * hPrev + params.bo);
  const c = f * cPrev + i * g;
  const h = o * Math.tanh(c);
  return { f, i, g, o, c, h };
}

/** 系列 xs を先頭から順に処理し、各ステップの LSTM 内部状態を返す。 */
export function lstmUnroll(xs: readonly number[], h0: number, c0: number, params: LstmParams): LstmStepResult[] {
  const out: LstmStepResult[] = [];
  let hPrev = h0;
  let cPrev = c0;
  for (const x of xs) {
    const step = lstmStep(x, hPrev, cPrev, params);
    out.push(step);
    hPrev = step.h;
    cPrev = step.c;
  }
  return out;
}

/**
 * セル状態を通る勾配プロファイル: ∂c_t/∂c_0 ≈ Π_{k=1}^{t} f_k（忘却ゲートの積のみ）。
 * c_t=f_t·c_{t-1}+i_t·g_t を c_{t-1} で偏微分すると ∂c_t/∂c_{t-1}=f_t（i_t·g_t の項は c_{t-1} を
 * 含まないので消える）——RNN の ∂h_t/∂h_{t-1}=w_hh·tanh'(z_t) のような «重み×活性化関数の微分» の
 * 掛け算ではなく、忘却ゲート f_t（学習で 1 に近づけられる）だけの掛け算になる。
 * f_t を 1 に近く保てば、この積は時間ステップを経ても縮みにくい——これが LSTM が勾配消失を
 * 緩和する数学的な理由（«定数エラーカルーセル» の簡略化モデル）。
 */
export function lstmCellGradientProfile(steps: readonly LstmStepResult[]): number[] {
  const out: number[] = [1];
  for (const s of steps) out.push(out[out.length - 1] * s.f);
  return out;
}
