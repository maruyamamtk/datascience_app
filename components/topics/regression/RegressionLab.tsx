"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { makeSamplePoints } from "@/lib/stats/regression";
import { mulberry32 } from "@/lib/stats/random";
import { useRegressionStore } from "@/lib/store/regression";

// 回帰係数 β̂1=Sxy/Sxx。Sxy・Sxx・β̂1 項に id を付け、操作のたびに現在値を差し込み＋ハイライト。
const FORMULA = `\\hat\\beta_1=\\dfrac{\\sum(x-\\bar x)(y-\\bar y)}{\\sum(x-\\bar x)^2}=\\dfrac{${term(
  "sxy",
  "S_{xy}",
)}}{${term("sxx", "S_{xx}")}}=${term("beta1", "\\hat\\beta_1")}`;

// データ座標の固定軸（ドラッグ・直線描画の基準）。
const X_MIN = 0;
const X_MAX = 10;
const Y_MIN = 0;
const Y_MAX = 14;

const SLOPE_MIN = -1;
const SLOPE_MAX = 3;
const INTERCEPT_MIN = -2;
const INTERCEPT_MAX = 10;

const W = 380;
const H = 260;
const PAD = { top: 14, right: 14, bottom: 28, left: 30 };
const CHART_W = W - PAD.left - PAD.right;
const CHART_H = H - PAD.top - PAD.bottom;

const COLOR_MANUAL = "#2563eb"; // 手動直線
const COLOR_OLS = "#16a34a"; // 最小二乗解
const COLOR_RESIDUAL = "#f59e0b"; // 残差縦線
const COLOR_SXY = "#7c3aed";
const COLOR_SXX = "#2563eb";
const COLOR_BETA = "#16a34a";

/**
 * 単回帰 操作ラボ（描画層 / Control 層）。
 * 散布図の点をドラッグして動かす／手動直線の傾き・切片をスライダーで操作すると、各点の残差が縦線で描かれ、
 * 残差平方和 RSS が実時間更新される。最小二乗解（緑の直線）を併置し「OLS が RSS を最小化する」「外れ値が
 * 係数を引っ張る」を体感させる。同時に数式 β̂1=Sxy/Sxx の項へ現在値を差し込み＋ハイライトする
 * （操作→グラフ→数式の強連動, 受け入れ条件）。操作値は useRegressionStore が single source of truth。
 */
