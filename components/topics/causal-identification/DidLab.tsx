"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { useDidStore } from "@/lib/store/causal-identification";

// DID =（処置群の変化）−（対照群の変化）。4つの群平均と DID を実時間で差し込み＋ハイライト。
const FORMULA = `\\text{DID}=\\underbrace{(${term("ta", "?")}-${term("tb", "?")})}_{\\text{処置群の変化}}-\\underbrace{(${term("ca", "?")}-${term("cb", "?")})}_{\\text{対照群の変化}}=${term("did", "?")}`;

const W = 360;
const H = 220;
const PAD = 36;

export function DidLab() {
  const controls = useDidStore((s) => s.controls);
  const { cells, did, counterfactual, bias } = useDidStore((s) => s.derived);
  const setControl = useDidStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("ta", formatNumber(cells.treatedAfter, 1));
    m.setValue("tb", formatNumber(cells.treatedBefore, 1));
    m.setValue("ca", formatNumber(cells.controlAfter, 1));
    m.setValue("cb", formatNumber(cells.controlBefore, 1));
    m.setValue("did", formatNumber(did, 2));
    m.setHighlight("did", true, "#7c3aed");
    m.setHighlight("ta", true, "#dc2626");
    m.setHighlight("ca", true, "#2563eb");
  }, [cells, did]);

  // y ドメイン。
  const ys = [cells.treatedBefore, cells.treatedAfter, cells.controlBefore, cells.controlAfter, counterfactual];
  const yMin = Math.min(...ys) - 2;
  const yMax = Math.max(...ys) + 2;
  const xa = PAD;
  const xb = W - PAD;
  const sy = (v: number) => H - PAD - ((v - yMin) / (yMax - yMin)) * (H - 2 * PAD);

  return (
    <div id="did-operation" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Slider id="did-eff" label={`真の処置効果 = ${formatNumber(controls.trueEffect, 1)}`} min={-4} max={8} step={0.5} value={controls.trueEffect} onChange={(v) => setControl("trueEffect", v)} />
        <Slider id="did-trend" label={`共通の時間トレンド = ${formatNumber(controls.commonTrend, 1)}`} min={-4} max={8} step={0.5} value={controls.commonTrend} onChange={(v) => setControl("commonTrend", v)} />
        <Slider id="did-viol" label={`平行トレンドの破れ = ${formatNumber(controls.parallelViolation, 1)}`} min={-4} max={4} step={0.5} value={controls.parallelViolation} onChange={(v) => setControl("parallelViolation", v)} />
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-md" role="img" aria-label="DID の2期×2群の折れ線">
          {/* 軸ラベル */}
          <text x={xa} y={H - 12} textAnchor="middle" className="fill-slate-500 text-[10px]">介入前</text>
          <text x={xb} y={H - 12} textAnchor="middle" className="fill-slate-500 text-[10px]">介入後</text>
          <line x1={xa} y1={PAD} x2={xa} y2={H - PAD} className="stroke-slate-200" />
          <line x1={xb} y1={PAD} x2={xb} y2={H - PAD} className="stroke-slate-200" strokeDasharray="2 2" />

          {/* 対照群（青） */}
          <line x1={xa} y1={sy(cells.controlBefore)} x2={xb} y2={sy(cells.controlAfter)} className="stroke-blue-500" strokeWidth={2.5} />
          {/* 処置群の反事実（平行トレンド, 灰破線） */}
          <line x1={xa} y1={sy(cells.treatedBefore)} x2={xb} y2={sy(counterfactual)} className="stroke-slate-400" strokeWidth={2} strokeDasharray="5 4" />
          {/* 処置群（赤） */}
          <line x1={xa} y1={sy(cells.treatedBefore)} x2={xb} y2={sy(cells.treatedAfter)} className="stroke-red-500" strokeWidth={2.5} />

          {/* DID のギャップ（処置群後 と 反事実後） */}
          <line x1={xb} y1={sy(counterfactual)} x2={xb} y2={sy(cells.treatedAfter)} className="stroke-violet-600" strokeWidth={3} />
          <text x={xb - 6} y={(sy(counterfactual) + sy(cells.treatedAfter)) / 2} textAnchor="end" className="fill-violet-700 text-[10px] font-semibold">DID={formatNumber(did, 1)}</text>

          {/* 点 */}
          {[[xa, cells.treatedBefore], [xb, cells.treatedAfter]].map(([x, v], i) => (
            <circle key={`t${i}`} cx={x} cy={sy(v)} r={4} className="fill-red-500" />
          ))}
          {[[xa, cells.controlBefore], [xb, cells.controlAfter]].map(([x, v], i) => (
            <circle key={`c${i}`} cx={x} cy={sy(v)} r={4} className="fill-blue-500" />
          ))}
          <circle cx={xb} cy={sy(counterfactual)} r={4} className="fill-slate-400" />
        </svg>
      </div>
      <div className="flex justify-center gap-4 text-[11px]">
        <span className="text-red-600">● 処置群</span>
        <span className="text-blue-600">● 対照群</span>
        <span className="text-slate-500">● 反事実（平行トレンド）</span>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-center text-xs">
        <Stat value={formatNumber(did, 2)} label="DID 推定" tone="violet" />
        <Stat value={formatNumber(bias, 2)} label="バイアス（DID−真の効果）" tone={Math.abs(bias) > 0.3 ? "red" : "slate"} />
      </div>

      <Callout
        title="差の差分法：対照群の変化を «共通の時間変化» の代理に使う"
        body={`処置群の変化 ${formatNumber(cells.treatedAfter - cells.treatedBefore, 1)} には «処置の効果» と «時代の変化» が混ざる。対照群の変化 ${formatNumber(cells.controlAfter - cells.controlBefore, 1)} を «処置がなくても起きた変化» として差し引くと、DID=${formatNumber(did, 2)}。${Math.abs(bias) < 0.3 ? "平行トレンドが成り立つので真の効果と一致。" : `平行トレンドが破れているため真値から ${formatNumber(bias, 2)} ズレている。`}`}
        note="灰破線＝«もし処置がなければ処置群も対照群と平行に動いたはず» の反事実。実測（赤の終点）との縦の差が DID。«平行トレンド» が破れる（処置群だけ別の時間変化）と、そのズレがそのままバイアスになる——これが DID の要（かなめ）の仮定。"
        kind="explain"
      />
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

function Slider({ id, label, min, max, step, value, onChange }: { id: string; label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-semibold text-slate-700">{label}</label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-violet-600" />
    </div>
  );
}
