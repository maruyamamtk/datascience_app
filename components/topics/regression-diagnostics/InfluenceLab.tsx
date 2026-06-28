"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { useDiagStore } from "@/lib/store/regression-diagnostics";

const W = 360;
const H = 200;
const PAD = { top: 12, right: 14, bottom: 24, left: 28 };
const X_MIN = 0;
const X_MAX = 12;
const Y_MIN = -2;
const Y_MAX = 22;

const COLOR_PT = "#94a3b8";
const COLOR_MOVE = "#dc2626";
const COLOR_LINE = "#2563eb";
const COLOR_LINE0 = "#16a34a";

// てこ比 h = 1/n + (x−x̄)²/Sxx。h の項に id を付け、点の移動で差し込み＋ハイライト。
const FORMULA = `h=\\dfrac1n+\\dfrac{(x-\\bar x)^2}{S_{xx}}=${term("h", "h")}\\quad\\text{標準化残差}=${term(
  "sr",
  "r",
)}`;

export function InfluenceLab() {
  const { px, py } = useDiagStore((s) => s.controls);
  const { x, y, slope, intercept, slopeWithout, leverageP, stdResidP } = useDiagStore(
    (s) => s.derived,
  );
  const setControl = useDiagStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("h", formatNumber(leverageP, 2));
    m.setValue("sr", formatNumber(stdResidP, 1));
    m.setHighlight("h", true, leverageP > 0.5 ? "#dc2626" : "#2563eb");
    m.setHighlight("sr", true, Math.abs(stdResidP) > 2 ? "#dc2626" : "#16a34a");
  }, [leverageP, stdResidP]);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const toX = (v: number) => PAD.left + ((v - X_MIN) / (X_MAX - X_MIN)) * plotW;
  const toY = (v: number) => PAD.top + (1 - (v - Y_MIN) / (Y_MAX - Y_MIN)) * plotH;

  // 直線（あり/なし）を端点で。
  const lineY = (s: number, b: number, xv: number) => b + s * xv;
  const interceptWithout = (() => {
    // y = a + slopeWithout x の切片を基準データから。基準は y≈x なので簡便に算出。
    const bx = x.slice(0, -1);
    const by = y.slice(0, -1);
    const mx = bx.reduce((a, b) => a + b, 0) / bx.length;
    const my = by.reduce((a, b) => a + b, 0) / by.length;
    return my - slopeWithout * mx;
  })();

  return (
    <div id="diag-operation" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        赤い点を動かす（x で てこ比、y で 外れ具合）。青線＝点込み、緑破線＝点を除いた回帰
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="影響点と回帰直線"
        data-testid="influence-plot"
      >
        <line x1={PAD.left} y1={toY(0)} x2={W - PAD.right} y2={toY(0)} stroke="#eef2f7" />
        {/* 点を除いた回帰（緑破線） */}
        <line
          x1={toX(X_MIN)}
          y1={toY(lineY(slopeWithout, interceptWithout, X_MIN))}
          x2={toX(X_MAX)}
          y2={toY(lineY(slopeWithout, interceptWithout, X_MAX))}
          stroke={COLOR_LINE0}
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
        {/* 点込み回帰（青実線） */}
        <line
          x1={toX(X_MIN)}
          y1={toY(lineY(slope, intercept, X_MIN))}
          x2={toX(X_MAX)}
          y2={toY(lineY(slope, intercept, X_MAX))}
          stroke={COLOR_LINE}
          strokeWidth={2.5}
        />
        {/* 基準点 */}
        {x.slice(0, -1).map((xi, i) => (
          <circle key={i} cx={toX(xi)} cy={toY(y[i])} r={3.5} fill={COLOR_PT} />
        ))}
        {/* 可動点 */}
        <circle cx={toX(px)} cy={toY(py)} r={6} fill={COLOR_MOVE} />
      </svg>

      {/* 可動点の操作 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="dg-x" className="text-xs font-semibold text-slate-700">
            点の x = {formatNumber(px)}
          </label>
          <input
            id="dg-x"
            type="range"
            min={1}
            max={12}
            step={0.5}
            value={px}
            onChange={(e) => setControl("px", Number(e.target.value))}
            className="w-full accent-red-600"
            aria-label="点のx"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="dg-y" className="text-xs font-semibold text-slate-700">
            点の y = {formatNumber(py)}
          </label>
          <input
            id="dg-y"
            type="range"
            min={-2}
            max={22}
            step={0.5}
            value={py}
            onChange={(e) => setControl("py", Number(e.target.value))}
            className="w-full accent-red-600"
            aria-label="点のy"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>
      <p className="text-center font-mono text-sm">
        てこ比 h={formatNumber(leverageP, 2)}・標準化残差={formatNumber(stdResidP, 1)}・傾き{" "}
        {formatNumber(slope)}（除外時 {formatNumber(slopeWithout)}）
      </p>

      <Callout
        title="てこ比×外れ＝影響点：回帰直線を引っ張る点"
        body={`赤点の てこ比 h=${formatNumber(
          leverageP,
          2,
        )}（x が平均から遠いほど大）と 標準化残差 ${formatNumber(
          stdResidP,
          1,
        )}（直線から外れるほど大）。両方が大きい «影響点» は、青線（点込み）を緑破線（点なし）から大きくずらす。`}
        note="x を端に置き y を大きく外すと、たった1点で傾きが変わるのが見える。てこ比が高い外れ値ほど危険（標準化残差 |>2|・てこ比 高 が要注意）。"
        kind="explain"
      />
    </div>
  );
}
