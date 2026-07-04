"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { N, useTimeSeriesStore } from "@/lib/store/time-series-basics";

// 加法分解 x_t = トレンド + 季節 + 不規則。各成分の «寄与» を数式にハイライト。
const FORMULA = `x_t=${term("tr", "T_t")}+${term("se", "S_t")}+${term("no", "e_t")}`;

const W = 340;
const H = 150;
const PAD = { top: 10, right: 8, bottom: 20, left: 8 };

/** 値の配列を SVG パス文字列に。 */
function toPath(vals: number[], toX: (i: number) => number, toY: (v: number) => number): string {
  return vals.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
}

export function TimeSeriesLab() {
  const { slope, amp, noiseSd, window } = useTimeSeriesStore((s) => s.controls);
  const { parts, smoothed, rawVar, smoothedVar } = useTimeSeriesStore((s) => s.derived);
  const setControl = useTimeSeriesStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    // 各成分の «強さ» をハイライト（大きいほど濃く見せる代わりに色オン/オフ）。
    m.setHighlight("tr", Math.abs(slope) > 0.001, "#f59e0b");
    m.setHighlight("se", amp > 0.05, "#2563eb");
    m.setHighlight("no", noiseSd > 0.05, "#ef4444");
  }, [slope, amp, noiseSd]);

  const all = [...parts.value, ...smoothed];
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const toX = (i: number) => PAD.left + (i / (N - 1)) * plotW;
  const toY = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo || 1)) * plotH;

  return (
    <div id="ts-operation" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="grid grid-cols-2 gap-3">
        <Slider id="ts-slope" label={`トレンド傾き ${formatNumber(slope, 2)}`} min={-0.3} max={0.3} step={0.01} value={slope} onChange={(v) => setControl("slope", v)} accent="accent-amber-500" />
        <Slider id="ts-amp" label={`季節振幅 ${formatNumber(amp, 1)}`} min={0} max={6} step={0.2} value={amp} onChange={(v) => setControl("amp", v)} accent="accent-blue-600" />
        <Slider id="ts-noise" label={`ノイズ ${formatNumber(noiseSd, 1)}`} min={0} max={3} step={0.1} value={noiseSd} onChange={(v) => setControl("noiseSd", v)} accent="accent-red-500" />
        <Slider id="ts-window" label={`移動平均窓 ${Math.round(window) | 1}`} min={1} max={21} step={2} value={window} onChange={(v) => setControl("window", v)} accent="accent-emerald-600" />
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="時系列プロット" data-testid="ts-plot">
        <line x1={PAD.left} y1={toY(parts.trend[0])} x2={W - PAD.right} y2={toY(parts.trend[N - 1])} stroke="#f59e0b" strokeWidth={1} strokeDasharray="4 3" opacity={0.7} />
        <path d={toPath(parts.value, toX, toY)} fill="none" stroke="#94a3b8" strokeWidth={1} opacity={0.8} />
        <path d={toPath(smoothed, toX, toY)} fill="none" stroke="#059669" strokeWidth={2} />
      </svg>
      <div className="flex justify-center gap-4 text-[10px] text-slate-500">
        <span><span className="text-slate-400">━</span> 観測系列 x_t</span>
        <span><span className="text-emerald-600">━</span> 移動平均</span>
        <span><span className="text-amber-500">┄</span> トレンド</span>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-center text-xs">
        <div className="rounded-lg bg-slate-100 px-2 py-2">
          <div className="font-mono text-base text-slate-700">{formatNumber(rawVar, 2)}</div>
          <div className="text-slate-500">元系列の分散 γ(0)</div>
        </div>
        <div className="rounded-lg bg-emerald-50 px-2 py-2">
          <div className="font-mono text-base text-emerald-700">{formatNumber(smoothedVar, 2)}</div>
          <div className="text-slate-500">移動平均後の分散</div>
        </div>
      </div>

      <Callout
        title="時系列 = トレンド + 季節 + 不規則"
        body={`観測系列を «右上がりの傾向（トレンド T_t）»・«周期的な波（季節 S_t、周期12）»・«ランダムなゆらぎ（不規則 e_t）» の重ね合わせと見る。移動平均（窓${Math.round(window) | 1}）は e_t の «ギザギザ» を均し、分散を ${formatNumber(rawVar, 2)}→${formatNumber(smoothedVar, 2)} に下げてトレンド＋季節を浮かび上がらせる。`}
        note="ノイズを上げると系列は荒れるが移動平均は滑らかなまま。窓を広げるほど平滑化が強まる（ただし季節の山も削れる）。傾きがあると平均が時間で動く＝非定常。"
        kind="explain"
      />
    </div>
  );
}

function Slider({ id, label, min, max, step, value, onChange, accent }: { id: string; label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void; accent: string }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-semibold text-slate-700">{label}</label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className={`w-full ${accent}`} aria-label={label} />
    </div>
  );
}
