"use client";

import { maxCount, type Bin } from "@/lib/stats/histogram";
import { normalPdf } from "@/lib/stats/normal";

type HistogramProps = {
  /** 度数ビン（lib/stats/histogram の histogram() の結果）。 */
  bins: Bin[];
  /** 軸下端。 */
  axisMin: number;
  /** 軸上端。 */
  axisMax: number;
  /** 母平均 μ（縦の基準線）。 */
  mu: number;
  /** 標準誤差 SE = σ/√n（μ±SE の帯と正規曲線の σ）。 */
  se: number;
  /** 蓄積した標本平均の総数（正規曲線を度数スケールへ合わせるのに使う）。 */
  total: number;
  /** 収束先の正規曲線を重ねるか。 */
  showNormal?: boolean;
};

const W = 360;
const H = 200;
const PAD = { top: 12, right: 12, bottom: 28, left: 12 };
const CHART_W = W - PAD.left - PAD.right;
const CHART_H = H - PAD.top - PAD.bottom;
const BASE_Y = PAD.top + CHART_H;

/**
 * 標本平均のヒストグラム（描画層）。バー + 母平均 μ の基準線 + μ±SE の帯 +
 * 収束先 N(μ, SE²) の曲線を重ね、「n を増やすと μ の周りに σ/√n で縮みつつ正規に近づく」
 * を一目で見せる（受け入れ条件）。計算は lib/stats の純関数に委譲し、ここは描画のみ。
 */
export function Histogram({
  bins,
  axisMin,
  axisMax,
  mu,
  se,
  total,
  showNormal = true,
}: HistogramProps) {
  const span = axisMax - axisMin || 1;
  const toX = (v: number) => PAD.left + ((v - axisMin) / span) * CHART_W;

  const binWidth = bins.length > 0 ? (axisMax - axisMin) / bins.length : 0;
  const peakCount = Math.max(1, maxCount(bins));
  const toBarH = (count: number) => (count / peakCount) * CHART_H;

  const muX = toX(mu);
  const seLeftX = toX(mu - se);
  const seRightX = toX(mu + se);
  const seValid = Number.isFinite(se) && se > 0;

  // 正規曲線を度数スケールへ: 期待度数 ≈ total · pdf(x) · binWidth。
  const normalPoints: string[] = [];
  if (showNormal && seValid && total > 0 && binWidth > 0) {
    const STEPS = 80;
    for (let i = 0; i <= STEPS; i++) {
      const x = axisMin + (span * i) / STEPS;
      const expected = total * normalPdf(x, mu, se) * binWidth;
      const y = BASE_Y - toBarH(expected);
      normalPoints.push(`${toX(x).toFixed(1)},${y.toFixed(1)}`);
    }
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label="標本平均のヒストグラム"
      data-testid="clt-histogram"
    >
      {/* μ±SE の帯（標準誤差の幅を可視化） */}
      {seValid ? (
        <rect
          x={seLeftX}
          y={PAD.top}
          width={Math.max(0, seRightX - seLeftX)}
          height={CHART_H}
          fill="#0891b2"
          opacity={0.1}
        />
      ) : null}

      {/* 度数バー */}
      {bins.map((b, i) => {
        const x = toX(b.x0);
        const w = Math.max(0, toX(b.x1) - toX(b.x0) - 1);
        const h = toBarH(b.count);
        return <rect key={i} x={x} y={BASE_Y - h} width={w} height={h} fill="#94a3b8" rx={1} />;
      })}

      {/* 収束先の正規曲線 */}
      {normalPoints.length > 1 ? (
        <polyline
          points={normalPoints.join(" ")}
          fill="none"
          stroke="#2563eb"
          strokeWidth={2}
          opacity={0.9}
        />
      ) : null}

      {/* 母平均 μ の基準線 */}
      <line
        x1={muX}
        y1={PAD.top}
        x2={muX}
        y2={BASE_Y}
        stroke="#16a34a"
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />

      {/* 軸 */}
      <line
        x1={PAD.left}
        y1={BASE_Y}
        x2={W - PAD.right}
        y2={BASE_Y}
        stroke="#cbd5e1"
        strokeWidth={1}
      />
      <text
        x={muX}
        y={H - 8}
        textAnchor="middle"
        className="fill-green-700 text-[10px] font-semibold"
      >
        μ = {mu}
      </text>
      <text x={PAD.left} y={H - 8} textAnchor="start" className="fill-slate-400 text-[10px]">
        {axisMin}
      </text>
      <text x={W - PAD.right} y={H - 8} textAnchor="end" className="fill-slate-400 text-[10px]">
        {axisMax}
      </text>
    </svg>
  );
}
