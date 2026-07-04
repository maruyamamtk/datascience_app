"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import {
  FORECAST_STEPS,
  MAX_LAG,
  N,
  useTSModelStore,
} from "@/lib/store/time-series-models";

// AR(1): x_t = φ·x_{t-1} + e_t。φ と分散 σ²/(1−φ²) を実時間で差し込み＋ハイライト。
const FORMULA = `x_t=${term("phi", "\\phi")}\\,x_{t-1}+e_t,\\quad \\rho(k)=${term("phik", "\\phi^k")},\\quad \\mathrm{Var}=${term("var", "?")}`;

const W = 340;
const H = 120;
const PAD = { top: 10, right: 8, bottom: 8, left: 8 };
const AW = 340;
const AH = 110;

function path(vals: number[], toX: (i: number) => number, toY: (v: number) => number): string {
  return vals.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
}

export function TSModelLab() {
  const { phi, sigma } = useTSModelStore((s) => s.controls);
  const { series, theoreticalAcf, sampleAcf, variance, forecast } = useTSModelStore((s) => s.derived);
  const setControl = useTSModelStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("phi", formatNumber(phi, 2));
    m.setValue("var", formatNumber(variance, 2));
    m.setHighlight("phi", true, "#7c3aed");
    m.setHighlight("phik", Math.abs(phi) > 0.02, "#2563eb");
    m.setHighlight("var", true, "#0891b2");
  }, [phi, variance]);

  // 系列＋予測プロット。
  const full = [...series, ...forecast];
  const lo = Math.min(...full);
  const hi = Math.max(...full);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const total = N + FORECAST_STEPS;
  const toX = (i: number) => PAD.left + (i / (total - 1)) * plotW;
  const toY = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo || 1)) * plotH;

  // ACFプロット。
  const acW = AW - PAD.left - PAD.right;
  const acH = AH - PAD.top - PAD.bottom;
  const barW = acW / (MAX_LAG + 1);
  const aX = (k: number) => PAD.left + k * barW + barW / 2;
  const aY = (r: number) => PAD.top + acH / 2 - (r * acH) / 2;

  return (
    <div id="tsmodel-operation" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="tm-phi" className="text-xs font-semibold text-slate-700">
            AR係数 φ = {formatNumber(phi, 2)}（1に近いほど長い記憶）
          </label>
          <input id="tm-phi" type="range" min={-0.95} max={0.95} step={0.05} value={phi} onChange={(e) => setControl("phi", Number(e.target.value))} className="w-full accent-violet-600" aria-label="AR係数φ" />
        </div>
        <div className="space-y-1">
          <label htmlFor="tm-sigma" className="text-xs font-semibold text-slate-700">
            ショック σ = {formatNumber(sigma, 1)}
          </label>
          <input id="tm-sigma" type="range" min={0.5} max={3} step={0.1} value={sigma} onChange={(e) => setControl("sigma", Number(e.target.value))} className="w-full accent-cyan-600" aria-label="ショックσ" />
        </div>
      </div>

      {/* 系列＋予測 */}
      <div>
        <p className="mb-1 text-[10px] font-semibold text-slate-600">AR(1) 標本パスと予測（φ^h で平均へ減衰）</p>
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="AR(1)パス" data-testid="tsmodel-series">
          <line x1={PAD.left} y1={toY(0)} x2={W - PAD.right} y2={toY(0)} stroke="#e2e8f0" />
          <path d={path(series, toX, toY)} fill="none" stroke="#7c3aed" strokeWidth={1.2} />
          <path d={path(forecast, (i) => toX(N - 1 + i), toY)} fill="none" stroke="#f97316" strokeWidth={2} strokeDasharray="4 2" />
        </svg>
      </div>

      {/* 理論 vs 標本 ACF */}
      <div>
        <p className="mb-1 text-[10px] font-semibold text-slate-600">自己相関 ρ(k)：理論 φ^k（線）と標本（棒）</p>
        <svg viewBox={`0 0 ${AW} ${AH}`} className="h-auto w-full" role="img" aria-label="自己相関" data-testid="tsmodel-acf">
          <line x1={PAD.left} y1={aY(0)} x2={AW - PAD.right} y2={aY(0)} stroke="#cbd5e1" />
          {sampleAcf.map((r, k) => (
            <line key={k} x1={aX(k)} y1={aY(0)} x2={aX(k)} y2={aY(r)} stroke="#94a3b8" strokeWidth={1.5} />
          ))}
          <path d={path(theoreticalAcf, aX, aY)} fill="none" stroke="#2563eb" strokeWidth={1.5} />
          {theoreticalAcf.map((r, k) => (
            <circle key={k} cx={aX(k)} cy={aY(r)} r={1.4} fill="#2563eb" />
          ))}
        </svg>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>

      <Callout
        title="AR(1)：前の値を φ 倍して受け継ぐ"
        body={`自己回帰 AR(1) は直前の値に φ=${formatNumber(phi, 2)} を掛けて次の値を作る。理論自己相関は ρ(k)=φ^k で、φ が1に近いほど «ゆっくり» 減衰＝長い記憶。理論分散は σ²/(1−φ²)=${formatNumber(variance, 2)}。`}
        note={`φ>0 は滑らかにうねり、φ<0 はジグザグ（ACFの符号が交互）。予測（橙破線）は x̂_{t+h}=φ^h·x_t で平均(0)へ減衰し、地平線とともに «情報が薄れる»。|φ|→1 で非定常（ランダムウォーク）に近づき分散が発散する。`}
        kind="explain"
      />
    </div>
  );
}
