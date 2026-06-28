"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { usePcaStore } from "@/lib/store/principal-component-analysis";

const W = 320;
const H = 220;
const CX = W / 2;
const CY = H / 2;
const SCALE = 22; // データ単位→px

const COLOR_PC1 = "#dc2626";
const COLOR_PC2 = "#2563eb";

// 第1主成分の寄与率 r1=λ1/(λ1+λ2)。r1 の項に id を付け、操作で差し込み＋ハイライト。
const FORMULA = `r_1=\\dfrac{\\lambda_1}{\\lambda_1+\\lambda_2}=${term("r1", "?")}`;

export function PcaLab() {
  const corr = usePcaStore((s) => s.controls.corr);
  const { points, pc1, pc2, ratios } = usePcaStore((s) => s.derived);
  const setControl = usePcaStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("r1", formatNumber(ratios[0], 3));
    m.setHighlight("r1", true, COLOR_PC1);
  }, [ratios]);

  // 中心化のための平均。
  const mx = points.reduce((a, p) => a + p.x, 0) / points.length;
  const my = points.reduce((a, p) => a + p.y, 0) / points.length;
  const toX = (x: number) => CX + (x - mx) * SCALE;
  const toY = (y: number) => CY - (y - my) * SCALE;

  // 主成分軸の長さ＝√固有値（標準偏差）×係数。
  const axis = (pc: typeof pc1, color: string, len: number) => {
    const half = Math.sqrt(Math.max(0, pc.eigenvalue)) * SCALE * len;
    const dx = pc.vector[0] * half;
    const dy = pc.vector[1] * half;
    return (
      <line
        x1={CX - dx}
        y1={CY + dy}
        x2={CX + dx}
        y2={CY - dy}
        stroke={color}
        strokeWidth={2.5}
        markerEnd=""
      />
    );
  };

  return (
    <div id="pca-operation" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="space-y-1">
        <label htmlFor="pca-corr" className="text-sm font-semibold text-slate-700">
          2変数の相関 corr = {formatNumber(corr)}（大きいほど第1主成分に集中）
        </label>
        <input
          id="pca-corr"
          type="range"
          min={-0.95}
          max={0.95}
          step={0.05}
          value={corr}
          onChange={(e) => setControl("corr", Number(e.target.value))}
          className="w-full accent-red-600"
          aria-label="2変数の相関"
        />
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="主成分分析"
        data-testid="pca-plot"
      >
        <line x1={0} y1={CY} x2={W} y2={CY} stroke="#f1f5f9" />
        <line x1={CX} y1={0} x2={CX} y2={H} stroke="#f1f5f9" />
        {points.map((p, i) => (
          <circle key={i} cx={toX(p.x)} cy={toY(p.y)} r={2.6} fill="#64748b" opacity={0.55} />
        ))}
        {/* 第2主成分（短い軸）→ 第1主成分（長い軸）の順に重ねる */}
        {axis(pc2, COLOR_PC2, 2.2)}
        {axis(pc1, COLOR_PC1, 2.2)}
        <text
          x={CX + pc1.vector[0] * 70}
          y={CY - pc1.vector[1] * 70}
          className="fill-red-600 text-[9px] font-semibold"
        >
          PC1
        </text>
        <text
          x={CX + pc2.vector[0] * 50}
          y={CY - pc2.vector[1] * 50}
          className="fill-blue-600 text-[9px] font-semibold"
        >
          PC2
        </text>
      </svg>

      {/* 寄与率バー */}
      <div className="space-y-1">
        {[0, 1].map((k) => (
          <div key={k} className="flex items-center gap-2 text-xs">
            <span className="w-10" style={{ color: k === 0 ? COLOR_PC1 : COLOR_PC2 }}>
              PC{k + 1}
            </span>
            <div className="h-3 flex-1 overflow-hidden rounded bg-slate-100">
              <div
                className="h-full"
                style={{
                  width: `${ratios[k] * 100}%`,
                  background: k === 0 ? COLOR_PC1 : COLOR_PC2,
                }}
              />
            </div>
            <span className="w-12 text-right font-mono text-slate-600">
              {formatNumber(ratios[k] * 100, 1)}%
            </span>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>
      <p className="text-center font-mono text-sm text-slate-600">
        λ1={formatNumber(pc1.eigenvalue, 2)}・λ2={formatNumber(pc2.eigenvalue, 2)}
        ・第1主成分の寄与率={formatNumber(ratios[0] * 100, 1)}%
      </p>

      <Callout
        title="主成分分析：分散最大の方向に座標を取り直す"
        body={`相関 corr=${formatNumber(
          corr,
        )} を上げると、データが第1主成分（赤軸）方向に集中し、第1主成分の寄与率＝${formatNumber(
          ratios[0] * 100,
          1,
        )}% が上がる。軸の長さは √固有値（その方向の標準偏差）。`}
        note="主成分＝共分散行列の固有ベクトル、固有値＝その方向の分散。寄与率が高いほど «1軸でデータを要約» でき、次元圧縮できる。PC1とPC2は直交。"
        kind="explain"
      />
    </div>
  );
}
