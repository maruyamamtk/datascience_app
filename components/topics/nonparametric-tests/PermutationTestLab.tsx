"use client";

import { useEffect, useMemo, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { histogram } from "@/lib/stats/histogram";
import { useNonparamStore } from "@/lib/store/nonparametric-tests";

const W = 360;
const HIST_H = 130;
const PAD = { top: 12, right: 12, bottom: 22, left: 12 };
const AXIS = 4; // 帰無分布の表示範囲 [-AXIS, AXIS]
const BINS = 33;

const COLOR_A = "#2563eb";
const COLOR_B = "#dc2626";
const COLOR_NULL = "#94a3b8";
const COLOR_OBS = "#16a34a";

// p = 並べ替え帰無分布で |差|≥|観測差| の割合。p の項に id を付け、操作で差し込み＋ハイライト。
const FORMULA = `p=\\dfrac{\\#\\{|\\Delta_{\\text{並べ替え}}|\\ge|\\Delta_{\\text{観測}}|\\}}{N}=${term("p", "p")}`;

export function PermutationTestLab() {
  const shift = useNonparamStore((s) => s.controls.shift);
  const { groupA, groupB, observedDiff, nullDist, p } = useNonparamStore((s) => s.derived);
  const setControl = useNonparamStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("p", formatNumber(p, 3));
    m.setHighlight("p", true, p < 0.05 ? "#16a34a" : "#dc2626");
  }, [p]);

  const hist = useMemo(
    () => histogram(nullDist, { min: -AXIS, max: AXIS, bins: BINS }),
    [nullDist],
  );
  const maxCount = Math.max(...hist.map((b) => b.count), 1);
  const plotW = W - PAD.left - PAD.right;
  const plotH = HIST_H - PAD.top - PAD.bottom;
  const toX = (v: number) => PAD.left + ((v + AXIS) / (2 * AXIS)) * plotW;
  const toY = (c: number) => PAD.top + (1 - c / maxCount) * plotH;
  const barW = plotW / BINS;
  const obsX = toX(Math.max(-AXIS, Math.min(AXIS, observedDiff)));

  // 2群のドットプロット用レンジ。
  const all = [...groupA, ...groupB];
  const dmin = Math.min(...all) - 0.5;
  const dmax = Math.max(...all) + 0.5;
  const dotX = (v: number) => PAD.left + ((v - dmin) / (dmax - dmin)) * plotW;

  return (
    <div
      id="nonparam-operation"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <div className="space-y-1">
        <label htmlFor="np-shift" className="text-sm font-semibold text-slate-700">
          群Aの底上げ shift = {formatNumber(shift)}（観測平均差 Δ={formatNumber(observedDiff)}）
        </label>
        <input
          id="np-shift"
          type="range"
          min={0}
          max={3}
          step={0.1}
          value={shift}
          onChange={(e) => setControl("shift", Number(e.target.value))}
          className="w-full accent-blue-600"
          aria-label="群Aの底上げ"
        />
      </div>

      {/* 2群のドットプロット */}
      <svg
        viewBox={`0 0 ${W} 52`}
        className="h-auto w-full"
        role="img"
        aria-label="2群のデータ"
        data-testid="np-dots"
      >
        {groupB.map((v, i) => (
          <circle key={`b${i}`} cx={dotX(v)} cy={36} r={4} fill={COLOR_B} opacity={0.7} />
        ))}
        {groupA.map((v, i) => (
          <circle key={`a${i}`} cx={dotX(v)} cy={16} r={4} fill={COLOR_A} opacity={0.7} />
        ))}
        <text x={PAD.left} y={14} className="fill-blue-700 text-[9px] font-semibold">
          群A
        </text>
        <text x={PAD.left} y={50} className="fill-red-700 text-[9px] font-semibold">
          群B
        </text>
      </svg>

      {/* 並べ替え帰無分布 */}
      <p className="text-xs text-slate-500">
        並べ替え帰無分布（ラベルをランダムに割り直した平均差, {nullDist.length}回）と観測差（緑）
      </p>
      <svg
        viewBox={`0 0 ${W} ${HIST_H}`}
        className="h-auto w-full"
        role="img"
        aria-label="並べ替え帰無分布"
        data-testid="np-null"
      >
        {hist.map((b, i) => {
          const inTail = Math.abs((b.x0 + b.x1) / 2) >= Math.abs(observedDiff) - 1e-9;
          return (
            <rect
              key={i}
              x={toX(b.x0)}
              y={toY(b.count)}
              width={barW}
              height={toY(0) - toY(b.count)}
              fill={inTail ? COLOR_OBS : COLOR_NULL}
              opacity={inTail ? 0.5 : 0.45}
            />
          );
        })}
        <line
          id="observed"
          x1={obsX}
          y1={PAD.top}
          x2={obsX}
          y2={toY(0)}
          stroke={COLOR_OBS}
          strokeWidth={2}
        />
        <text
          x={obsX}
          y={PAD.top - 1}
          textAnchor="middle"
          className="fill-green-700 text-[10px] font-semibold"
        >
          観測 Δ={formatNumber(observedDiff)}
        </text>
      </svg>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>
      <p className="text-center font-mono text-sm">
        p = {formatNumber(p, 3)}{" "}
        <span className={p < 0.05 ? "text-green-700" : "text-red-600"}>
          → {p < 0.05 ? "有意（差あり）" : "有意でない"}
        </span>
      </p>

      <Callout
        title="並べ替え検定：分布を仮定せず «観測がどれだけ端か» を数える"
        body={`2群を合併しラベルをランダムに割り直すと «差がない» 世界の平均差の分布（灰）ができる。観測差 ${formatNumber(
          observedDiff,
        )} 以上に極端な並べ替えの割合が p=${formatNumber(p, 3)}（緑の裾）。`}
        note="正規性などを仮定しないので小標本・歪んだデータにも使える。t 検定が仮定を置くのに対し、並べ替えはデータ自身から帰無分布を作る。"
        kind="explain"
      />
    </div>
  );
}
