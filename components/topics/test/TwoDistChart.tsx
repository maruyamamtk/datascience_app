"use client";

import { normalPdf } from "@/lib/stats/normal";
import type { Alternative } from "@/lib/stats/test";

type TwoDistChartProps = {
  /** H1 分布 N(δ,1) の中心 δ=d√n（標準化スケール）。 */
  delta: number;
  /** 棄却域の臨界値（正の大きさ）。 */
  critical: number;
  /** 対立仮説の種別（棄却域の向き）。 */
  alternative: Alternative;
};

const W = 380;
const H = 200;
const PAD = { top: 14, right: 14, bottom: 26, left: 14 };
const CHART_W = W - PAD.left - PAD.right;
const CHART_H = H - PAD.top - PAD.bottom;
const BASE_Y = H - PAD.bottom;
const Y_MAX = normalPdf(0, 0, 1); // 標準正規のピーク 1/√(2π) ≈ 0.399
const GRID = 240; // 塗り分けの滑らかさ

const COLOR_H0 = "#475569"; // H0 曲線（スレート）
const COLOR_H1 = "#0f766e"; // H1 曲線（ティール）
const COLOR_ALPHA = "#dc2626"; // 第一種の過誤 α（H0 の棄却域・赤）
const COLOR_BETA = "#f59e0b"; // 第二種の過誤 β（H1 の採択域・オレンジ）
const COLOR_POWER = "#16a34a"; // 検出力（H1 の棄却域・緑）

/** z が棄却域に入るか（向きは対立仮説で決まる）。 */
function inRejection(z: number, critical: number, alternative: Alternative): boolean {
  switch (alternative) {
    case "greater":
      return z >= critical;
    case "less":
      return z <= -critical;
    case "two-sided":
      return Math.abs(z) >= critical;
  }
}

/** predicate が真の連続区間 [start,end] の index 範囲リストを返す（塗りを分割描画するため）。 */
function segments(xs: number[], predicate: (x: number) => boolean): [number, number][] {
  const out: [number, number][] = [];
  let start = -1;
  for (let i = 0; i < xs.length; i++) {
    const ok = predicate(xs[i]);
    if (ok && start < 0) start = i;
    if (!ok && start >= 0) {
      out.push([start, i - 1]);
      start = -1;
    }
  }
  if (start >= 0) out.push([start, xs.length - 1]);
  return out;
}

/**
 * 2分布の重ね描き（描画層・純描画）。
 * H0:N(0,1)（実線スレート）と H1:N(δ,1)（実線ティール）を z スケールに重ね、棄却域の臨界線で挟んで
 * 第一種の過誤 α（H0 の棄却域・赤）／第二種の過誤 β（H1 の採択域・橙）／検出力（H1 の棄却域・緑）を
 * 塗り分ける。操作（効果量・n・α・片側/両側）→ δ・臨界値が変わると塗りも連動する（受け入れ条件）。
 * 計算は lib/stats/test の純関数に委譲し、ここは座標変換と描画のみ（副作用なし）。
 */
