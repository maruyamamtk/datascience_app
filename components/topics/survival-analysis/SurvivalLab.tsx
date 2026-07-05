"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { MAX_TIME, useSurvivalStore } from "@/lib/store/survival-analysis";
import { type KMStep } from "@/lib/stats/survival";

// ログランク χ²・p値・ハザード比を実時間で差し込み＋ハイライト。
const FORMULA = `\\chi^2_{\\text{logrank}}=\\frac{(O_A-E_A)^2}{V}=${term("chi", "?")},\\quad p=${term("p", "?")},\\quad \\text{HR}=${term("hr", "?")}`;

const W = 360;
const H = 210;
const PAD = 34;
const round2 = (v: number) => Math.round(v * 100) / 100;

/** KM ステップ列を SVG のパス（右連続の階段）に。 */
function kmPath(steps: KMStep[], sx: (t: number) => number, sy: (s: number) => number): string {
  let d = `M ${sx(0)} ${sy(1)}`;
  let prev = 1;
  for (const st of steps) {
    d += ` L ${sx(st.time)} ${sy(prev)} L ${sx(st.time)} ${sy(st.survival)}`;
    prev = st.survival;
  }
  d += ` L ${sx(MAX_TIME)} ${sy(prev)}`;
  return d;
}

export function SurvivalLab() {
  const controls = useSurvivalStore((s) => s.controls);
  const { kmA, kmB, medianA, medianB, hazardRatio, censored, logrank } = useSurvivalStore((s) => s.derived);
  const setControl = useSurvivalStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("chi", formatNumber(logrank.chi2, 2));
    m.setValue("p", formatNumber(logrank.pValue, 4));
    m.setValue("hr", formatNumber(hazardRatio, 2));
    m.setHighlight("chi", true, "#7c3aed");
    m.setHighlight("p", logrank.pValue < 0.05, logrank.pValue < 0.05 ? "#dc2626" : "#64748b");
    m.setHighlight("hr", true, "#0891b2");
  }, [logrank, hazardRatio]);

  const sx = (t: number) => round2(PAD + (Math.min(t, MAX_TIME) / MAX_TIME) * (W - 2 * PAD));
  const sy = (s: number) => round2(H - PAD - s * (H - 2 * PAD));

  return (
    <div id="survival-operation" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Slider id="sv-ha" label={`群A ハザード = ${formatNumber(controls.hazardA, 2)}`} min={0.1} max={1} step={0.05} value={controls.hazardA} onChange={(v) => setControl("hazardA", v)} accent="accent-blue-600" />
        <Slider id="sv-hb" label={`群B ハザード = ${formatNumber(controls.hazardB, 2)}`} min={0.1} max={1} step={0.05} value={controls.hazardB} onChange={(v) => setControl("hazardB", v)} accent="accent-rose-600" />
        <Slider id="sv-c" label={`打ち切り率 = ${formatNumber(controls.censorRate, 2)}`} min={0} max={0.6} step={0.02} value={controls.censorRate} onChange={(v) => setControl("censorRate", v)} accent="accent-slate-500" />
      </div>

      {/* KM 曲線 */}
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-md" role="img" aria-label="カプラン–マイヤー生存曲線（2群）">
          {/* 軸 */}
          <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} className="stroke-slate-300" />
          <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} className="stroke-slate-300" />
          {[0, 0.5, 1].map((s) => (
            <g key={s}>
              <line x1={PAD} y1={sy(s)} x2={W - PAD} y2={sy(s)} className="stroke-slate-100" />
              <text x={PAD - 4} y={sy(s) + 3} textAnchor="end" className="fill-slate-400 text-[8px]">{s}</text>
            </g>
          ))}
          <text x={W / 2} y={H - 8} textAnchor="middle" className="fill-slate-400 text-[9px]">時間 t</text>
          {/* 中央値ライン */}
          <line x1={PAD} y1={sy(0.5)} x2={W - PAD} y2={sy(0.5)} className="stroke-slate-300" strokeDasharray="3 3" />
          {/* 曲線 */}
          <path d={kmPath(kmB, sx, sy)} fill="none" className="stroke-rose-500" strokeWidth={2} />
          <path d={kmPath(kmA, sx, sy)} fill="none" className="stroke-blue-500" strokeWidth={2} />
          {/* 打ち切り記号（+）を各群の曲線上に */}
          {kmA.filter((s) => s.censored > 0).map((s, i) => (
            <text key={`ca${i}`} x={sx(s.time)} y={sy(s.survival) - 2} textAnchor="middle" className="fill-blue-400 text-[8px]">+</text>
          ))}
          {kmB.filter((s) => s.censored > 0).map((s, i) => (
            <text key={`cb${i}`} x={sx(s.time)} y={sy(s.survival) - 2} textAnchor="middle" className="fill-rose-400 text-[8px]">+</text>
          ))}
        </svg>
      </div>
      <div className="flex justify-center gap-4 text-[11px]">
        <span className="text-blue-600">― 群A（中央値 {Number.isFinite(medianA) ? formatNumber(medianA, 1) : "未到達"}）</span>
        <span className="text-rose-600">― 群B（中央値 {Number.isFinite(medianB) ? formatNumber(medianB, 1) : "未到達"}）</span>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <Stat value={formatNumber(logrank.chi2, 2)} label="ログランク χ²" tone="violet" />
        <Stat value={formatNumber(logrank.pValue, 4)} label="p値" tone={logrank.pValue < 0.05 ? "red" : "slate"} />
        <Stat value={`${formatNumber(censored * 100, 0)}%`} label="打ち切り割合" tone="slate" />
      </div>

      <Callout
        title="カプラン–マイヤー：打ち切りを活かして生存曲線を描く"
        body={`群A（ハザード ${formatNumber(controls.hazardA, 2)}）と群B（${formatNumber(controls.hazardB, 2)}）の生存曲線。ハザード比 HR=${formatNumber(hazardRatio, 2)}。ログランク検定は χ²=${formatNumber(logrank.chi2, 2)}、p=${formatNumber(logrank.pValue, 4)}。${logrank.pValue < 0.05 ? "p<0.05 で2群の生存に有意差あり。" : "p≥0.05 で有意差は言えない。"}`}
        note={`曲線は «イベントのたびに» 段差を作る階段関数。+ 記号は打ち切り（その時点まで生存の情報を使い、段差は作らない）。中央値は S(t)=0.5 を切る時刻。2群のハザードを近づけると曲線が重なり χ² が下がる。打ち切り率を上げると段差が疎になり、後半の推定が不安定になる。`}
        kind="explain"
      />
    </div>
  );
}

function Slider({ id, label, min, max, step, value, onChange, accent }: { id: string; label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void; accent: string }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-semibold text-slate-700">{label}</label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className={`w-full ${accent}`} />
    </div>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone: "violet" | "red" | "slate" }) {
  const bg = { violet: "bg-violet-50 text-violet-700", red: "bg-red-50 text-red-700", slate: "bg-slate-100 text-slate-700" }[tone];
  return (
    <div className={`rounded-lg px-2 py-2 ${bg}`}>
      <div className="font-mono text-base">{value}</div>
      <div className="text-slate-500">{label}</div>
    </div>
  );
}