export function RegressionLab() {
  const points = useRegressionStore((s) => s.controls.points);
  const slope = useRegressionStore((s) => s.controls.slope);
  const intercept = useRegressionStore((s) => s.controls.intercept);
  const { olsSlope, olsIntercept, olsRss, r2, sxy, sxx, manualRss } = useRegressionStore(
    (s) => s.derived,
  );
  const setControl = useRegressionStore((s) => s.setControl);

  const [showOls, setShowOls] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<number | null>(null);
  const rngRef = useRef(mulberry32((Date.now() & 0xffffffff) >>> 0));

  // 数式の項を差し込み＋ハイライト（全体再描画はせず TermController で DOM 差分パッチ）。
  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const c = mathRef.current;
    if (!c) return;
    c.setValue("sxy", formatNumber(sxy));
    c.setValue("sxx", formatNumber(sxx));
    c.setValue("beta1", formatNumber(olsSlope));
    c.setHighlight("sxy", true, COLOR_SXY);
    c.setHighlight("sxx", true, COLOR_SXX);
    c.setHighlight("beta1", true, COLOR_BETA);
  }, [sxy, sxx, olsSlope]);

  const toX = (x: number) => PAD.left + ((x - X_MIN) / (X_MAX - X_MIN)) * CHART_W;
  const toY = (y: number) => PAD.top + (1 - (y - Y_MIN) / (Y_MAX - Y_MIN)) * CHART_H;

  // ポインタ座標 → データ座標（ドラッグ用の逆変換）。
  const toData = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const vbX = ((clientX - rect.left) / rect.width) * W;
    const vbY = ((clientY - rect.top) / rect.height) * H;
    const x = X_MIN + ((vbX - PAD.left) / CHART_W) * (X_MAX - X_MIN);
    const y = Y_MIN + (1 - (vbY - PAD.top) / CHART_H) * (Y_MAX - Y_MIN);
    return {
      x: Math.max(X_MIN, Math.min(X_MAX, x)),
      y: Math.max(Y_MIN, Math.min(Y_MAX, y)),
    };
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const i = dragRef.current;
      if (i === null) return;
      const d = toData(e.clientX, e.clientY);
      if (!d) return;
      const next = points.map((p, idx) => (idx === i ? d : p));
      setControl("points", next);
    },
    [points, setControl, toData],
  );

  const endDrag = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // capture が無い場合は無視。
    }
  }, []);

  const drawNewData = () => {
    const pts = makeSamplePoints({
      a: 1,
      b: 1,
      noise: 1.2,
      n: 9,
      xMin: 1,
      xMax: 9,
      rng: rngRef.current,
    });
    setControl("points", pts);
  };

  const lineY = (x: number, m: number, b: number) => m * x + b;

  return (
    <div
      id="regression-operation"
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5"
    >
      {/* 散布図 + 手動直線 + 残差 + OLS 直線 */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none select-none"
        role="img"
        aria-label="散布図と回帰直線・残差"
        data-testid="regression-plot"
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        {/* 軸 */}
        <line x1={toX(X_MIN)} y1={toY(Y_MIN)} x2={toX(X_MAX)} y2={toY(Y_MIN)} stroke="#cbd5e1" />
        <line x1={toX(X_MIN)} y1={toY(Y_MIN)} x2={toX(X_MIN)} y2={toY(Y_MAX)} stroke="#cbd5e1" />
        <text x={toX(X_MAX)} y={toY(Y_MIN) + 18} textAnchor="end" className="fill-slate-400 text-[10px]">
          x
        </text>
        <text x={toX(X_MIN) - 6} y={toY(Y_MAX) + 4} textAnchor="end" className="fill-slate-400 text-[10px]">
          y
        </text>

        {/* 残差縦線（点 → 手動直線） */}
        {points.map((p, i) => (
          <line
            key={`r${i}`}
            x1={toX(p.x)}
            y1={toY(p.y)}
            x2={toX(p.x)}
            y2={toY(lineY(p.x, slope, intercept))}
            stroke={COLOR_RESIDUAL}
            strokeWidth={1.5}
            strokeDasharray="3 2"
          />
        ))}

        {/* 最小二乗解（緑・任意表示） */}
        {showOls && Number.isFinite(olsSlope) ? (
          <line
            x1={toX(X_MIN)}
            y1={toY(lineY(X_MIN, olsSlope, olsIntercept))}
            x2={toX(X_MAX)}
            y2={toY(lineY(X_MAX, olsSlope, olsIntercept))}
            stroke={COLOR_OLS}
            strokeWidth={2}
          />
        ) : null}

        {/* 手動直線（青） */}
        <line
          x1={toX(X_MIN)}
          y1={toY(lineY(X_MIN, slope, intercept))}
          x2={toX(X_MAX)}
          y2={toY(lineY(X_MAX, slope, intercept))}
          stroke={COLOR_MANUAL}
          strokeWidth={2}
        />

        {/* データ点（ドラッグ可能） */}
        {points.map((p, i) => (
          <circle
            key={`p${i}`}
            cx={toX(p.x)}
            cy={toY(p.y)}
            r={6}
            fill="#fff"
            stroke="#1e293b"
            strokeWidth={2}
            className="cursor-grab"
            onPointerDown={(e) => {
              dragRef.current = i;
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
          />
        ))}
      </svg>

      <p className="text-center text-xs text-slate-500">
        点をドラッグして動かせます（外れ値を作ると最小二乗解＝緑がどう引っ張られるか見てみよう）。
      </p>

      {/* 傾き・切片スライダー */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="reg-slope" className="text-sm font-semibold text-slate-700">
            手動直線の傾き
          </label>
          <span className="font-mono text-sm" style={{ color: COLOR_MANUAL }}>
            {formatNumber(slope)}
          </span>
        </div>
        <input
          id="reg-slope"
          type="range"
          min={SLOPE_MIN}
          max={SLOPE_MAX}
          step={0.05}
          value={slope}
          onChange={(e) => setControl("slope", Number(e.target.value))}
          className="w-full accent-blue-600"
          aria-label="手動直線の傾き"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="reg-intercept" className="text-sm font-semibold text-slate-700">
            手動直線の切片
          </label>
          <span className="font-mono text-sm" style={{ color: COLOR_MANUAL }}>
            {formatNumber(intercept)}
          </span>
        </div>
        <input
          id="reg-intercept"
          type="range"
          min={INTERCEPT_MIN}
          max={INTERCEPT_MAX}
          step={0.1}
          value={intercept}
          onChange={(e) => setControl("intercept", Number(e.target.value))}
          className="w-full accent-blue-600"
          aria-label="手動直線の切片"
        />
      </div>

      {/* ボタン群 */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setControl("slope", Number(formatNumber(olsSlope)));
            setControl("intercept", Number(formatNumber(olsIntercept)));
          }}
          className="rounded-lg border border-green-500 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 transition hover:bg-green-100"
        >
          最小二乗解に合わせる
        </button>
        <button
          type="button"
          onClick={() => setShowOls((v) => !v)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
        >
          {showOls ? "最小二乗解を隠す" : "最小二乗解を表示"}
        </button>
        <button
          type="button"
          onClick={drawNewData}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
        >
          新しいデータを引く
        </button>
      </div>

      {/* 強連動する数式（Sxy・Sxx・β̂1 に現在値を差し込み＋ハイライト） */}
      <div className="rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>

      {/* 数値パネル（手動 RSS vs 最小 RSS / R²） */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <Metric label="手動直線の RSS" value={formatNumber(manualRss)} color={COLOR_MANUAL} />
        <Metric label="最小 RSS（OLS）" value={formatNumber(olsRss)} color={COLOR_OLS} />
        <Metric label="決定係数 R²" value={formatNumber(r2)} color="#7c3aed" />
      </div>

      <Callout
        title="最小二乗解で残差平方和が最小になる"
        body={`いまの手動直線の RSS=${formatNumber(manualRss)} に対し、最小二乗解の RSS=${formatNumber(
          olsRss,
        )}（必ず手動 ≥ 最小）。残差（橙の縦線）の二乗和を最も小さくする直線が最小二乗解＝緑の線です。`}
        note="「最小二乗解に合わせる」を押すと手動直線が緑に重なり RSS が最小値に一致します。点をドラッグして外れ値を作ると、緑の線が外れ値側へ引っ張られます。"
        kind="explain"
      />

      <p className="text-xs leading-relaxed text-slate-500">
        ヒント: <span style={{ color: COLOR_SXY }}>Sxy</span> /{" "}
        <span style={{ color: COLOR_SXX }}>Sxx</span> が <span style={{ color: COLOR_BETA }}>β̂1</span>{" "}
        を決めます。点を動かすと数式の値も同時に追従します。
      </p>
    </div>
  );
}

/** 数値パネルの 1 セル。 */
function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="font-mono text-base font-semibold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
