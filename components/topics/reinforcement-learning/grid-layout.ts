/**
 * グリッドワールドの SVG 座標・配色ヘルパー（描画層寄りの純関数・副作用なし）。
 * GridWorldLab / QUpdateStepper など、5×5 グリッドを描く複数コンポーネントで共有する
 * （同じグリッドの描き方が2箇所以上で必要になったため、px/py の重複実装を避ける）。
 * SVG に渡す座標は round2 で丸める（tasks/lessons.md #67: SSR/CSR の1ULP差でハイドレーション不一致を防ぐ）。
 */

import { GRID_SIZE } from "@/lib/stats/reinforcement-learning";

export const GRID_PX = { W: 260, H: 260, PAD: 14 } as const;
const SCALE = GRID_PX.W - 2 * GRID_PX.PAD;
const CELL = SCALE / GRID_SIZE;

export const round2 = (v: number): number => Math.round(v * 100) / 100;

/** 1マスの一辺の長さ（px）。 */
export const cellPx = (): number => round2(CELL);

/** マスの左上 x 座標。 */
export const cellLeft = (col: number): number => round2(GRID_PX.PAD + col * CELL);
/** マスの左上 y 座標。 */
export const cellTop = (row: number): number => round2(GRID_PX.PAD + row * CELL);
/** マス中心の x 座標。 */
export const cellCenterX = (col: number): number => round2(GRID_PX.PAD + (col + 0.5) * CELL);
/** マス中心の y 座標。 */
export const cellCenterY = (row: number): number => round2(GRID_PX.PAD + (row + 0.5) * CELL);

/** 16進カラー2色を t∈[0,1] で線形補間する。 */
function mixHex(hexLow: string, hexHigh: string, t: number): string {
  const clampT = Math.max(0, Math.min(1, t));
  const parse = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = parse(hexLow);
  const [r2, g2, b2] = parse(hexHigh);
  const mix = (a: number, b: number) => Math.round(a + (b - a) * clampT);
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(mix(r1, r2))}${toHex(mix(g1, g2))}${toHex(mix(b1, b2))}`;
}

/**
 * Q値を色に変換する（発散配色）: 0 を白に近いニュートラルとし、正は青、負は赤に振れる。
 * `scale` は色を振り切らせる基準幅（例: 10 なら ±10 で最も濃い色になる）。
 */
export function qValueColor(value: number, scale: number): string {
  if (!Number.isFinite(value) || scale <= 0) return "#f1f5f9";
  const t = Math.max(-1, Math.min(1, value / scale));
  if (t >= 0) return mixHex("#f8fafc", "#1d4ed8", t);
  return mixHex("#f8fafc", "#b91c1c", -t);
}
