/**
 * 数式（KaTeX）まわりの純関数ヘルパー。
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2「計算層は純関数」）。
 * DOM 操作・描画は term-controller.ts / MathFormula.tsx 側（描画層）に分離する。
 */

/** DOM id として安全な接頭辞。操作イベントから getElementById で参照する。 */
export const TERM_ID_PREFIX = "term-";

/** 項キーから DOM id を作る（例: "n" -> "term-n"）。 */
export function termId(key: string): string {
  return `${TERM_ID_PREFIX}${key}`;
}

/**
 * KaTeX の `\htmlId` 拡張で項に id を付与した TeX 断片を生成する。
 * `trust:true` / `strict:false` の描画前提（walking-skeleton.md §3）。
 * 例: term("n", "n") -> "\\htmlId{term-n}{n}"
 */
export function term(key: string, tex: string): string {
  return `\\htmlId{${termId(key)}}{${tex}}`;
}

/**
 * 数式中に差し込む数値の表示整形。
 * - 有限でない値は "—"（連動が壊れていることを視認できるダッシュ）。
 * - 既定は小数2桁。整数は末尾の不要なゼロを落とす。
 */
export function formatNumber(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "\\text{—}";
  const fixed = value.toFixed(digits);
  // "2.00" -> "2", "2.50" -> "2.5" のように末尾ゼロを削る
  return fixed.replace(/\.?0+$/, "");
}

/** 標準誤差 SE = σ/√n。n<=0 は NaN（呼び出し側で形式整形して "—" 表示）。 */
export function standardError(sigma: number, n: number): number {
  if (n <= 0) return Number.NaN;
  return sigma / Math.sqrt(n);
}
