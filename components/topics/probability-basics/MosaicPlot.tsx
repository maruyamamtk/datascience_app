"use client";

import { formatNumber } from "@/components/math/tex";

/**
 * ベイズの定理のモザイク図（純描画 / 描画層）。
 * 単位正方形を「病気/健康（横幅＝事前確率）」×「陽性/陰性（縦＝感度・偽陽性率）」で面積分割する。
 * 上段（陽性）の中で病気側（真陽性）が占める «横» の割合が、そのまま事後確率 P(D|+)。
 * 副作用なし。色ハイライトで «陽性の人» の領域を強調する（アルゴリズム図鑑スタイル, SPEC §4.4）。
 */

const W = 320;
const H = 230;
const PAD = { top: 26, right: 16, bottom: 22, left: 16 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

export const COLOR_TP = "#2563eb"; // 真陽性（病気かつ陽性）
export const COLOR_FN = "#bfdbfe"; // 偽陰性（病気かつ陰性）
export const COLOR_FP = "#dc2626"; // 偽陽性（健康かつ陽性）
export const COLOR_TN = "#fee2e2"; // 真陰性（健康かつ陰性）

type Props = {
  /** 事前確率 P(D)（横幅の分割）。 */
  prior: number;
  /** 感度 P(+|D)（病気列の上段の高さ）。 */
  sensitivity: number;
  /** 偽陽性率 P(+|¬D)=1−特異度（健康列の上段の高さ）。 */
  fpr: number;
  /** 事後確率 P(D|+)（ラベル表示用）。 */
  posterior: number;
};

export function MosaicPlot({ prior, sensitivity, fpr, posterior }: Props) {
  const p = Math.max(0, Math.min(1, prior));
  const sickW = p * PLOT_W;
  const healthyW = PLOT_W - sickW;
  const tpH = Math.max(0, Math.min(1, sensitivity)) * PLOT_H; // 病気列の陽性
  const fpH = Math.max(0, Math.min(1, fpr)) * PLOT_H; // 健康列の陽性

  const x0 = PAD.left;
  const xSplit = PAD.left + sickW;
  const y0 = PAD.top;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label="ベイズの定理のモザイク図（病気/健康 × 陽性/陰性の面積分割）"
      data-testid="bayes-mosaic"
    >
      {/* 病気列: 真陽性(上) / 偽陰性(下) */}
      <rect x={x0} y={y0} width={sickW} height={tpH} fill={COLOR_TP} />
      <rect x={x0} y={y0 + tpH} width={sickW} height={PLOT_H - tpH} fill={COLOR_FN} />
      {/* 健康列: 偽陽性(上) / 真陰性(下) */}
      <rect x={xSplit} y={y0} width={healthyW} height={fpH} fill={COLOR_FP} />
      <rect x={xSplit} y={y0 + fpH} width={healthyW} height={PLOT_H - fpH} fill={COLOR_TN} />

      {/* 陽性領域（上段＝真陽性＋偽陽性）を囲む：事後確率はこの帯の中の青の横割合 */}
      <rect
        x={x0}
        y={y0 - 4}
        width={PLOT_W}
        height={Math.max(tpH, fpH) + 4}
        fill="none"
        stroke="#0f172a"
        strokeWidth={1.2}
        strokeDasharray="4 3"
      />
      <text x={x0} y={y0 - 10} className="fill-slate-700 text-[11px] font-semibold">
        ⎯ 陽性（+）の人： P(D|+) = {formatNumber(posterior * 100, 0)}% が病気
      </text>

      {/* 列ラベル（横軸＝事前確率の分割） */}
      <text
        x={x0 + sickW / 2}
        y={H - 7}
        textAnchor="middle"
        className="fill-blue-700 text-[10px] font-semibold"
      >
        病気 {formatNumber(p * 100, 0)}%
      </text>
      <text
        x={xSplit + healthyW / 2}
        y={H - 7}
        textAnchor="middle"
        className="fill-red-700 text-[10px] font-semibold"
      >
        健康 {formatNumber((1 - p) * 100, 0)}%
      </text>
    </svg>
  );
}
