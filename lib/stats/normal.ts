/**
 * 正規分布まわりの計算層（純関数）。
 * CLT の収束先 N(μ, σ²/n) をヒストグラムに重ねるほか、正規分布トピックの操作ラボ
 * （μ/σ → 密度曲線・±kσ の確率）でも使う。すべて副作用なし（Vitest 対象）。
 */

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
