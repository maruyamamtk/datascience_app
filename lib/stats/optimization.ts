/**
 * 最適化（勾配降下法・ニュートン法）の可視化のための純関数（最適化トピック A-3 の計算層）。
 * 「勾配降下＝坂を転がり落ちる」「学習率が大きすぎると振動・発散する」を体感させるため、
 * 1次元の勾配降下の軌跡・ステップ・ニュートン法・収束挙動の分類を扱う。
 * 高次元・大規模学習は目的外（MVP の可視化に十分な範囲）。副作用なし（Vitest 対象）。
 */

/** 1変数の実関数（目的関数 f、その導関数 f'、2階導関数 f'' に使う）。 */
export type Fn = (x: number) => number;

/** 平面上の点（曲線サンプル用）。 */
export type Pt = { x: number; y: number };

/**
 * 勾配降下の1ステップ x_{k+1} = x_k − η·f'(x_k)。
 * 勾配 f'(x_k)（最も急に増える向き）の逆に、学習率 η の歩幅で進む。
 */
export function gdStep(df: Fn, x: number, lr: number): number {
  return x - lr * df(x);
}

/**
 * 勾配降下の軌跡 [x0, x1, …, x_steps]（長さ steps+1）。
 * 各点は前の点から gdStep で1歩ずつ坂を下る。学習率 η が大きすぎると振動・発散する。
 */
export function gradientDescent1D(df: Fn, x0: number, lr: number, steps: number): number[] {
  const xs = [x0];
  let x = x0;
  for (let i = 0; i < steps; i++) {
    x = gdStep(df, x, lr);
    xs.push(x);
  }
  return xs;
}

/**
 * ニュートン法の1ステップ x_{k+1} = x_k − f'(x_k)/f''(x_k)。
 * 2階微分（曲がり）で歩幅を自動調整するため、凸2次関数なら1歩で最小点へ届く。
 */
export function newtonStep1D(df: Fn, ddf: Fn, x: number): number {
  return x - df(x) / ddf(x);
}

/** ニュートン法の軌跡 [x0, x1, …, x_steps]（長さ steps+1）。 */
export function newton1D(df: Fn, ddf: Fn, x0: number, steps: number): number[] {
  const xs = [x0];
  let x = x0;
  for (let i = 0; i < steps; i++) {
    x = newtonStep1D(df, ddf, x);
    xs.push(x);
  }
  return xs;
}

/** 勾配降下の収束挙動。 */
export type Behavior = "converged" | "oscillating" | "diverged";

/** target からの距離 |x − target|。 */
function dist(x: number, target: number): number {
  return Math.abs(x - target);
}

/**
 * 軌跡が発散しているか（誤差が縮まず、最後が最初より target から遠い／非有限）。
 */
export function isDiverging(xs: number[], target: number): boolean {
  const last = xs[xs.length - 1];
  if (!Number.isFinite(last)) return true;
  return dist(last, target) > dist(xs[0], target) + 1e-9;
}

/**
 * 軌跡が振動しているか（target をはさんで符号が交互に入れ替わる）。
 * 直近のステップで (x_k − target) の符号が反転していれば true。
 */
export function isOscillating(xs: number[], target: number): boolean {
  let flips = 0;
  for (let i = 1; i < xs.length; i++) {
    const a = xs[i - 1] - target;
    const b = xs[i] - target;
    if (a * b < 0) flips++;
  }
  // 半分以上のステップで符号反転していれば «振動» とみなす。
  return flips >= (xs.length - 1) / 2 && flips > 0;
}

/**
 * 軌跡の収束挙動を分類する。
 * 発散（誤差が縮まらない）→ 振動しながら収束 → なめらかに収束 の順に判定。
 */
export function classifyTrajectory(xs: number[], target: number): Behavior {
  if (isDiverging(xs, target)) return "diverged";
  if (isOscillating(xs, target)) return "oscillating";
  return "converged";
}

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
