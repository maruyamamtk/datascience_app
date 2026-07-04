"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { useAbStore } from "@/lib/store/ab-testing";

// 必要標本サイズと検出力を実時間で差し込み＋ハイライト。
const FORMULA = `n=\\frac{\\left(z_{\\alpha/2}\\sqrt{2\\bar p\\bar q}+z_{\\beta}\\sqrt{p_0q_0+p_1q_1}\\right)^2}{\\delta^2}=${term("reqn", "?")}\\ (/群),\\quad 1-\\beta=${term("pow", "?")}`;

function pct(v: number, d = 1): string {
  return `${formatNumber(v * 100, d)}%`;
}

export function AbTestLab() {
  const controls = useAbStore((s) => s.controls);
  const { p1, relativeLift, requiredN, achievedPower, sufficient, z } = useAbStore((s) => s.derived);
  const setControl = useAbStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("reqn", requiredN.toLocaleString());
    m.setValue("pow", pct(achievedPower, 1));
    m.setHighlight("reqn", true, "#2563eb");
    m.setHighlight("pow", true, achievedPower >= controls.targetPower ? "#059669" : "#dc2626");
  }, [requiredN, achievedPower, controls.targetPower]);

  const powerPctW = Math.min(100, Math.max(0, achievedPower * 100));
  const targetPctW = Math.min(100, controls.targetPower * 100);

  return (
    <div id="ab-operation" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Slider id="ab-base" label={`ベースライン率 p₀ = ${pct(controls.baseline)}`} min={0.01} max={0.5} step={0.01} value={controls.baseline} onChange={(v) => setControl("baseline", v)} />
        <Slider id="ab-mde" label={`最小検出効果 MDE δ = ${pct(controls.mde)}（→ p₁=${pct(p1)}, 相対 +${formatNumber(relativeLift * 100, 0)}%）`} min={0.005} max={0.15} step={0.005} value={controls.mde} onChange={(v) => setControl("mde", v)} />
        <Slider id="ab-n" label={`実際の標本サイズ n = ${controls.n.toLocaleString()} /群`} min={100} max={20000} step={100} value={controls.n} onChange={(v) => setControl("n", v)} />
        <div className="grid grid-cols-2 gap-2">
          <Select id="ab-alpha" label="有意水準 α" value={controls.alpha} options={[0.01, 0.05, 0.1]} fmt={(v) => v.toString()} onChange={(v) => setControl("alpha", v)} />
          <Select id="ab-pow" label="目標検出力" value={controls.targetPower} options={[0.7, 0.8, 0.9]} fmt={(v) => pct(v, 0)} onChange={(v) => setControl("targetPower", v)} />
        </div>
      </div>

      {/* 必要 n と 実際の n の比較 */}
      <div className="rounded-xl bg-slate-50 px-4 py-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
          <span>必要標本サイズ（1群あたり）</span>
          <span className={sufficient ? "text-emerald-600" : "text-red-600"}>{sufficient ? "✓ 足りている" : "✗ 不足"}</span>
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs">
          <span className="w-14 text-slate-500">必要</span>
          <div className="h-4 flex-1 rounded bg-slate-200">
            <div className="h-full rounded bg-blue-500" style={{ width: "100%" }} />
          </div>
          <span className="w-20 text-right font-mono text-slate-700">{requiredN.toLocaleString()}</span>
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs">
          <span className="w-14 text-slate-500">実際</span>
          <div className="h-4 flex-1 rounded bg-slate-200">
            <div className={`h-full rounded ${sufficient ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${Math.min(100, (controls.n / requiredN) * 100)}%` }} />
          </div>
          <span className="w-20 text-right font-mono text-slate-700">{controls.n.toLocaleString()}</span>
        </div>
      </div>

      {/* 検出力ゲージ */}
      <div className="rounded-xl bg-slate-50 px-4 py-3">
        <p className="mb-1 text-xs font-semibold text-slate-600">この n での検出力（1−β）</p>
        <div className="relative h-4 w-full rounded bg-slate-200">
          <div className={`h-full rounded ${achievedPower >= controls.targetPower ? "bg-emerald-500" : "bg-red-400"}`} style={{ width: `${powerPctW}%` }} />
          <div className="absolute top-0 h-4 border-l-2 border-dashed border-slate-600" style={{ left: `${targetPctW}%` }} title="目標検出力" />
        </div>
        <p className="mt-1 text-[10px] text-slate-400">破線＝目標検出力 {pct(controls.targetPower, 0)}。実際 {pct(achievedPower, 1)}</p>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>

      <Callout
        title="標本サイズ設計：検出したい効果が小さいほど大量に要る"
        body={`ベースライン ${pct(controls.baseline)} を +${pct(controls.mde)}（相対 +${formatNumber(relativeLift * 100, 0)}%）動かす効果を α=${controls.alpha}・検出力 ${pct(controls.targetPower, 0)} で検出するには1群あたり ${requiredN.toLocaleString()} 標本が必要。実際の n=${controls.n.toLocaleString()} での検出力は ${pct(achievedPower, 1)}。${sufficient ? "十分。" : "不足——検出力が目標に届かず、本当は差があっても見逃しやすい。"}`}
        note={`必要 n は効果 δ の2乗に反比例（δ を半分にすると n は約4倍）。相対リフトが小さい «わずかな改善» の検証は桁違いの標本を要する。実際の想定率どおりなら z≈${formatNumber(z, 1)}。標本サイズは «実験前に» 決め、途中で覗いて止めないのが鉄則（下の覗き見ステッパー参照）。`}
        kind="explain"
      />
    </div>
  );
}

function Slider({ id, label, min, max, step, value, onChange }: { id: string; label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-semibold text-slate-700">{label}</label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-blue-600" />
    </div>
  );
}

function Select({ id, label, value, options, fmt, onChange }: { id: string; label: string; value: number; options: number[]; fmt: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-semibold text-slate-700">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
        {options.map((o) => (
          <option key={o} value={o}>{fmt(o)}</option>
        ))}
      </select>
    </div>
  );
}
