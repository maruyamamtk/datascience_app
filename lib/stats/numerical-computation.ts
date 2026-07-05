/**
 * 数値計算（A-4）の計算層（純関数・副作用なし・Vitest 対象）。
 *
 * 扱う道具:
 * - 浮動小数点の «計算機イプシロン»（丸め誤差の単位）
 * - 数値微分（前進差分 O(h)・中心差分 O(h²)）と刻み幅 h の誤差トレードオフ
 * - 二分法（根を挟み撃ちで狭める反復法）
 * - 数値積分（台形則・シンプソン則）
 *
 * 描画層（Lab/Stepper）と状態層（store）はこの純関数だけを呼ぶ。
 */

export type Fn = (x: number) => number;

/** IEEE 754 倍精度の計算機イプシロン 2⁻⁵² ≈ 2.22×10⁻¹⁶（1 と «次に表せる数» の差）。 */
export const MACHINE_EPS = 2 ** -52;

/** 前進差分による数値微分 (f(x+h)−f(x))/h。打ち切り誤差は O(h)。 */
export function forwardDiff(f: Fn, x: number, h: number): number {
  return (f(x + h) - f(x)) / h;
}

/** 中心差分による数値微分 (f(x+h)−f(x−h))/(2h)。打ち切り誤差は O(h²) でより高精度。 */
export function centralDiff(f: Fn, x: number, h: number): number {
  return (f(x + h) - f(x - h)) / (2 * h);
}

/** 絶対誤差 |approx − exact|。 */
export function absError(approx: number, exact: number): number {
  return Math.abs(approx - exact);
}

/** 相対誤差 |approx − exact| / |exact|（exact=0 のときは絶対誤差を返す）。 */
export function relError(approx: number, exact: number): number {
  if (exact === 0) return Math.abs(approx);
  return Math.abs(approx - exact) / Math.abs(exact);
}

/**
 * 中心差分の «打ち切り誤差» のモデル値 E_trunc(h) ≈ (h²/6)|f‴(x)|。
 * テイラー展開の 3 次項に由来し、h を小さくすると 2 乗で減る。
 */
export function truncationError(h: number, thirdDeriv: number): number {
  return (h * h / 6) * Math.abs(thirdDeriv);
}

/**
 * 中心差分の «丸め誤差» のモデル値 E_round(h) ≈ ε|f(x)|/(2h)。
 * 近い 2 値の引き算 f(x+h)−f(x−h) が桁落ちし、それを 2h（小さい数）で割るため
 * h を小さくすると逆に増える。
 */
export function roundingError(h: number, fValue: number, eps: number = MACHINE_EPS): number {
  return (eps * Math.abs(fValue)) / (2 * h);
}

/**
 * 打ち切り＋丸めの総誤差を最小化する刻み幅 h*。
 * d/dh[(h²/6)|f‴| + ε|f|/(2h)] = 0 を解いて h* = (3ε|f| / (2|f‴|))^{1/3} ≈ ε^{1/3}。
 */
export function optimalStep(fValue: number, thirdDeriv: number, eps: number = MACHINE_EPS): number {
  return Math.cbrt((3 * eps * Math.abs(fValue)) / (2 * Math.abs(thirdDeriv)));
}

/** 刻み幅 h の «どちらの誤差が支配的か» の判定。 */
export type Regime = "truncation" | "optimal" | "rounding";

/** h を最適刻み幅 h* と比べ、打ち切り優勢 / 最適近傍 / 丸め優勢 に分ける（境界は 1 桁）。 */
export function classifyRegime(h: number, hOpt: number): Regime {
  if (h > hOpt * 10) return "truncation";
  if (h < hOpt / 10) return "rounding";
  return "optimal";
}

/** 誤差カーブの 1 点（log₁₀h とそのときの実際の絶対誤差）。 */
export type ErrPoint = { logh: number; h: number; err: number };

/**
 * log₁₀h を expMin..expMax で n 等分し、中心差分の «実際の» 絶対誤差を測る。
 * 浮動小数点で本当に計算するので、h→0 で丸め誤差が増える U 字が現れる。
 */
export function diffErrorScan(
  f: Fn,
  x: number,
  exact: number,
  expMin: number,
  expMax: number,
  n: number,
): ErrPoint[] {
  const pts: ErrPoint[] = [];
  for (let i = 0; i < n; i++) {
    const logh = expMin + ((expMax - expMin) * i) / (n - 1);
    const h = 10 ** logh;
    pts.push({ logh, h, err: absError(centralDiff(f, x, h), exact) });
  }
  return pts;
}

/** 二分法の 1 反復が保持する区間 [a,b] と中点 mid、および端点・中点の符号情報。 */
export type Bracket = {
  a: number;
  b: number;
  mid: number;
  fa: number;
  fmid: number;
  /** 区間幅 b−a（＝根の位置の不確かさ）。 */
  width: number;
};

/**
 * 二分法：f(a)·f(b)<0（符号が反対）の区間を n 回半分に狭め、各反復の区間列を返す。
 * 返る配列の長さは iters+1（初期区間を含む）。中間値の定理により区間内に根がある。
 */
export function bisect1D(f: Fn, a0: number, b0: number, iters: number): Bracket[] {
  let a = a0;
  let b = b0;
  const snap = (): Bracket => {
    const mid = (a + b) / 2;
    return { a, b, mid, fa: f(a), fmid: f(mid), width: b - a };
  };
  const out: Bracket[] = [snap()];
  for (let i = 0; i < iters; i++) {
    const mid = (a + b) / 2;
    // 根がある側（符号が反対の側）を残す。
    if (f(a) * f(mid) <= 0) b = mid;
    else a = mid;
    out.push(snap());
  }
  return out;
}

/** 台形則で ∫_a^b f を n 区間で近似。誤差 O(h²)。 */
export function trapezoid(f: Fn, a: number, b: number, n: number): number {
  const h = (b - a) / n;
  let s = (f(a) + f(b)) / 2;
  for (let i = 1; i < n; i++) s += f(a + i * h);
  return s * h;
}

/** シンプソン則で ∫_a^b f を n 区間（n は偶数）で近似。誤差 O(h⁴) で台形則より高精度。 */
export function simpson(f: Fn, a: number, b: number, n: number): number {
  const m = n % 2 === 0 ? n : n + 1; // n は偶数に丸める。
  const h = (b - a) / m;
  let s = f(a) + f(b);
  for (let i = 1; i < m; i++) s += (i % 2 === 1 ? 4 : 2) * f(a + i * h);
  return (s * h) / 3;
}

/** [min,max] を n 点で等分（端点を含む）。 */
export function linspace(min: number, max: number, n: number): number[] {
  if (n <= 1) return [min];
  return Array.from({ length: n }, (_, i) => min + ((max - min) * i) / (n - 1));
}
