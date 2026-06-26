/**
 * 正規分布まわりの計算層（純関数）。
 * CLT の収束先 N(μ, σ²/n) をヒストグラムに重ねるほか、正規分布トピックの操作ラボ
 * （μ/σ → 密度曲線・±kσ の確率）でも使う。すべて副作用なし（Vitest 対象）。
 */

import type { Rng } from "./random";

/** 操作値: 平均 μ と標準偏差 σ。 */
export type NormalControls = { mu: number; sigma: number };

/** 派生値: 分散 σ² と ±1σ/±2σ/±3σ に入る確率（68-95-99.7 則の数値根拠）。 */
export type NormalDerived = {
  variance: number;
  /** μ±1σ に入る確率（≈0.6827）。 */
  p1: number;
  /** μ±2σ に入る確率（≈0.9545）。 */
  p2: number;
  /** μ±3σ に入る確率（≈0.9973）。 */
  p3: number;
};

/** 描画用の曲線上の点。 */
export type CurvePoint = { x: number; y: number };

/** 正規分布 N(mu, sigma²) の確率密度 f(x)。sigma<=0 なら 0 を返す。 */
export function normalPdf(x: number, mu: number, sigma: number): number {
  if (sigma <= 0) return 0;
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}

/**
 * 標準正規分布 N(0,1) の累積分布関数 Φ(z)。
 * Zelen & Severo の有理近似（Abramowitz & Stegun 26.2.17, 誤差 < 7.5e-8）。
 * 解析的に閉じないため多項式近似で評価する。
 */
export function standardNormalCdf(z: number): number {
  if (z === 0) return 0.5;
  // 対称性 Φ(-z)=1-Φ(z) を使い、z>=0 側だけ評価する。
  const sign = z < 0 ? -1 : 1;
  const az = Math.abs(z);
  const t = 1 / (1 + 0.2316419 * az);
  const phi = Math.exp(-0.5 * az * az) / Math.sqrt(2 * Math.PI);
  const poly =
    t *
    (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const upperTail = phi * poly; // ≈ 1 - Φ(az)
  const cdfPos = 1 - upperTail; // Φ(az)
  return sign > 0 ? cdfPos : 1 - cdfPos;
}

/** 正規分布 N(mu, sigma²) の累積分布関数 F(x)=Φ((x-μ)/σ)。sigma<=0 はステップ関数として扱う。 */
export function normalCdf(x: number, mu: number, sigma: number): number {
  if (sigma <= 0) return x < mu ? 0 : 1;
  return standardNormalCdf((x - mu) / sigma);
}

/**
 * μ±kσ の区間に入る確率（=2Φ(k)-1）。スケール不変なので k だけで決まる。
 * k=1,2,3 でそれぞれ 0.6827 / 0.9545 / 0.9973（68-95-99.7 則）。
 */
export function areaWithin(k: number): number {
  if (k <= 0) return 0;
  return 2 * standardNormalCdf(k) - 1;
}

/** 観測値 x を標準化した z 値 z=(x-μ)/σ。sigma<=0 なら NaN。 */
export function standardize(x: number, mu: number, sigma: number): number {
  if (sigma <= 0) return NaN;
  return (x - mu) / sigma;
}

/**
 * 標準正規分布の分位点（逆累積分布関数）Φ⁻¹(p)。
 * Peter Acklam の有理近似（相対誤差 < 1.15e-9）。standardNormalCdf の逆で、
 * 信頼区間の臨界値 z（例 p=0.975 → 1.95996）を出すのに使う（A&S 26.2.23 系の逆近似）。
 * p<=0 は -∞、p>=1 は +∞ を返す（区間推定では level∈(0,1) なので実用上は通らない）。
 */
export function zQuantile(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;

  // Acklam の係数（中央領域 a/b、裾領域 c/d）。
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2,
    -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734,
    4.374664141464968, 2.938163982698783,
  ];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];

  // 裾と中央で別の近似式を使い分ける（精度確保のため）。
  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(
    (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  );
}

/**
 * 正規母集団 N(mu, sigma²) から 1 観測を引く（Box–Muller 法）。
 * 区間推定の被覆シミュレーション（母集団から繰り返し標本抽出）で使う純関数。
 * 乱数の状態は呼び出し側が渡す Rng に閉じる（同じシードなら再現可能）。
 */
export function normalSample(mu: number, sigma: number, rng: Rng): number {
  // u1∈(0,1] で log の発散を避ける。u1, u2 の 2 つの一様乱数から標準正規 z を 1 つ作る。
  const u1 = 1 - rng();
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mu + sigma * z;
}

/**
 * 操作値（μ, σ）から派生値（分散・±kσ 確率）を計算する。
 * topicStore の derive に渡し、Graph/Math/数値が同じ派生値を購読する（強連動の single source of truth）。
 */
export function deriveNormal({ mu, sigma }: NormalControls): NormalDerived {
  // μ は派生値計算に効かないが、controls の一部として受け取る（型整合・将来の拡張余地）。
  void mu;
  const s = sigma > 0 ? sigma : 0;
  return {
    variance: s * s,
    p1: areaWithin(1),
    p2: areaWithin(2),
    p3: areaWithin(3),
  };
}

/** normalCurve のオプション。既定は μ±4σ を points 点で刻む。 */
export type NormalCurveOptions = {
  /** 軸下端（既定 μ-4σ）。 */
  min?: number;
  /** 軸上端（既定 μ+4σ）。 */
  max?: number;
  /** 端点を含む分割点数（既定 121）。 */
  points?: number;
};

/**
 * 密度曲線を描くための {x, y=f(x)} グリッドを返す（SVG パス生成に使う）。
 * 純関数。points<2 や sigma<=0 のときは空配列を返す（描画側でフォールバック）。
 */
export function normalCurve(
  mu: number,
  sigma: number,
  opts: NormalCurveOptions = {},
): CurvePoint[] {
  if (sigma <= 0) return [];
  const points = opts.points ?? 121;
  if (points < 2) return [];
  const min = opts.min ?? mu - 4 * sigma;
  const max = opts.max ?? mu + 4 * sigma;
  const span = max - min;
  const out: CurvePoint[] = [];
  for (let i = 0; i < points; i++) {
    const x = min + (span * i) / (points - 1);
    out.push({ x, y: normalPdf(x, mu, sigma) });
  }
  return out;
}
