/**
 * 一般の分布に関する検定（E-4）トピックの計算層（純関数）。
 * カイ二乗適合度検定（観測度数と期待度数のずれ）と、その p 値（カイ二乗 CDF）を扱う。
 * 「観測されたカテゴリ別度数は、想定した分布と整合するか」を判断する土台。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。カイ二乗密度は sampling-distributions を再利用。
 */

import { standardNormalCdf } from "./normal";
import { chiSquarePdf } from "./sampling-distributions";

/** カテゴリごとの (O−E)²/E 寄与。 */
export type CellContribution = {
  /** 観測度数。 */
  observed: number;
  /** 期待度数。 */
  expected: number;
  /** このセルの寄与 (O−E)²/E。 */
  contribution: number;
};

/**
 * カイ二乗適合度検定の統計量 χ²=Σ(Oᵢ−Eᵢ)²/Eᵢ。
 * dfDeduction は «推定したパラメータ数»（既知分布なら 0、分布をデータから推定したなら推定数）。
 * 自由度 = カテゴリ数 − 1 − dfDeduction。期待度数 0 のセルは寄与 0 扱い（縮約は呼び出し側）。
 */
export function chiSquareGof(
  observed: readonly number[],
  expected: readonly number[],
  dfDeduction = 0,
): { chi2: number; df: number; cells: CellContribution[] } {
  const cells: CellContribution[] = observed.map((o, i) => {
    const e = expected[i] ?? 0;
    const contribution = e > 0 ? (o - e) ** 2 / e : 0;
    return { observed: o, expected: e, contribution };
  });
  const chi2 = cells.reduce((acc, c) => acc + c.contribution, 0);
  const df = Math.max(1, observed.length - 1 - dfDeduction);
  return { chi2, df, cells };
}

/**
 * カイ二乗分布（自由度 df）の累積分布関数 F(x)=P(χ²≤x)。chiSquarePdf をシンプソン則で 0..x 積分。
 * x≤0 は 0。
 */
export function chiSquareCdf(x: number, df: number): number {
  if (x <= 0) return 0;
  // df=1 は χ²₁=Z² より閉形式 P(χ²≤x)=2Φ(√x)−1（数値積分は x=0 の特異点で精度が落ちるため）。
  if (df === 1) return 2 * standardNormalCdf(Math.sqrt(x)) - 1;
  const n = 600;
  const h = x / n;
  // df<2（k=df/2<1）では密度が x=0 で発散する。可積分なので、端点の非有限値は 0 とみなし
  // 内側の点で積分する（端点1点の寄与は無視できる）。
  const pdf = (t: number) => {
    const v = chiSquarePdf(t, df);
    return Number.isFinite(v) ? v : 0;
  };
  let s = pdf(0) + pdf(x);
  for (let i = 1; i < n; i++) {
    s += (i % 2 === 1 ? 4 : 2) * pdf(i * h);
  }
  return Math.min(1, (h / 3) * s);
}

/** 適合度検定の p 値 p=P(χ²≥観測)=1−F(観測)（右片側）。 */
export function chiSquareGofPValue(chi2: number, df: number): number {
  return 1 - chiSquareCdf(chi2, df);
}

/** 期待度数を «総数×想定確率» で作る（確率は合計1を想定）。 */
export function expectedFromProbabilities(total: number, probs: readonly number[]): number[] {
  return probs.map((p) => total * p);
}

/** 一様（等確率）期待度数: 総数 / カテゴリ数 を k 個。 */
export function uniformExpected(total: number, k: number): number[] {
  return new Array(k).fill(total / k);
}

export { chiSquarePdf };
