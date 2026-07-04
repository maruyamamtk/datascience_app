/**
 * 質的データ解析（N-6）の計算層（純関数）。
 * 数量化I類：質的な説明変数（カテゴリ）から量的な目的変数を予測する。各カテゴリに «カテゴリ数量»
 * （スコア）を与え、その和＋定数で予測する——実質はダミー変数による重回帰。
 * 予測は ŷ = 定数 + Σ_item スコア[item][そのカテゴリ]。各アイテムのスコアは平均0に中心化して «偏差» として提示。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。線形代数は multiple-regression.ts の
 * olsFit（ダミー計画行列）を再利用する。乱数は呼び出し側の Rng に閉じる。
 */

import { olsFit } from "./multiple-regression";
import type { Rng } from "./random";

/** ボックス–ミュラー法で標準正規。 */
function gauss(rng: Rng): number {
  const u1 = Math.max(1e-12, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** 質的アイテム（説明変数）：名前とカテゴリ一覧。 */
export type QuantItem = { name: string; categories: string[] };

/** 1観測：各アイテムのカテゴリ index と目的変数 y。 */
export type QuantRow = { cats: number[]; y: number };

/**
 * 数量化I類のデータ生成。
 * 真のカテゴリ数量 trueScores[item][cat]（平均0を想定）と定数 constant から
 * y = constant + Σ trueScores[item][cat] + 雑音。各観測のカテゴリは一様に選ぶ。
 */
export function generateQuantData(params: {
  items: QuantItem[];
  trueScores: number[][];
  constant: number;
  noise: number;
  n: number;
  rng: Rng;
}): QuantRow[] {
  const { items, trueScores, constant, noise, n, rng } = params;
  const rows: QuantRow[] = [];
  for (let i = 0; i < n; i++) {
    const cats = items.map((it) => Math.floor(rng() * it.categories.length));
    let y = constant;
    cats.forEach((c, item) => {
      y += trueScores[item][c];
    });
    y += noise * gauss(rng);
    rows.push({ cats, y });
  }
  return rows;
}

/** 数量化I類のフィット結果。 */
export type Quant1Fit = {
  /** 全体の定数（グランド平均に相当）。 */
  constant: number;
  /** 中心化したカテゴリ数量 scores[item][cat]（各アイテムで平均0）。 */
  scores: number[][];
  /** 決定係数 R²（＝相関比の2乗の多変量版, 予測力）。 */
  rSquared: number;
  /** 各アイテムのレンジ（max−min スコア＝そのアイテムの «効き» の目安）。 */
  ranges: number[];
};

/**
 * ダミー変数計画行列を作る（各アイテムの先頭カテゴリを基準として落とす）。
 * 列 = 切片 + Σ_item (カテゴリ数−1)。olsFit がそのまま解ける形。
 */
function dummyDesign(rows: readonly QuantRow[], items: readonly QuantItem[]): number[][] {
  return rows.map((row) => {
    const feat: number[] = [1];
    items.forEach((it, item) => {
      for (let c = 1; c < it.categories.length; c++) {
        feat.push(row.cats[item] === c ? 1 : 0);
      }
    });
    return feat;
  });
}

/**
 * 数量化I類を当てはめる。
 * ダミー回帰の係数（基準カテゴリ=0、他=係数）を求め、各アイテムで平均0へ中心化し、
 * 差し引いた平均は定数へ畳み込む。予測は predict(cats) を使う。
 */
export function fitQuantification1(
  rows: readonly QuantRow[],
  items: readonly QuantItem[],
): Quant1Fit {
  const X = dummyDesign(rows, items);
  const y = rows.map((r) => r.y);
  const fit = olsFit(X, y);
  const beta = fit.coefficients; // [切片, 各ダミー...]

  // 係数をアイテム別の raw スコアに展開（基準カテゴリ=0）。
  let idx = 1;
  const raw: number[][] = items.map((it) => {
    const s = [0];
    for (let c = 1; c < it.categories.length; c++) {
      s.push(beta[idx]);
      idx++;
    }
    return s;
  });

  // 各アイテムで平均0へ中心化し、除いた平均を定数へ。
  let constant = beta[0];
  const scores = raw.map((s) => {
    const m = s.reduce((a, b) => a + b, 0) / s.length;
    constant += m;
    return s.map((v) => v - m);
  });

  const ranges = scores.map((s) => Math.max(...s) - Math.min(...s));
  return { constant, scores, rSquared: fit.rSquared, ranges };
}

/** カテゴリ組合せに対する予測 ŷ = 定数 + Σ スコア[item][cat]。 */
export function predictQuant1(fit: Quant1Fit, cats: readonly number[]): number {
  return cats.reduce((acc, c, item) => acc + fit.scores[item][c], fit.constant);
}

/**
 * 相関比 η²（1つの質的変数 → 量的変数の «説明力»）。
 * η² = 群間平方和 / 全平方和。カテゴリ間で群平均がどれだけ散らばるかの割合（0〜1）。
 * 数量化I類が1アイテムのときの R² に一致する。
 */
export function correlationRatio(values: readonly number[], groups: readonly number[]): number {
  const grand = values.reduce((a, b) => a + b, 0) / values.length;
  const total = values.reduce((a, v) => a + (v - grand) ** 2, 0);
  const ids = [...new Set(groups)];
  let between = 0;
  for (const g of ids) {
    const vs = values.filter((_, i) => groups[i] === g);
    const gm = vs.reduce((a, b) => a + b, 0) / vs.length;
    between += vs.length * (gm - grand) ** 2;
  }
  return total === 0 ? Number.NaN : between / total;
}
