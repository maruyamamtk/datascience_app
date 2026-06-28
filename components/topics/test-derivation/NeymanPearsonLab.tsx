"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { normalPdf } from "@/lib/stats/test-derivation";
import { NP_CONFIG, useTestDerivStore } from "@/lib/store/test-derivation";

const W = 360;
const H = 160;
const PAD = { top: 12, right: 12, bottom: 24, left: 12 };
const AXIS_MIN = -1.2;
const AXIS_MAX = 2.4;
const SAMPLES = 120;

const COLOR_H0 = "#64748b"; // H0 分布
const COLOR_H1 = "#2563eb"; // H1 分布
const COLOR_ALPHA = "#dc2626"; // 第一種の過誤
const COLOR_POWER = "#2563eb"; // 検出力
const COLOR_C = "#0f172a"; // 閾値

// α=P(x̄>c|H0)、検出力=P(x̄>c|H1)。値の項に id を付け、c 操作で差し込み＋ハイライト。
const FORMULA = `\\alpha=P(\\bar x>c\\mid H_0)=${term("alpha", "?")},\\quad \\text{検出力}=P(\\bar x>c\\mid H_1)=${term(
  "power",
  "?",
)}`;

export function NeymanPearsonLab() {
  const c = useTestDerivStore((s) => s.controls.c);
  const { alpha, power, se, npThreshold05 } = useTestDerivStore((s) => s.derived);
  const setControl = useTestDerivStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("alpha", formatNumber(alpha, 3));
    m.setValue("power", formatNumber(power, 3));
    m.setHighlight("alpha", true, COLOR_ALPHA);
    m.setHighlight("power", true, COLOR_POWER);
  }, [alpha, power]);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const toX = (x: number) => PAD.left + ((x - AXIS_MIN) / (AXIS_MAX - AXIS_MIN)) * plotW;
  const yMax = normalPdf(NP_CONFIG.mu0, NP_CONFIG.mu0, se) * 1.1;
  const toY = (d: number) => PAD.top + (1 - d / yMax) * plotH;

  const curve = (mu: number) =>
    Array.from({ length: SAMPLES + 1 }, (_, i) => {
      const x = AXIS_MIN + (i / SAMPLES) * (AXIS_MAX - AXIS_MIN);
      return { x, y: normalPdf(x, mu, se) };
    });
  const path = (mu: number) =>
    curve(mu)
      .map((p, i) => `${i === 0 ? "M" : "L"}${toX(p.x).toFixed(1)},${toY(p.y).toFixed(1)}`)
      .join(" ");
  // c より右の塗り（α は H0、検出力は H1）。
  const area = (mu: number) => {
    const pts = curve(mu).filter((p) => p.x >= c);
    if (pts.length === 0) return "";
    let d = `M${toX(c).toFixed(1)},${toY(0).toFixed(1)}`;
    for (const p of pts) d += ` L${toX(p.x).toFixed(1)},${toY(p.y).toFixed(1)}`;
    d += ` L${toX(AXIS_MAX).toFixed(1)},${toY(0).toFixed(1)} Z`;
    return d;
  };

  return (
    <div
      id="testderiv-operation"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <div className="space-y-1">
        <label htmlFor="np-c" className="text-sm font-semibold text-slate-700">
          棄却域の閾値 c = {formatNumber(c, 2)}（x̄ &gt; c で H0 を棄却）
        </label>
        <input
          id="np-c"
          type="range"
          min={AXIS_MIN + 0.2}
          max={AXIS_MAX - 0.2}
          step={0.01}
          value={c}
          onChange={(e) => setControl("c", Number(e.target.value))}
          className="w-full accent-slate-700"
          aria-label="閾値 c"
        />
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="2つの単純仮説の検定"
        data-testid="np-plot"
      >
        {/* 検出力（H1 の c より右）青 */}
        <path d={area(NP_CONFIG.mu1)} fill={COLOR_POWER} opacity={0.25} />
        {/* α（H0 の c より右）赤 */}
        <path d={area(NP_CONFIG.mu0)} fill={COLOR_ALPHA} opacity={0.4} />
        {/* 分布曲線 */}
        <path d={path(NP_CONFIG.mu0)} fill="none" stroke={COLOR_H0} strokeWidth={2} />
        <path d={path(NP_CONFIG.mu1)} fill="none" stroke={COLOR_H1} strokeWidth={2} />
        {/* 閾値 c */}
        <line
          x1={toX(c)}
          y1={PAD.top}
          x2={toX(c)}
          y2={toY(0)}
          stroke={COLOR_C}
          strokeWidth={1.5}
          strokeDasharray="3 2"
        />
        {/* α=0.05 のNP閾値 */}
        <line
          x1={toX(npThreshold05)}
          y1={toY(0) - 6}
          x2={toX(npThreshold05)}
          y2={toY(0)}
          stroke="#16a34a"
          strokeWidth={2}
        />
        <text
          x={toX(NP_CONFIG.mu0)}
          y={PAD.top + 6}
          textAnchor="middle"
          className="fill-slate-500 text-[10px]"
        >
          H0: μ={NP_CONFIG.mu0}
        </text>
        <text
          x={toX(NP_CONFIG.mu1)}
          y={PAD.top + 6}
          textAnchor="middle"
          className="fill-blue-700 text-[10px] font-semibold"
        >
          H1: μ={NP_CONFIG.mu1}
        </text>
      </svg>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
        <span className="font-mono" style={{ color: COLOR_ALPHA }}>
          α = {formatNumber(alpha * 100, 1)}%
        </span>
        <span className="font-mono" style={{ color: COLOR_POWER }}>
          検出力 = {formatNumber(power * 100, 1)}%
        </span>
        <button
          type="button"
          onClick={() => setControl("c", npThreshold05)}
          className="rounded-lg border border-green-300 bg-green-50 px-3 py-1 text-xs text-green-700 transition hover:bg-green-100"
        >
          α=5% のNP閾値に合わせる
        </button>
      </div>

      <Callout
        title="ネイマン・ピアソン：αを固定して検出力を最大化する"
        body={`閾値 c を上げると α（偽陽性）も検出力（真陽性）も下がる——トレードオフ。ネイマン・ピアソンの基本定理は «α を固定したとき検出力を最大化する最強力検定は «尤度比 > k» の形» と述べる。正規の単純仮説ではそれが «x̄ > c»。`}
        note={`いまの α=${formatNumber(alpha * 100, 1)}%・検出力=${formatNumber(
          power * 100,
          1,
        )}%。同じ α なら、尤度比に基づくこの棄却域より高い検出力を持つ検定は存在しない。`}
        kind="explain"
      />
    </div>
  );
}
