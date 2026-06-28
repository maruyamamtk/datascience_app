"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { score } from "@/lib/stats/discriminant";
import { useLdaStore } from "@/lib/store/discriminant-analysis";

const W = 320;
const H = 240;
const CX = W / 2;
const CY = H / 2;
const SCALE = 24;

const COLOR_1 = "#dc2626";
const COLOR_2 = "#2563eb";
const COLOR_AXIS = "#7c3aed";
const COLOR_BOUND = "#0f766e";

// 誤判別率。err の項に id を付け、操作で差し込み＋ハイライト。
const FORMULA = `\\text{誤判別率}=\\dfrac{\\text{誤分類数}}{n}=${term("err", "?")}`;

export function LdaLab() {
  const separation = useLdaStore((s) => s.controls.separation);
  const { g1, g2, lda, confusion } = useLdaStore((s) => s.derived);
  const setControl = useLdaStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("err", formatNumber(confusion.errorRate * 100, 1) + "\\%");
    m.setHighlight("err", true, confusion.errorRate < 0.1 ? "#16a34a" : "#dc2626");
  }, [confusion.errorRate]);

  const toX = (x: number) => CX + x * SCALE;
  const toY = (y: number) => CY - y * SCALE;

  // 判別軸（方向 w）。
  const [wx, wy] = lda.direction;
  const axLen = 90;

  // 決定境界: score(p)=threshold ⇔ wx·x + wy·y = t。境界は w に直交。
  // 境界上の1点 p0 = threshold·w（w は単位ベクトル）。方向 t_dir = (−wy, wx)。
  const p0x = lda.threshold * wx;
  const p0y = lda.threshold * wy;
  const tdx = -wy;
  const tdy = wx;
  const bLen = 8;

  return (
    <div id="lda-operation" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="space-y-1">
        <label htmlFor="lda-sep" className="text-sm font-semibold text-slate-700">
          2クラスの隔たり separation = {formatNumber(separation)}（大きいほど分けやすい）
        </label>
        <input
          id="lda-sep"
          type="range"
          min={0}
          max={8}
          step={0.2}
          value={separation}
          onChange={(e) => setControl("separation", Number(e.target.value))}
          className="w-full accent-violet-600"
          aria-label="2クラスの隔たり"
        />
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="判別分析"
        data-testid="lda-plot"
      >
        <line x1={0} y1={CY} x2={W} y2={CY} stroke="#f5f5f5" />
        <line x1={CX} y1={0} x2={CX} y2={H} stroke="#f5f5f5" />
        {/* 決定境界（緑） */}
        <line
          x1={toX(p0x - tdx * bLen)}
          y1={toY(p0y - tdy * bLen)}
          x2={toX(p0x + tdx * bLen)}
          y2={toY(p0y + tdy * bLen)}
          stroke={COLOR_BOUND}
          strokeWidth={2.5}
          strokeDasharray="5 3"
        />
        {/* 判別軸（紫） */}
        <line
          x1={CX - wx * axLen}
          y1={CY + wy * axLen}
          x2={CX + wx * axLen}
          y2={CY - wy * axLen}
          stroke={COLOR_AXIS}
          strokeWidth={1.5}
        />
        {/* データ点（誤分類は縁取り） */}
        {g1.map((p, i) => {
          const correct =
            score(p, lda.direction) >= lda.threshold ===
            score(lda.mean1, lda.direction) >= lda.threshold;
          return (
            <circle
              key={`a${i}`}
              cx={toX(p.x)}
              cy={toY(p.y)}
              r={3}
              fill={COLOR_1}
              opacity={0.7}
              stroke={correct ? "none" : "#000"}
              strokeWidth={correct ? 0 : 1}
            />
          );
        })}
        {g2.map((p, i) => {
          const correct =
            score(p, lda.direction) >= lda.threshold !==
            score(lda.mean1, lda.direction) >= lda.threshold;
          return (
            <circle
              key={`b${i}`}
              cx={toX(p.x)}
              cy={toY(p.y)}
              r={3}
              fill={COLOR_2}
              opacity={0.7}
              stroke={correct ? "none" : "#000"}
              strokeWidth={correct ? 0 : 1}
            />
          );
        })}
        <text x={6} y={14} className="fill-red-600 text-[9px] font-semibold">
          ● クラス1
        </text>
        <text x={70} y={14} className="fill-blue-600 text-[9px] font-semibold">
          ● クラス2
        </text>
        <text x={W - 70} y={14} className="fill-teal-700 text-[9px]">
          - - 判別境界
        </text>
      </svg>

      {/* 混同行列 */}
      <div className="grid grid-cols-3 gap-1 text-center text-xs">
        <div />
        <div className="font-semibold text-slate-500">→ 1と判定</div>
        <div className="font-semibold text-slate-500">→ 2と判定</div>
        <div className="font-semibold text-red-600">実際1</div>
        <div className="rounded bg-green-50 py-1 font-mono text-green-700">
          {confusion.correct1}
        </div>
        <div className="rounded bg-red-50 py-1 font-mono text-red-600">{confusion.wrong1}</div>
        <div className="font-semibold text-blue-600">実際2</div>
        <div className="rounded bg-red-50 py-1 font-mono text-red-600">{confusion.wrong2}</div>
        <div className="rounded bg-green-50 py-1 font-mono text-green-700">
          {confusion.correct2}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>
      <p className="text-center font-mono text-sm">
        誤判別率 = {formatNumber(confusion.errorRate * 100, 1)}%{" "}
        <span className={confusion.errorRate < 0.1 ? "text-green-700" : "text-red-600"}>
          → {confusion.errorRate < 0.1 ? "よく分離" : "重なりあり"}
        </span>
      </p>

      <Callout
        title="フィッシャー線形判別：2群を最もよく分ける軸＋境界"
        body={`判別方向 w∝Σ_w⁻¹(μ1−μ2)（紫）に射影し、しきい値（緑の境界）で分類する。隔たり separation=${formatNumber(
          separation,
        )} を上げると2群が離れ、誤判別率=${formatNumber(confusion.errorRate * 100, 1)}% が下がる。縁取りの点は誤分類。`}
        note="判別軸は «群間の隔たり／群内のばらつき» を最大化する方向。PCAが «分散最大» を探すのに対し、LDAは «クラス分離最大» を探す。共分散が群で違うと2次判別（QDA）。"
        kind="explain"
      />
    </div>
  );
}
