/**
 * 決定的な擬似乱数生成器（計算層・純関数）。
 * シードを与えると再現可能な乱数列を返すため、サンプリング処理を Vitest で検証できる
 * （CLAUDE.md §2「計算層は副作用のない純関数」）。描画・実時間サンプリングは描画層が
 * `Date.now()` 等をシードに渡して使う。
 */

/** [0,1) の一様乱数を返す関数（呼ぶたびに内部状態が進む）。 */
export type Rng = () => number;

/**
 * mulberry32: 32bit シードの軽量 PRNG。同じシードからは必ず同じ列を返す。
 * 統計の体感には十分な品質で、依存を増やさず自前で完結させる（walking-skeleton.md §1）。
 */
export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
