/**
 * 分割表の解析（N-5）の計算層（純関数）。
 * 二元分割表（クロス集計）の独立性の検定：独立を仮定した期待度数 E_ij=行和·列和/総和、
 * カイ二乗統計量 Σ(O−E)²/E、自由度 (r−1)(c−1)、標準化残差、連関の強さ（Cramér's V・2×2のオッズ比）を扱う。
 * 「2つのカテゴリ変数が関係するか」を期待度数とのズレで測る土台。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。p 値は goodness-of-fit の χ² CDF を再利用。
 */

import { chiSquareCdf } from "./goodness-of-fit";

/** 分割表（行×列の度数行列）。 */
export type Table = number[][];

/** 各行の合計。 */
export function rowSums(table: Table): number[] {
  return table.map((row) => row.reduce((a, b) => a + b, 0));
}

/** 各列の合計。 */
export function colSums(table: Table): number[] {
  const cols = table[0]?.length ?? 0;
  return Array.from({ length: cols }, (_, j) => table.reduce((a, row) => a + row[j], 0));
}

/** 総度数 N。 */
export function grandTotal(table: Table): number {
  return rowSums(table).reduce((a, b) => a + b, 0);
}

/**
 * 独立を仮定した期待度数 E_ij = (行和_i · 列和_j) / N。
 * «行の割合と列の割合が独立に決まるなら» という帰無仮説のもとで期待される度数。
 */
export function expectedTable(table: Table): Table {
  const rs = rowSums(table);
  const cs = colSums(table);
  const n = grandTotal(table);
  if (n === 0) return table.map((row) => row.map(() => 0));
  return rs.map((ri) => cs.map((cj) => (ri * cj) / n));
}

/** 各セルのカイ二乗寄与 (O−E)²/E（E=0 のセルは寄与0）。 */
export function chiSquareContributions(table: Table): Table {
  const e = expectedTable(table);
  return table.map((row, i) =>
    row.map((o, j) => (e[i][j] > 0 ? (o - e[i][j]) ** 2 / e[i][j] : 0)),
  );
}

/**
 * 標準化残差 (O−E)/√E。どのセルが独立からのズレを «どちら向きに» 大きく作っているかを示す。
 * 目安として |残差|>2 のセルが独立からの主なズレ。
 */
export function standardizedResiduals(table: Table): Table {
  const e = expectedTable(table);
  return table.map((row, i) =>
    row.map((o, j) => (e[i][j] > 0 ? (o - e[i][j]) / Math.sqrt(e[i][j]) : 0)),
  );
}

/** カイ二乗統計量 Σ(O−E)²/E。 */
export function chiSquareStatistic(table: Table): number {
  return chiSquareContributions(table).reduce(
    (sum, row) => sum + row.reduce((a, b) => a + b, 0),
    0,
  );
}

/** 独立性の検定の自由度 (r−1)(c−1)。 */
export function degreesOfFreedom(table: Table): number {
  const r = table.length;
  const c = table[0]?.length ?? 0;
  return Math.max(1, (r - 1) * (c - 1));
}

/** 独立性の検定の p 値（上側確率 1−F(χ²)）。 */
export function independencePValue(table: Table): number {
  return 1 - chiSquareCdf(chiSquareStatistic(table), degreesOfFreedom(table));
}

/**
 * Cramér's V＝連関の強さ（0〜1）。V=√(χ²/(N·min(r−1,c−1)))。
 * χ² は標本サイズに比例して大きくなるので、N と表の大きさで正規化して «効果量» にする。
 */
export function cramersV(table: Table): number {
  const n = grandTotal(table);
  const r = table.length;
  const c = table[0]?.length ?? 0;
  const k = Math.min(r - 1, c - 1);
  if (n === 0 || k === 0) return 0;
  return Math.sqrt(chiSquareStatistic(table) / (n * k));
}

/**
 * 2×2 表のオッズ比 (a·d)/(b·c)。行間で «オッズが何倍» かを表す連関の指標。
 * 表は [[a,b],[c,d]]。0 割れは 0 除数に小さな連続補正を入れず、Infinity/0 をそのまま返す。
 */
export function oddsRatio2x2(table: Table): number {
  const a = table[0][0];
  const b = table[0][1];
  const c = table[1][0];
  const d = table[1][1];
  return (a * d) / (b * c);
}
