"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { useCausalStore } from "@/lib/store/causal-inference-models";

// 素朴比較 = 真のATE + 交絡バイアス。3つの数値を実時間で差し込み＋ハイライト。
const FORMULA = `\\underbrace{${term("naive", "?")}}_{\\text{素朴比較}}=\\underbrace{${term("ate", "?")}}_{\\text{真のATE}}+\\underbrace{${term("bias", "?")}}_{\\text{交絡バイアス}}`;

/** バー1本（値→高さ、色）。基準線に真の ATE を重ねる。 */
function Bar({ value, max, label, tone, target }: { value: number; max: number; label: string; tone: string; target: number }) {
  const h = Math.max(2, (Math.abs(value) / max) * 100);
  const targetTop = 100 - (Math.abs(target) / max) * 100;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-[100px] w-14 rounded bg-slate-100">
        <div
          className="absolute bottom-0 w-full rounded"
          style={{ height: `${h}%`, background: tone }}
        />
        <div
          className="absolute left-0 w-full border-t-2 border-dashed border-emerald-500"
          style={{ top: `${targetTop}%` }}
          title="真の ATE"
        />
      </div>
      <div className="font-mono text-sm font-semibold text-slate-800">{formatNumber(value, 2)}</div>
      <div className="text-center text-[10px] leading-tight text-slate-500">{label}</div>
    </div>
  );
}

export function CausalLab() {
  const controls = useCausalStore((s) => s.controls);
  const { trueAte, naive, bias, adjusted, balance } = useCausalStore((s) => s.derived);
  const setControl = useCausalStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("naive", formatNumber(naive, 2));
    m.setValue("ate", formatNumber(trueAte, 2));
    m.setValue("bias", formatNumber(bias, 2));
    m.setHighlight("naive", true, "#dc2626");
    m.setHighlight("ate", true, "#059669");
    m.setHighlight("bias", Math.abs(bias) > 0.3, Math.abs(bias) > 0.3 ? "#d97706" : "#64748b");
  }, [naive, trueAte, bias]);

  const barMax = Math.max(3, Math.abs(naive), Math.abs(trueAte), Math.abs(adjusted)) * 1.15;
  const imbalance = balance.treatedX - balance.controlX;

  return (
    <div id="causal-operation" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      {/* 操作系 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Slider id="cs-tau" label={`真の処置効果 τ = ${formatNumber(controls.tau, 1)}`} min={-4} max={6} step={0.5} value={controls.tau} onChange={(v) => setControl("tau", v)} />
        <Slider id="cs-conf" label={`交絡の強さ = ${formatNumber(controls.confounderEffect, 1)}`} min={0} max={10} step={0.5} value={controls.confounderEffect} onChange={(v) => setControl("confounderEffect", v)} />
        <Slider id="cs-sel" label={`割り当ての偏り = ${formatNumber(controls.selection, 2)}`} min={0} max={0.9} step={0.05} value={controls.selection} onChange={(v) => setControl("selection", v)} disabled={controls.randomized} />
        <div className="flex items-end">
          <button
            type="button"
            role="switch"
            aria-checked={controls.randomized}
            onClick={() => setControl("randomized", !controls.randomized)}
            className={`w-full rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              controls.randomized
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {controls.randomized ? "✓ 無作為割り当て（RCT）" : "無作為化する（RCT）"}
          </button>
        </div>
      </div>

      {/* 3つの推定量 vs 真の ATE */}
      <div className="flex items-end justify-center gap-6 rounded-xl bg-slate-50 px-4 py-4">
        <Bar value={naive} max={barMax} label="素朴比較 E[Y|T=1]−E[Y|T=0]" tone="#dc2626" target={trueAte} />
        <Bar value={trueAte} max={barMax} label="真の ATE（神の視点）" tone="#059669" target={trueAte} />
        <Bar value={adjusted} max={barMax} label="層別調整" tone="#2563eb" target={trueAte} />
      </div>
      <p className="text-center text-[10px] text-slate-400">緑の破線＝真の ATE。素朴比較（赤）が破線からズレるほど交絡バイアスが大きい。層別調整（青）は破線に戻る。</p>

      {/* 数式（強連動） */}
      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>

      {/* 共変量バランス */}
      <div className="rounded-xl bg-white px-4 py-3">
        <p className="mb-1 text-xs font-semibold text-slate-600">共変量バランス（交絡変数 x の群平均）</p>
        <div className="flex items-center gap-3 text-xs">
          <span className="w-16 text-slate-500">処置群</span>
          <div className="h-3 flex-1 rounded bg-slate-100">
            <div className="h-full rounded bg-rose-400" style={{ width: `${balance.treatedX * 100}%` }} />
          </div>
          <span className="w-10 text-right font-mono text-slate-700">{formatNumber(balance.treatedX, 2)}</span>
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs">
          <span className="w-16 text-slate-500">対照群</span>
          <div className="h-3 flex-1 rounded bg-slate-100">
            <div className="h-full rounded bg-sky-400" style={{ width: `${balance.controlX * 100}%` }} />
          </div>
          <span className="w-10 text-right font-mono text-slate-700">{formatNumber(balance.controlX, 2)}</span>
        </div>
        <p className="mt-1 text-[10px] text-slate-400">
          差 {formatNumber(imbalance, 2)}：{Math.abs(imbalance) < 0.08 ? "ほぼ均衡（群が同質）" : "不均衡（処置群と対照群が別物の集団）"}
        </p>
      </div>

      <Callout
        title="相関≠因果：交絡バイアス = 素朴比較 − 真の ATE"
        body={`真の ATE=${formatNumber(trueAte, 2)} に対し、観測から素朴に計算した群間差は ${formatNumber(naive, 2)}。差 ${formatNumber(bias, 2)} が交絡バイアス。${controls.randomized ? "無作為化により処置群と対照群が同質になり、素朴比較がほぼ真値に一致する。" : `交絡変数（重症度）が «処置の受けやすさ» と «結果» の両方に効くため処置群と対照群が別物の集団になり、群間差が真の効果から${bias > 0.3 ? "上振れ" : bias < -0.3 ? "下振れ" : "ほぼズレず"}する。`}`}
        note={`層別調整＝«同じ x の中» で比べると ${formatNumber(adjusted, 2)} と真値近くに戻る。交絡を強める（交絡の強さ↑・割り当ての偏り↑）ほど素朴比較のズレが拡大。無作為化トグルを入れると偏りが消え、素朴比較でも因果が測れることを確かめよう。`}
        kind="explain"
      />
    </div>
  );
}

function Slider({ id, label, min, max, step, value, onChange, disabled }: { id: string; label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div className={`space-y-1 ${disabled ? "opacity-40" : ""}`}>
      <label htmlFor={id} className="text-xs font-semibold text-slate-700">{label}</label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-blue-600" />
    </div>
  );
}
