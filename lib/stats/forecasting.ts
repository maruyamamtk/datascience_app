/**
 * 時系列予測と評価（M-3）の計算層（純関数）。
 * ベースライン予測（素朴・平均・ドリフト）と指数平滑化、予測誤差の評価指標（MAE・RMSE・MAPE）、
 * 訓練/検証分割による «将来データでの» 評価を扱う。
 * 「過去から先を当て、当たり具合を数値で測る」ための土台。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。
 */

/** 単純指数平滑化（SES）の結果。 */
export type SmoothingResult = {
  /** 各時刻の平滑化水準 ℓ_t。 */
  level: number[];
  /** 各時刻の1期先予測 ŷ_t（=前時刻の水準 ℓ_{t-1}）。長さは series と同じ。 */
  oneStep: number[];
};

/**
 * 単純指数平滑化 ℓ_t = α·y_t + (1−α)·ℓ_{t-1}（0<α≤1）。ℓ_0=y_0 から出発。
 * 1期先予測 ŷ_{t+1}=ℓ_t。α が大きいほど «直近» を重視、小さいほど過去を長く引きずる。
 * 展開すると ℓ_t=α Σ_{j≥0}(1−α)^j y_{t-j}（過去の重みが幾何級数的に減衰）。
 */
export function exponentialSmoothing(series: readonly number[], alpha: number): SmoothingResult {
  const level: number[] = [];
  const oneStep: number[] = [];
  let prev = series.length > 0 ? series[0] : 0;
  for (let t = 0; t < series.length; t++) {
    // 予測は «その時点で使える» 前の水準。
    oneStep.push(prev);
    const l = t === 0 ? series[0] : alpha * series[t] + (1 - alpha) * prev;
    level.push(l);
    prev = l;
  }
  return { level, oneStep };
}

/** 指数平滑化で幾何級数的に減衰する «過去 lag 個への重み» α(1−α)^lag（可視化用）。 */
export function smoothingWeights(alpha: number, count: number): number[] {
  return Array.from({ length: count }, (_, j) => alpha * (1 - alpha) ** j);
}

/** 素朴予測（ナイーブ）：最後の値をそのまま h 期繰り返す。 */
export function forecastNaive(train: readonly number[], h: number): number[] {
  const last = train.length > 0 ? train[train.length - 1] : 0;
  return Array.from({ length: h }, () => last);
}

/** 平均予測：訓練期間の平均を h 期繰り返す。 */
export function forecastMean(train: readonly number[], h: number): number[] {
  const m = train.length > 0 ? train.reduce((a, b) => a + b, 0) / train.length : 0;
  return Array.from({ length: h }, () => m);
}

/**
 * ドリフト予測：最初と最後を結ぶ平均傾き分だけ外挿する。
 * slope=(y_n−y_1)/(n−1)、ŷ_{n+i}=y_n+slope·i。
 */
export function forecastDrift(train: readonly number[], h: number): number[] {
  const n = train.length;
  if (n < 2) return forecastNaive(train, h);
  const slope = (train[n - 1] - train[0]) / (n - 1);
  const last = train[n - 1];
  return Array.from({ length: h }, (_, i) => last + slope * (i + 1));
}

/** 単純指数平滑化の h 期予測：最終水準を平坦に伸ばす（SES は水平予測）。 */
export function forecastES(train: readonly number[], h: number, alpha: number): number[] {
  const { level } = exponentialSmoothing(train, alpha);
  const last = level.length > 0 ? level[level.length - 1] : 0;
  return Array.from({ length: h }, () => last);
}

/** 平均絶対誤差 MAE = mean|y−ŷ|。 */
export function mae(actual: readonly number[], pred: readonly number[]): number {
  const n = Math.min(actual.length, pred.length);
  if (n === 0) return 0;
  let s = 0;
  for (let i = 0; i < n; i++) s += Math.abs(actual[i] - pred[i]);
  return s / n;
}

/** 二乗平均平方根誤差 RMSE = √(mean(y−ŷ)²)。大きな外れを強く罰する。 */
export function rmse(actual: readonly number[], pred: readonly number[]): number {
  const n = Math.min(actual.length, pred.length);
  if (n === 0) return 0;
  let s = 0;
  for (let i = 0; i < n; i++) s += (actual[i] - pred[i]) ** 2;
  return Math.sqrt(s / n);
}

/** 平均絶対パーセント誤差 MAPE = mean|(y−ŷ)/y|·100（%）。y=0 を含む点は除外。 */
export function mape(actual: readonly number[], pred: readonly number[]): number {
  const n = Math.min(actual.length, pred.length);
  let s = 0;
  let cnt = 0;
  for (let i = 0; i < n; i++) {
    if (actual[i] === 0) continue;
    s += Math.abs((actual[i] - pred[i]) / actual[i]);
    cnt++;
  }
  return cnt > 0 ? (s / cnt) * 100 : 0;
}

/** 訓練/検証分割：先頭 trainRatio を訓練、残りを検証（時系列なので «時間順» に切る）。 */
export function trainTestSplit(
  series: readonly number[],
  trainRatio: number,
): { train: number[]; test: number[] } {
  const cut = Math.max(1, Math.min(series.length - 1, Math.round(series.length * trainRatio)));
  return { train: series.slice(0, cut), test: series.slice(cut) };
}
