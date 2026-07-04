"use client";

import { useEffect, useMemo, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { kernel, type KernelKind } from "@/lib/stats/kde";
import { KDE_RANGE, useKdeStore } from "@/lib/store/kernel-density-estimation";

const W = 360;
const H = 190;
const PAD = { top: 12, right: 12, bottom: 22, left: 30 };

const KERNELS: { id: KernelKind; label: string }[] = [
  { id: "gaussian", label: "ガウス" },
  { id: "epanechnikov", label: "エパネチニコフ" },
  { id: "triangular", label: "三角" },
  { id: "uniform", label: "一様" },
];

// f̂(x)=(1/nh)ΣK((x−xᵢ)/h), ISE。ise の項に id を付け、操作で差し込み＋ハイライト。
const FORMULA = `\\hat f(x)=\\dfrac{1}{nh}\\sum_i K\\!\\left(\\dfrac{x-x_i}{h}\\right),\\ \\text{ISE}=${term("ise", "?")}`;

export function KdeLab() {
  const { bandwidth, kernel: kind } = useKdeStore((s) => s.controls);
  const { data, curve, truthCurve, silverman, ise } = useKdeStore((s) => s.derived);
  const setControl = useKdeStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("ise", formatNumber(ise, 3));
    m.setHighlight("ise", true, "#7c3aed");
  }, [ise]);

  const yMax = Math.max(...truthCurve.map((p) => p.y), ...curve.map((p) => p.y), 0.1) * 1.1;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const toX = (x: number) =>
    PAD.left + ((x - KDE_RANGE.min) / (KDE_RANGE.max - KDE_RANGE.min)) * plotW;
  const toY = (y: number) => PAD.top + (1 - y / yMax) * plotH;
  const path = (pts: { x: number; y: number }[]) =>
    pts
      .map((p, i) => `${i === 0 ? "M" : "L"}${toX(p.x).toFixed(1)},${toY(p.y).toFixed(1)}`)
      .join(" ");

  // 個別カーネルの山（薄く）。各データ点の (1/nh)K((x−xᵢ)/h)。
  const bumps = useMemo(() => {
    const n = data.length;
    return data.map((xi) => {
      const pts: { x: number; y: number }[] = [];
      for (let k = 0; k <= 24; k++) {
        const x = xi - 3.5 * bandwidth + (7 * bandwidth * k) / 24;
        pts.push({ x, y: kernel(kind, (x - xi) / bandwidth) / (n * bandwidth) });
      }
      return pts;
    });
  }, [data, bandwidth, kind]);

  return (
    <div id="kde-operation" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="space-y-1">
        <label htmlFor="kde-h" className="text-sm font-semibold text-slate-700">
          帯域幅 h = {formatNumber(bandwidth)}（小さいとギザギザ／大きいと潰れる）
        </label>
        <input
          id="kde-h"
          type="range"
          min={0.08}
          max={2}
          step={0.02}
          value={bandwidth}
          onChange={(e) => setControl("bandwidth", Number(e.target.value))}
          className="w-full accent-violet-600"
          aria-label="帯域幅 h"
        />
        <button
          type="button"
          onClick={() => setControl("bandwidth", Number(silverman.toFixed(2)))}
          className="rounded border border-violet-300 bg-violet-50 px-2 py-0.5 text-xs text-violet-700"
        >
          シルバーマンの目安 h={formatNumber(silverman)} にする
        </button>
      </div>

      {/* カーネル種別 */}
      <div className="flex gap-1" role="group" aria-label="カーネル種別">
        {KERNELS.map((kk) => (
          <button
            key={kk.id}
            type="button"
            onClick={() => setControl("kernel", kk.id)}
            aria-pressed={kind === kk.id}
            className={`flex-1 rounded-lg border px-1.5 py-1 text-[11px] font-medium transition ${kind === kk.id ? "border-violet-500 bg-violet-50 text-violet-800" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            {kk.label}
          </button>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="カーネル密度推定"
        data-testid="kde-plot"
      >
        {/* 個別カーネルの山 */}
        {bumps.map((b, i) => (
          <path key={i} d={path(b)} fill="none" stroke="#c4b5fd" strokeWidth={0.7} opacity={0.6} />
        ))}
        {/* 真の密度 */}
        <path
          d={path(truthCurve)}
          fill="none"
          stroke="#16a34a"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
        {/* KDE 曲線 */}
        <path d={path(curve)} fill="none" stroke="#7c3aed" strokeWidth={2.5} />
        {/* データのラグ */}
        {data.map((xi, i) => (
          <line
            key={i}
            x1={toX(xi)}
            y1={toY(0)}
            x2={toX(xi)}
            y2={toY(0) + 4}
            stroke="#475569"
            strokeWidth={1}
          />
        ))}
        <text
          x={W - PAD.right}
          y={PAD.top + 8}
          textAnchor="end"
          className="fill-green-700 text-[8px]"
        >
          - - 真の密度
        </text>
        <text
          x={W - PAD.right}
          y={PAD.top + 18}
          textAnchor="end"
          className="fill-violet-700 text-[8px]"
        >
          — KDE
        </text>
      </svg>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>
      <p className="text-center font-mono text-sm text-slate-600">
        h={formatNumber(bandwidth)}・ISE（真の密度との差²）={formatNumber(ise, 3)}
      </p>

      <Callout
        title="カーネル密度推定：各点に山を置いて足す"
        body={`各データ点（下のラグ）に幅 h のカーネル（薄紫の山）を置き、平均して密度 f̂ を作る。帯域幅 h=${formatNumber(
          bandwidth,
        )} で、真の密度（緑破線）との誤差 ISE=${formatNumber(ise, 3)}。h が小さいとギザギザ、大きいと二峰性が潰れる。`}
        note="ヒストグラムの «滑らかな» 版。カーネルの形（ガウス等）より帯域幅 h の選択が結果を大きく左右する。シルバーマンは正規前提の目安で、二峰性ではやや過平滑になりがち。"
        kind="explain"
      />
    </div>
  );
}
