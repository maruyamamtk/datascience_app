"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { useAnovaStore } from "@/lib/store/analysis-of-variance";

const W = 360;
const H = 190;
const PAD = { top: 14, right: 14, bottom: 24, left: 30 };
const Y_MIN = 4;
const Y_MAX = 16;

const GROUP_COLORS = ["#2563eb", "#16a34a", "#dc2626"];

// F=MS_between/MS_within, p。F・p の項に id を付け、操作で差し込み＋ハイライト。
const FORMULA = `F=\\dfrac{\\text{MS}_{\\text{級間}}}{\\text{MS}_{\\text{級内}}}=${term("f", "F")},\\quad p=${term(
  "p",
  "p",
)}`;

export function AnovaLab() {
  const separation = useAnovaStore((s) => s.controls.separation);
  const { groups, anova } = useAnovaStore((s) => s.derived);
  const setControl = useAnovaStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("f", formatNumber(anova.F, 2));
    m.setValue("p", formatNumber(anova.p, 3));
    m.setHighlight("f", true, "#7c3aed");
    m.setHighlight("p", true, anova.p < 0.05 ? "#16a34a" : "#dc2626");
  }, [anova.F, anova.p]);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const bandW = plotW / groups.length;
  const toY = (v: number) => PAD.top + (1 - (v - Y_MIN) / (Y_MAX - Y_MIN)) * plotH;
  const grandY = toY(anova.grandMean);

  return (
    <div
      id="anova-operation"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <div className="space-y-1">
        <label htmlFor="av-sep" className="text-sm font-semibold text-slate-700">
          群平均の隔たり separation = {formatNumber(separation)}（群間の差の大きさ）
        </label>
        <input
          id="av-sep"
          type="range"
          min={0}
          max={4}
          step={0.1}
          value={separation}
          onChange={(e) => setControl("separation", Number(e.target.value))}
          className="w-full accent-violet-600"
          aria-label="群平均の隔たり"
        />
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="3群のデータと変動"
        data-testid="anova-plot"
      >
        {/* 総平均線（級間変動の基準） */}
        <line
          id="total"
          x1={PAD.left}
          y1={grandY}
          x2={W - PAD.right}
          y2={grandY}
          stroke="#94a3b8"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
        <text
          x={W - PAD.right}
          y={grandY - 2}
          textAnchor="end"
          className="fill-slate-500 text-[8px]"
        >
          総平均
        </text>
        {groups.map((g, j) => {
          const cx = PAD.left + j * bandW + bandW / 2;
          const gm = anova.groupMeans[j];
          return (
            <g key={j}>
              {/* 群平均線（級内変動の基準） */}
              <line
                x1={cx - bandW * 0.35}
                y1={toY(gm)}
                x2={cx + bandW * 0.35}
                y2={toY(gm)}
                stroke={GROUP_COLORS[j]}
                strokeWidth={2}
              />
              {g.map((y, i) => (
                <circle
                  key={i}
                  cx={cx + (i - g.length / 2) * 6}
                  cy={toY(y)}
                  r={3}
                  fill={GROUP_COLORS[j]}
                  opacity={0.6}
                />
              ))}
              <text
                x={cx}
                y={H - 8}
                textAnchor="middle"
                className="text-[9px]"
                fill={GROUP_COLORS[j]}
              >
                群{j + 1}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>
      <p className="text-center font-mono text-sm">
        SS級間={formatNumber(anova.ssBetween, 1)}・SS級内={formatNumber(anova.ssWithin, 1)}・F=
        {formatNumber(anova.F, 2)}・p={formatNumber(anova.p, 3)}{" "}
        <span className={anova.p < 0.05 ? "text-green-700" : "text-red-600"}>
          → {anova.p < 0.05 ? "群間に差あり" : "差とは言えない"}
        </span>
      </p>

      <Callout
        title="分散分析：群間の差を «群内のばらつき» と比べる"
        body={`群平均の隔たりを大きくすると 級間変動 SS級間=${formatNumber(
          anova.ssBetween,
          1,
        )} が増え、F=MS級間/MS級内=${formatNumber(
          anova.F,
          2,
        )} が跳ね上がる。群内のばらつき（誤差）SS級内=${formatNumber(anova.ssWithin, 1)} は separation で変わらない。`}
        note="F が大きい＝«群の差は偶然のばらつきでは説明できない»。t 検定の3群以上への一般化。p<0.05 でどれかの群が違う（どの群かは多重比較で）。"
        kind="explain"
      />
    </div>
  );
}
