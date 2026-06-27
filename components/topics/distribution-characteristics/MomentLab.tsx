"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { chebyshevBound } from "@/lib/stats/moments";
import { useMomentStore } from "@/lib/store/distribution-characteristics";

const AXIS_MIN = -1;
const AXIS_MAX = 13;
const W = 360;
const H = 130;
const PAD_X = 16;
const LINE_Y = 64;
const PLOT_W = W - PAD_X * 2;

const COLOR_MEAN = "#7c3aed"; // 期待値（重心）
const COLOR_SD = "#2563eb"; // 標準偏差の帯
const COLOR_PT = "#0f172a"; // 標本点

// 期待値と分散の数式。μ・σ²・σ の項に id を付け、ドラッグのたびに現在値を差し込み＋ハイライト。
const FORMULA_MEAN = `\\mu=\\frac{1}{${term("n", "n")}}\\sum_i x_i=${term("muv", "\\mu")}`;
const FORMULA_VAR = `\\sigma^2=\\frac{1}{n}\\sum_i (x_i-\\mu)^2=${term(
  "varv",
  "\\sigma^2",
)}\\quad\\sigma=${term("sdv", "\\sigma")}`;

export function MomentLab() {
  const points = useMomentStore((s) => s.controls.points);
  const { mean, variance, std, skewness, kurtosis, cv } = useMomentStore((s) => s.derived);
  const setControl = useMomentStore((s) => s.setControl);

  const meanRef = useRef<MathFormulaHandle>(null);
  const varRef = useRef<MathFormulaHandle>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<number | null>(null);

  useEffect(() => {
    const c = meanRef.current;
    if (c) {
      c.setValue("n", String(points.length));
      c.setValue("muv", formatNumber(mean));
      c.setHighlight("muv", true, COLOR_MEAN);
      c.setHighlight("n", true, COLOR_MEAN);
    }
  }, [points.length, mean]);

  useEffect(() => {
    const c = varRef.current;
    if (c) {
      c.setValue("varv", formatNumber(variance));
      c.setValue("sdv", formatNumber(std));
      c.setHighlight("varv", true, COLOR_SD);
      c.setHighlight("sdv", true, COLOR_SD);
    }
  }, [variance, std]);

  const toX = (v: number) => PAD_X + ((v - AXIS_MIN) / (AXIS_MAX - AXIS_MIN)) * PLOT_W;
  const fromX = (px: number) => AXIS_MIN + ((px - PAD_X) / PLOT_W) * (AXIS_MAX - AXIS_MIN);

  // クライアント座標 → データ座標（viewBox スケール補正, lessons.md）。
  const clientToValue = (clientX: number): number => {
    const svg = svgRef.current;
    if (!svg) return 0;
    const rect = svg.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * W;
    return Math.max(AXIS_MIN, Math.min(AXIS_MAX, fromX(px)));
  };

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const i = dragRef.current;
    if (i === null) return;
    const v = clientToValue(e.clientX);
    const next = [...points];
    next[i] = Math.round(v * 2) / 2; // 0.5 刻みにスナップ
    setControl("points", next);
  };

  const meanX = toX(mean);
  const sdLeftX = toX(mean - std);
  const sdRightX = toX(mean + std);

  return (
    <div
      id="moment-operation"
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <p className="text-sm font-semibold text-slate-700">
        数直線上の点をドラッグ（重心＝期待値、青帯＝μ±σ）
      </p>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none select-none"
        role="img"
        aria-label="標本点と期待値・標準偏差"
        data-testid="moment-line"
        onPointerMove={onMove}
        onPointerUp={() => {
          dragRef.current = null;
        }}
        onPointerLeave={() => {
          dragRef.current = null;
        }}
      >
        {/* μ±σ の帯 */}
        <rect
          x={sdLeftX}
          y={LINE_Y - 18}
          width={Math.max(0, sdRightX - sdLeftX)}
          height={36}
          fill={COLOR_SD}
          opacity={0.12}
        />
        {/* 数直線 */}
        <line
          x1={PAD_X}
          y1={LINE_Y}
          x2={W - PAD_X}
          y2={LINE_Y}
          stroke="#94a3b8"
          strokeWidth={1.5}
        />
        {[0, 2, 4, 6, 8, 10, 12].map((t) => (
          <g key={t}>
            <line x1={toX(t)} y1={LINE_Y - 4} x2={toX(t)} y2={LINE_Y + 4} stroke="#cbd5e1" />
            <text
              x={toX(t)}
              y={LINE_Y + 18}
              textAnchor="middle"
              className="fill-slate-400 text-[9px]"
            >
              {t}
            </text>
          </g>
        ))}
        {/* 重心（期待値）の三角フルクラム */}
        <polygon
          points={`${meanX},${LINE_Y + 2} ${meanX - 7},${LINE_Y + 16} ${meanX + 7},${LINE_Y + 16}`}
          fill={COLOR_MEAN}
        />
        <text
          x={meanX}
          y={LINE_Y + 30}
          textAnchor="middle"
          className="fill-violet-700 text-[10px] font-semibold"
        >
          μ={formatNumber(mean)}
        </text>
        {/* 標本点（ドラッグ可能） */}
        {points.map((x, i) => (
          <circle
            key={i}
            id={`pt-${i}`}
            cx={toX(x)}
            cy={LINE_Y - 28}
            r={8}
            fill={COLOR_PT}
            className="cursor-grab"
            onPointerDown={(e) => {
              dragRef.current = i;
              (e.target as Element).setPointerCapture?.(e.pointerId);
            }}
          />
        ))}
      </svg>

      {/* 強連動する数式 */}
      <div className="space-y-2 rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={meanRef} tex={FORMULA_MEAN} />
        <MathFormula ref={varRef} tex={FORMULA_VAR} />
      </div>

      {/* 高次モーメントの数値 */}
      <div className="grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-4">
        <Stat
          label="歪度 γ₁"
          value={formatNumber(skewness)}
          hint={skewness > 0.05 ? "右に裾" : skewness < -0.05 ? "左に裾" : "ほぼ対称"}
        />
        <Stat
          label="尖度 γ₂"
          value={formatNumber(kurtosis)}
          hint={kurtosis > 0 ? "尖り/重い裾" : "平たい"}
        />
        <Stat label="変動係数 CV" value={formatNumber(cv)} hint="σ/μ" />
        <Stat label="標準偏差 σ" value={formatNumber(std)} hint="√分散" />
      </div>

      <Callout
        title="チェビシェフの不等式（分布の形に依らない保証）"
        body={`どんな分布でも «平均から 2σ 以上離れる確率» は ${formatNumber(
          chebyshevBound(2) * 100,
          0,
        )}% 以下、3σ 以上なら ${formatNumber(chebyshevBound(3) * 100, 1)}% 以下。`}
        note="正規分布ならもっと小さい（2σ外は約5%）が、チェビシェフは «形を仮定しない» 分だけ緩い上界になる。"
        kind="explain"
      />

      <p className="text-xs leading-relaxed text-slate-500">
        ヒント: 1 点を右に大きく引き離すと、<span style={{ color: COLOR_MEAN }}>μ（重心）</span>
        がそちらへ動き、
        <span style={{ color: COLOR_SD }}>σ²</span>が増え、歪度が正（右に裾）になります。
      </p>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-mono text-base text-slate-800">{value}</p>
      <p className="text-[10px] text-slate-400">{hint}</p>
    </div>
  );
}
