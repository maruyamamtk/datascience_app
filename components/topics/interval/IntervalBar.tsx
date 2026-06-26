"use client";

type IntervalBarProps = {
  /** 区間の下限。 */
  lower: number;
  /** 区間の上限。 */
  upper: number;
  /** 区間の中心（標本平均 x̄）。 */
  center: number;
  /** 母平均 μ の位置（基準線）。 */
  mu: number;
  /** 軸下端（固定）。 */
  axisMin: number;
  /** 軸上端（固定）。 */
  axisMax: number;
  /** 区間の色。 */
  color?: string;
};

const W = 360;
const H = 120;
const PAD = { top: 18, right: 16, bottom: 28, left: 16 };
const CHART_W = W - PAD.left - PAD.right;
const BAR_Y = PAD.top + 30;

/**
 * 1 本の信頼区間バー（描画層・純描画）。
 * 固定軸の上に区間 [lower, upper]・中心 x̄・母平均 μ の基準線を描き、
 * n・信頼係数・σ を動かすと区間幅が伸び縮みする様子を一目で見せる（操作→グラフの連動）。
 * 計算は lib/stats/interval の純関数に委譲し、ここは座標変換と描画のみ（副作用なし）。
 */
export function IntervalBar({
  lower,
  upper,
  center,
  mu,
  axisMin,
  axisMax,
  color = "#2563eb",
}: IntervalBarProps) {
  const span = axisMax - axisMin || 1;
  const toX = (v: number) => PAD.left + ((v - axisMin) / span) * CHART_W;

  const xLo = toX(Math.max(axisMin, lower));
  const xHi = toX(Math.min(axisMax, upper));
  const xC = toX(center);
  const xMu = toX(mu);
  const finite = Number.isFinite(lower) && Number.isFinite(upper);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label="信頼区間のバー"
      data-testid="interval-bar"
    >
      {/* 母平均 μ の基準線 */}
      <line
        x1={xMu}
        y1={PAD.top - 6}
        x2={xMu}
        y2={H - PAD.bottom + 4}
        stroke="#16a34a"
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />
      <text
        x={xMu}
        y={PAD.top - 9}
        textAnchor="middle"
        className="fill-green-700 text-[10px] font-semibold"
      >
        μ = {mu}
      </text>

      {/* 信頼区間（太線 + 端点キャップ） */}
      {finite ? (
        <>
          <line
            x1={xLo}
            y1={BAR_Y}
            x2={xHi}
            y2={BAR_Y}
            stroke={color}
            strokeWidth={7}
            strokeLinecap="round"
          />
          {[xLo, xHi].map((x, i) => (
            <line
              key={i}
              x1={x}
              y1={BAR_Y - 9}
              x2={x}
              y2={BAR_Y + 9}
              stroke={color}
              strokeWidth={2}
            />
          ))}
          {/* 中心 x̄ */}
          <circle cx={xC} cy={BAR_Y} r={4} fill="#fff" stroke={color} strokeWidth={2} />
          <text x={xC} y={BAR_Y + 22} textAnchor="middle" className="fill-slate-500 text-[10px]">
            x̄ = {center}
          </text>
        </>
      ) : (
        <text x={W / 2} y={BAR_Y} textAnchor="middle" className="fill-slate-400 text-[11px]">
          n を 1 以上にしてください
        </text>
      )}

      {/* 軸 */}
      <line
        x1={PAD.left}
        y1={H - PAD.bottom}
        x2={W - PAD.right}
        y2={H - PAD.bottom}
        stroke="#cbd5e1"
        strokeWidth={1}
      />
      <text x={PAD.left} y={H - 9} textAnchor="start" className="fill-slate-400 text-[10px]">
        {axisMin}
      </text>
      <text x={W - PAD.right} y={H - 9} textAnchor="end" className="fill-slate-400 text-[10px]">
        {axisMax}
      </text>
    </svg>
  );
}