export function TwoDistChart({ delta, critical, alternative }: TwoDistChartProps) {
  // 軸は H0(0 中心) と H1(δ 中心) の両方が収まるよう動的に決める（±4σ）。
  const lo = Math.min(-4, delta - 4);
  const hi = Math.max(4, delta + 4);
  const span = hi - lo || 1;
  const toX = (z: number) => PAD.left + ((z - lo) / span) * CHART_W;
  const toY = (y: number) => BASE_Y - (y / Y_MAX) * CHART_H;

  // 共通の x グリッドと、各分布の密度。
  const xs: number[] = [];
  for (let i = 0; i < GRID; i++) xs.push(lo + (span * i) / (GRID - 1));
  const h0 = xs.map((x) => normalPdf(x, 0, 1));
  const h1 = xs.map((x) => normalPdf(x, delta, 1));

  // 曲線のラインパス。
  const linePath = (ys: number[]) =>
    ys.map((y, i) => `${i === 0 ? "M" : "L"}${toX(xs[i]).toFixed(2)} ${toY(y).toFixed(2)}`).join(" ");

  // ある分布 ys の、predicate を満たす x 区間を baseline まで塗る塗りパス群。
  const areaPaths = (ys: number[], predicate: (x: number) => boolean) =>
    segments(xs, predicate).map(([s, e]) => {
      let d = `M${toX(xs[s]).toFixed(2)} ${BASE_Y}`;
      for (let i = s; i <= e; i++) d += ` L${toX(xs[i]).toFixed(2)} ${toY(ys[i]).toFixed(2)}`;
      d += ` L${toX(xs[e]).toFixed(2)} ${BASE_Y} Z`;
      return d;
    });

  const isReject = (x: number) => inRejection(x, critical, alternative);
  const alphaPaths = areaPaths(h0, isReject); // H0 の棄却域 = α
  const powerPaths = areaPaths(h1, isReject); // H1 の棄却域 = 検出力
  const betaPaths = areaPaths(h1, (x) => !isReject(x)); // H1 の採択域 = β

  // 臨界線（両側は ±critical、片側は片方のみ）。
  const criticalLines: number[] =
    alternative === "two-sided"
      ? [-critical, critical]
      : alternative === "greater"
        ? [critical]
        : [-critical];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label="帰無分布 H0 と対立分布 H1 の重ね描きと過誤・検出力の塗り分け"
      data-testid="two-dist-chart"
    >
      {/* β（H1 採択域・橙）→ 検出力（H1 棄却域・緑）→ α（H0 棄却域・赤）の順で重ねる */}
      {betaPaths.map((d, i) => (
        <path key={`b${i}`} d={d} fill={COLOR_BETA} fillOpacity={0.28} />
      ))}
      {powerPaths.map((d, i) => (
        <path key={`p${i}`} d={d} fill={COLOR_POWER} fillOpacity={0.3} />
      ))}
      {alphaPaths.map((d, i) => (
        <path key={`a${i}`} d={d} fill={COLOR_ALPHA} fillOpacity={0.45} />
      ))}

      {/* 曲線 */}
      <path d={linePath(h0)} fill="none" stroke={COLOR_H0} strokeWidth={2} />
      <path d={linePath(h1)} fill="none" stroke={COLOR_H1} strokeWidth={2} />

      {/* 中心の基準線とラベル（H0: 0 / H1: δ） */}
      <line x1={toX(0)} y1={toY(Y_MAX)} x2={toX(0)} y2={BASE_Y} stroke={COLOR_H0} strokeWidth={1} strokeDasharray="3 3" />
      <text x={toX(0)} y={PAD.top + 2} textAnchor="middle" className="fill-slate-600 text-[10px] font-semibold">
        H₀: μ₀
      </text>
      {Number.isFinite(delta) && Math.abs(delta) > 0.05 ? (
        <>
          <line
            x1={toX(delta)}
            y1={toY(Y_MAX)}
            x2={toX(delta)}
            y2={BASE_Y}
            stroke={COLOR_H1}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <text
            x={toX(delta)}
            y={PAD.top + 2}
            textAnchor="middle"
            className="text-[10px] font-semibold"
            fill={COLOR_H1}
          >
            H₁: μ₁
          </text>
        </>
      ) : null}

      {/* 臨界線（棄却域の境界） */}
      {criticalLines.map((z, i) => (
        <g key={`c${i}`}>
          <line x1={toX(z)} y1={PAD.top} x2={toX(z)} y2={BASE_Y} stroke="#1e293b" strokeWidth={1.2} />
          <text x={toX(z)} y={BASE_Y + 16} textAnchor="middle" className="fill-slate-700 text-[9px]">
            {z > 0 ? "+" : ""}
            {z.toFixed(2)}
          </text>
        </g>
      ))}

      {/* z 軸 */}
      <line x1={PAD.left} y1={BASE_Y} x2={W - PAD.right} y2={BASE_Y} stroke="#cbd5e1" strokeWidth={1} />
      <text x={W - PAD.right} y={BASE_Y + 16} textAnchor="end" className="fill-slate-400 text-[9px]">
        z
      </text>
    </svg>
  );
}
