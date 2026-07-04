"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { N, useForecastStore, WEIGHT_COUNT } from "@/lib/store/time-series-forecasting";

// 指数平滑化 ℓ_t = α y_t + (1−α) ℓ_{t-1}。α と 1−α と RMSE を実時間で差し込み。
const FORMULA = `\\hat y_{t+1}=\\ell_t=${term("a", "\\alpha")}\\,y_t+${term("b", "(1-\\alpha)")}\\,\\ell_{t-1},\\quad \\mathrm{RMSE}=${term("rmse", "?")}`;

const W = 340;
const H = 130;
const PAD = { top: 10, right: 8, bottom: 8, left: 8 };

function path(vals: number[], toX: (i: number) => number, toY: (v: number) => number): string {
  return vals.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
}

export function ForecastLab() {
  const alpha = useForecastStore((s) => s.controls.alpha);
  const { series, smoothing, oneStepRmse, weights } = useForecastStore((s) => s.derived);
  const setControl = useForecastStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("a", formatNumber(alpha, 2));
    m.setValue("b", `(${formatNumber(1 - alpha, 2)})`);
    m.setValue("rmse", formatNumber(oneStepRmse, 3));
    m.setHighlight("a", true, "#0d9488");
    m.setHighlight("rmse", true, "#dc2626");
  }, [alpha, oneStepRmse]);

  const lo = Math.min(...series, ...smoothing.level);
  const hi = Math.max(...series, ...smoothing.level);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const toX = (i: number) => PAD.left + (i / (N - 1)) * plotW;
  const toY = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo || 1)) * plotH;

  const maxW = Math.max(...weights);

  return (
    <div id="forecast-operation" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="space-y-1">
        <label htmlFor="fc-alpha" className="text-sm font-semibold text-slate-700">
          平滑化係数 α = {formatNumber(alpha, 2)}（大きいほど直近重視・小さいほど滑らか）
        </label>
        <input id="fc-alpha" type="range" min={0.05} max={1} step={0.05} value={alpha} onChange={(e) => setControl("alpha", Number(e.target.value))} className="w-full accent-teal-600" aria-label="平滑化係数α" />
      </div>

      {/* 系列＋平滑化 */}
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="観測と平滑化" data-testid="fc-plot">
        <path d={path(series, toX, toY)} fill="none" stroke="#94a3b8" strokeWidth={1} opacity={0.8} />
        <path d={path(smoothing.level, toX, toY)} fill="none" stroke="#0d9488" strokeWidth={2} />
      </svg>
      <div className="flex justify-center gap-4 text-[10px] text-slate-500">
        <span><span className="text-slate-400">━</span> 観測 y_t</span>
        <span><span className="text-teal-600">━</span> 平滑化 ℓ_t（＝1期先予測）</span>
      </div>

      {/* 重み減衰 */}
      <div>
        <p className="mb-1 text-[10px] font-semibold text-slate-600">過去への重み α(1−α)^j（幾何級数で減衰）</p>
        <div className="flex items-end gap-0.5" style={{ height: 40 }} data-testid="fc-weights">
          {weights.map((w, j) => (
            <div key={j} className="flex-1 rounded-t bg-teal-500" style={{ height: `${(w / maxW) * 100}%` }} title={`j=${j}: ${w.toFixed(3)}`} />
          ))}
        </div>
        <div className="flex justify-between text-[8px] text-slate-400">
          <span>今</span>
          <span>{WEIGHT_COUNT}期前</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>

      <Callout
        title="指数平滑化：直近ほど重く、過去は幾何級数的に軽く"
        body={`次の予測 ŷ_{t+1} は «前の予測 ℓ_{t-1}» を «新しい実測 y_t» で α=${formatNumber(alpha, 2)} だけ更新する。展開すると過去の観測に α(1−α)^j の重みがかかり、直近ほど重く古いほど指数的に軽い。1期先予測の RMSE=${formatNumber(oneStepRmse, 3)}。`}
        note="α を大きくすると直近に強く反応（ノイズも拾う）、小さくすると滑らかだが変化への追従が遅れる。RMSE が最小になる α を探すのがチューニング。単純SESは水平予測なのでトレンドには Holt 法（傾きも平滑化）が要る。"
        kind="explain"
      />
    </div>
  );
}
