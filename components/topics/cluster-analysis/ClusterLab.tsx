"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { useClusterStore } from "@/lib/store/cluster-analysis";

const W = 300;
const H = 220;
const CX = W / 2;
const CY = H / 2;
const SCALE = 22;

export const CLUSTER_COLORS = ["#dc2626", "#2563eb", "#16a34a", "#d97706", "#7c3aed", "#0891b2"];

// WCSS=Σ‖x−μ‖²。wcss の項に id を付け、操作で差し込み＋ハイライト。
const FORMULA = `\\text{WCSS}=\\sum_{k}\\sum_{x\\in C_k}\\lVert x-\\mu_k\\rVert^2=${term("wcss", "?")}`;

export function ClusterLab() {
  const k = useClusterStore((s) => s.controls.k);
  const { points, steps, finalWcss, wcssByK } = useClusterStore((s) => s.derived);
  const setControl = useClusterStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("wcss", formatNumber(finalWcss, 1));
    m.setHighlight("wcss", true, "#7c3aed");
  }, [finalWcss]);

  const final = steps[steps.length - 1];
  const toX = (x: number) => CX + x * SCALE;
  const toY = (y: number) => CY - y * SCALE;

  // エルボー曲線。
  const maxW = Math.max(...wcssByK, 1);
  const ew = 150;
  const eh = 60;
  const ePts = wcssByK.map((w, i) => {
    const kk = i + 1;
    return { x: 30 + ((kk - 1) / 5) * ew, y: 12 + (1 - w / maxW) * eh, kk };
  });

  return (
    <div
      id="cluster-operation"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <div className="space-y-1">
        <label htmlFor="cl-k" className="text-sm font-semibold text-slate-700">
          クラスター数 k = {k}（データには自然な4つの塊）
        </label>
        <input
          id="cl-k"
          type="range"
          min={1}
          max={6}
          step={1}
          value={k}
          onChange={(e) => setControl("k", Number(e.target.value))}
          className="w-full accent-violet-600"
          aria-label="クラスター数 k"
        />
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="クラスタリング結果"
        data-testid="cluster-plot"
      >
        {points.map((p, i) => (
          <circle
            key={i}
            cx={toX(p.x)}
            cy={toY(p.y)}
            r={3}
            fill={CLUSTER_COLORS[final.assignments[i] % CLUSTER_COLORS.length]}
            opacity={0.65}
          />
        ))}
        {final.centroids.slice(0, k).map((c, j) => (
          <g key={j}>
            <circle
              cx={toX(c.x)}
              cy={toY(c.y)}
              r={6}
              fill="none"
              stroke={CLUSTER_COLORS[j % CLUSTER_COLORS.length]}
              strokeWidth={2.5}
            />
            <circle
              cx={toX(c.x)}
              cy={toY(c.y)}
              r={2}
              fill={CLUSTER_COLORS[j % CLUSTER_COLORS.length]}
            />
          </g>
        ))}
      </svg>

      {/* エルボー曲線 */}
      <div>
        <p className="mb-1 text-xs font-semibold text-slate-600">
          エルボー：WCSS vs クラスター数 k
        </p>
        <svg
          viewBox={`0 0 ${ew + 50} ${eh + 30}`}
          className="h-auto w-full"
          role="img"
          aria-label="エルボー曲線"
          data-testid="elbow"
        >
          <polyline
            points={ePts.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="#94a3b8"
            strokeWidth={1.5}
          />
          {ePts.map((p) => (
            <g key={p.kk}>
              <circle
                cx={p.x}
                cy={p.y}
                r={p.kk === k ? 5 : 3}
                fill={p.kk === k ? "#7c3aed" : "#cbd5e1"}
              />
              <text x={p.x} y={eh + 26} textAnchor="middle" className="fill-slate-400 text-[8px]">
                {p.kk}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>
      <p className="text-center font-mono text-sm text-slate-600">
        k={k}・収束まで {steps.length - 1} ステップ・WCSS={formatNumber(finalWcss, 1)}
      </p>

      <Callout
        title="k-means：点を k 個の重心の周りにまとめる"
        body={`各点を最も近い重心に割り当て、重心を平均へ動かす——を繰り返す。クラスター数 k=${k} で WCSS（群内平方和）=${formatNumber(
          finalWcss,
          1,
        )}。k を増やすと WCSS は必ず下がるが、エルボー（急に減らなくなる肘）の k=4 が自然な分割。`}
        note="WCSS は «各点と重心の距離²の総和»。k=データ数なら0になる（過剰）。下がり方が緩むエルボーや、シルエット係数で適切な k を選ぶ。ラベルなしの教師なし学習。"
        kind="explain"
      />
    </div>
  );
}
