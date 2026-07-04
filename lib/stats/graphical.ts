/**
 * グラフィカルモデリング（N-4）の計算層（純関数）。
 * 確率変数間の «条件付き独立» をグラフで表す。3つの基本構造——連鎖（A→B→C）・分岐（A←B→C）・
 * 合流（A→B←C）——で «B を条件づける（観測する）» と A,C の（条件付き）独立がどう変わるかを扱う。
 * d分離の核心：連鎖/分岐は B で条件づけると遮断され独立に、合流は B で条件づけると逆に依存が開く。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。乱数は呼び出し側の Rng に閉じる。
 */

import type { Rng } from "./random";

/** ボックス–ミュラー法で標準正規。 */
function gauss(rng: Rng): number {
  const u1 = Math.max(1e-12, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** 3変数の観測（A,B,C）。 */
export type Triple = { a: number; b: number; c: number };

/** 基本構造の種類。 */
export type Structure = "chain" | "fork" | "collider";

/**
 * 指定した基本構造で n サンプルを生成（各辺の強さ w、雑音 sd=1）。
 * - chain（連鎖 A→B→C）: A〜N(0,1), B=w·A+ε, C=w·B+ε。A と C は B 経由でのみ繋がる。
 * - fork（分岐 A←B→C）: B〜N(0,1), A=w·B+ε, C=w·B+ε。共通原因 B が A,C を相関させる。
 * - collider（合流 A→B←C）: A,C〜N(0,1) 独立, B=w·A+w·C+ε。A,C は周辺独立だが B が共通結果。
 */
export function generateTriples(params: {
  structure: Structure;
  n: number;
  w: number;
  rng: Rng;
}): Triple[] {
  const { structure, n, w, rng } = params;
  const out: Triple[] = [];
  for (let i = 0; i < n; i++) {
    if (structure === "chain") {
      const a = gauss(rng);
      const b = w * a + gauss(rng);
      const c = w * b + gauss(rng);
      out.push({ a, b, c });
    } else if (structure === "fork") {
      const b = gauss(rng);
      const a = w * b + gauss(rng);
      const c = w * b + gauss(rng);
      out.push({ a, b, c });
    } else {
      const a = gauss(rng);
      const c = gauss(rng);
      const b = w * a + w * c + gauss(rng);
      out.push({ a, b, c });
    }
  }
  return out;
}

function mean(xs: readonly number[]): number {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
}

/** ピアソン相関係数。 */
export function correlation(xs: readonly number[], ys: readonly number[]): number {
  const mx = mean(xs);
  const my = mean(ys);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < xs.length; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  const den = Math.sqrt(sxx * syy);
  return den === 0 ? Number.NaN : sxy / den;
}

/**
 * 偏相関 r(x,y·z)：z の線形影響を除いた x,y の相関。
 * r_xy.z = (r_xy − r_xz·r_yz) / √((1−r_xz²)(1−r_yz²))。
 * «z を条件づけたときの» x,y の関係の代理（多変量正規なら条件付き独立 ⇔ 偏相関ゼロ）。
 */
export function partialCorrelation(
  xs: readonly number[],
  ys: readonly number[],
  zs: readonly number[],
): number {
  const rxy = correlation(xs, ys);
  const rxz = correlation(xs, zs);
  const ryz = correlation(ys, zs);
  const den = Math.sqrt((1 - rxz * rxz) * (1 - ryz * ryz));
  return den === 0 ? Number.NaN : (rxy - rxz * ryz) / den;
}

/** Triple 配列から列を抜き出す。 */
export function column(triples: readonly Triple[], key: keyof Triple): number[] {
  return triples.map((t) => t[key]);
}

/**
 * A と C は d分離されるか（B を条件づけるか否かで判定）。
 * - chain / fork: B が «条件集合に入る» と遮断されて独立（d分離）。入らないと従属。
 * - collider: B（合流点）が «条件集合に入る» と逆に開いて従属。入らないと独立（d分離）。
 * 戻り値 true = d分離（条件付き独立）。
 */
export function dSeparated(structure: Structure, conditionOnB: boolean): boolean {
  if (structure === "collider") return !conditionOnB;
  return conditionOnB;
}

/**
 * 生成データでの «A,C の（条件付き）独立» の実測。
 * 周辺相関 corr(A,C) と、B を条件づけた偏相関 corr(A,C·B) を返す。
 * d分離が成り立つ側の相関は0に近づくはず（有限標本の揺らぎは残る）。
 */
export function acDependence(triples: readonly Triple[]): {
  marginal: number;
  partialGivenB: number;
} {
  const a = column(triples, "a");
  const b = column(triples, "b");
  const c = column(triples, "c");
  return {
    marginal: correlation(a, c),
    partialGivenB: partialCorrelation(a, c, b),
  };
}
