"use client";

import type { CurvePoint } from "@/lib/stats/normal";

/** ±kσ の帯（描画指定）。内側ほど濃く塗る（68-95-99.7 を入れ子で見せる）。 */
export type SigmaBand = {
  /** 何σぶんか（1,2,3）。 */
  k: number;
  /** 区間に入る確率（ラベル用）。 */
  prob: number;
  /** 塗り色。 */
  color: string;
};

type NormalCurveProps = {
  /** 描画する密度曲線（固定軸で評価した {x,y}）。lib/stats/normal の normalCurve() で生成。 */
  curve: CurvePoint[];
  /** 平均 μ（縦の基準線）。 */
  mu: number;
  /** 標準偏差 σ（±kσ の帯の幅）。 */
  sigma: number;
  /** 軸下端（固定）。 */
  axisMin: number;
  /** 軸上端（固定）。 */
  axisMax: number;
  /** y の最大値（固定。σを小さくしても山がはみ出ないよう全域共通スケール）。 */
  yMax: number;
  /** 入れ子で塗る ±kσ 帯（外側=薄→内側=濃の順で渡す）。 */
  bands?: SigmaBand[];
  /** ハイライト中の k（演習/コールアウト連動。該当帯を強調）。 */
  activeK?: number | null;
};

const W = 360;
const H = 210;
const PAD = { top: 14, right: 14, bottom: 30, left: 14 };
const CHART_W = W - PAD.left - PAD.right;
const CHART_H = H - PAD.top - PAD.bottom;
const BASE_Y = PAD.top + CHART_H;

/**
 * 正規分布の密度曲線（描画層・純描画）。
 * 固定軸（axisMin/axisMax/yMax）の上に曲線・μ基準線・±kσ の入れ子帯を描く。
 * μ を動かすと山が横にスライドし、σ を動かすと山の高さ・広がりが変わる様子を一目で見せる。
 * 計算は lib/stats/normal の純関数に委譲し、ここは座標変換と描画のみ（副作用なし）。
 */
export function NormalCurve({
  curve,
  mu,
  sigma,
  axisMin,
  axisMax,
  yMax,
  bands = [],
  activeK = null,
}: NormalCurveProps) {
  const span = axisMax - axisMin || 1;
  const toX = (v: number) => PAD.left + ((v - axisMin) / span) * CHART_W;
  const toY = (v: number) => BASE_Y - (v / (yMax || 1)) * CHART_H;

  const linePoints = curve.map((p) => `${toX(p.x).toFixed(1)},${toY(p.y).toFixed(1)}`).join(" ");

  // [a,b] に入る曲線部分の下を塗る面パスを作る（帯の可視化）。
  const areaPath = (a: number, b: number): string => {
    const inside = curve.filter((p) => p.x >= a && p.x <= b);
    if (inside.length < 2) return "";
    const top = inside.map((p) => `${toX(p.x).toFixed(1)} ${toY(p.y).toFixed(1)}`).join(" L ");
    const x0 = toX(inside[0].x).toFixed(1);
    const x1 = toX(inside[inside.length - 1].x).toFixed(1);
    return `M ${x0} ${BASE_Y.toFixed(1)} L ${top} L ${x1} ${BASE_Y.toFixed(1)} Z`;
  };

  const muX = toX(mu);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label="正規分布の確率密度曲線"
      data-testid="normal-curve"
    >
      {/* ±kσ の入れ子帯（外側＝薄から先に塗り、内側＝濃を上に重ねる） */}
      {bands.map((band) => {
        const d = areaPath(mu - band.k * sigma, mu + band.k * sigma);
        if (!d) return null;
        const active = activeK === band.k;
        return (
          <path
            key={band.k}
            d={d}
            fill={band.color}
            opacity={active ? 0.55 : 0.32}
            stroke={active ? band.color : "none"}
            strokeWidth={active ? 1.5 : 0}
          />
        );
      })}

      {/* ±kσ の境界線（σ の幅を視認） */}
      {bands.map((band) => {
        const active = activeK === band.k;
        return [-1, 1].map((s) => {
          const x = toX(mu + s * band.k * sigma);
          if (x < PAD.left || x > W - PAD.right) return null;
          return (
            <line
              key={`${band.k}-${s}`}
              x1={x}
              y1={PAD.top}
              x2={x}
              y2={BASE_Y}
              stroke={band.color}
              strokeWidth={active ? 1.5 : 1}
              strokeDasharray="3 3"
              opacity={active ? 0.9 : 0.4}
            />
          );
        });
      })}

      {/* 密度曲線 */}
      {linePoints ? (
        <polyline points={linePoints} fill="none" stroke="#1e293b" strokeWidth={2.5} />
      ) : null}

      {/* 平均 μ の基準線 */}
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
        y={H - 9}
        textAnchor="middle"
        className="fill-green-700 text-[10px] font-semibold"
      >
        μ = {mu}
      </text>
      <text x={PAD.left} y={H - 9} textAnchor="start" className="fill-slate-400 text-[10px]">
        {axisMin}
      </text>
      <text x={W - PAD.right} y={H - 9} textAnchor="end" className="fill-slate-400 text-[10px]">
        {axisMax}
      </text>
    </svg>
  );
}
