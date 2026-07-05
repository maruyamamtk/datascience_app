/**
 * 微分積分の可視化のための純関数（微分積分トピック A-2 の計算層）。
 * 「微分＝接線の傾き（瞬間の変化率）」「積分＝面積（リーマン和の極限）」を体感させるため、
 * 数値微分（割線→接線）・接線の式・リーマン和/台形則を扱う。
 * 高精度・大規模は目的外（MVP の可視化に十分な範囲）。副作用なし（Vitest 対象）。
 */

/** 平面上の点（曲線サンプル用）。 */
export type Pt = { x: number; y: number };

/** 1変数の実関数。 */
export type Fn = (x: number) => number;

/** 区間 [a, b] を n 等分した端点込みの数列（n≥2 で長さ n）。 */
export function linspace(a: number, b: number, n: number): number[] {
  if (n < 2) return [a];
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(a + ((b - a) * i) / (n - 1));
  return out;
}

/** 関数を [a, b] 上で n 点サンプルした曲線（折れ線描画用）。 */
export function sampleCurve(f: Fn, a: number, b: number, n: number): Pt[] {
  return linspace(a, b, n).map((x) => ({ x, y: f(x) }));
}

/**
 * 割線（2点 (x, f(x)) と (x+h, f(x+h)) を結ぶ直線）の傾き＝平均変化率。
 * h→0 の極限が微分係数 f'(x)。
 */
export function secantSlope(f: Fn, x: number, h: number): number {
  return (f(x + h) - f(x)) / h;
}

/**
 * 数値微分（中心差分）f'(x) ≈ (f(x+h) − f(x−h)) / (2h)。
 * 前方差分より誤差が小さい（O(h²)）。既定 h は可視化に十分な精度。
 */
export function numDerivative(f: Fn, x: number, h = 1e-5): number {
  return (f(x + h) - f(x - h)) / (2 * h);
}

/** 接線 y = m(x − x0) + f(x0) を y = m·x + b 形式で返す（m＝f'(x0)）。 */
export function tangentAt(f: Fn, x0: number, h = 1e-5): { slope: number; intercept: number } {
  const slope = numDerivative(f, x0, h);
  return { slope, intercept: f(x0) - slope * x0 };
}

/** リーマン和の刻み位置（左端/中点/右端）。 */
export type RiemannMode = "left" | "mid" | "right";

/** 1本の短冊（矩形）。x0..x1 が底辺、height＝高さ f(標本点)、area＝符号付き面積。 */
export type Rect = { x0: number; x1: number; sample: number; height: number; area: number };

/** 標本点の位置（左端 0 / 中点 0.5 / 右端 1）。 */
function sampleOffset(mode: RiemannMode): number {
  return mode === "left" ? 0 : mode === "right" ? 1 : 0.5;
}

/**
 * リーマン和の短冊列。区間 [a, b] を n 等分し、各小区間で高さ f(標本点) の矩形を作る。
 * 矩形の面積の総和が積分の近似（n→∞ で定積分に収束）。
 */
export function riemannRects(f: Fn, a: number, b: number, n: number, mode: RiemannMode = "mid"): Rect[] {
  const dx = (b - a) / n;
  const off = sampleOffset(mode);
  const rects: Rect[] = [];
  for (let i = 0; i < n; i++) {
    const x0 = a + i * dx;
    const x1 = x0 + dx;
    const sample = x0 + off * dx;
    const height = f(sample);
    rects.push({ x0, x1, sample, height, area: height * dx });
  }
  return rects;
}

/** リーマン和 = 短冊の面積の総和（積分の近似値）。 */
export function riemannSum(f: Fn, a: number, b: number, n: number, mode: RiemannMode = "mid"): number {
  return riemannRects(f, a, b, n, mode).reduce((s, r) => s + r.area, 0);
}

/**
 * 台形則による定積分の近似。各小区間を台形で近似する（両端の平均高さ×幅）。
 * 1次関数なら厳密、一般に中点則と同オーダー（O(h²)）。
 */
export function trapezoidSum(f: Fn, a: number, b: number, n: number): number {
  const dx = (b - a) / n;
  let s = (f(a) + f(b)) / 2;
  for (let i = 1; i < n; i++) s += f(a + i * dx);
  return s * dx;
}
