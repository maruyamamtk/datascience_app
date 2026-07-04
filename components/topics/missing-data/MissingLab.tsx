"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { useMissingStore } from "@/lib/store/missing-data";
import type { Mechanism } from "@/lib/stats/missing";

// 完全ケースのバイアス = 完全ケース平均 − 真の平均。実時間で差し込み＋ハイライト。
const FORMULA = `\\text{バイアス}=\\underbrace{${term("cc", "?")}}_{\\text{完全ケース}}-\\underbrace{${term("tr", "?")}}_{\\text{真値}}=${term("bias", "?")}`;

const MECHANISMS: { key: Mechanism; label: string; desc: string }[] = [
  { key: "MCAR", label: "MCAR", desc: "完全にランダム（X,Y と無関係）" },
  { key: "MAR", label: "MAR", desc: "観測変数 X に依存" },
  { key: "MNAR", label: "MNAR", desc: "欠測する Y 自身に依存" },
];

const W = 340;
const H = 180;
const PAD = 28;

const TONES = ["#059669", "#dc2626", "#f59e0b", "#2563eb", "#7c3aed"];

export function MissingLab() {
  const controls = useMissingStore((s) => s.controls);
  const { units, observedFrac, estimates, trueMean, trueSd } = useMissingStore((s) => s.derived);
  const setControl = useMissingStore((s) => s.setControl);

  const cc = estimates[1];
  const bias = cc.mean - trueMean;

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("cc", formatNumber(cc.mean, 2));
    m.setValue("tr", formatNumber(trueMean, 2));
    m.setValue("bias", formatNumber(bias, 2));
    m.setHighlight("bias", true, Math.abs(bias) > 0.2 ? "#dc2626" : "#059669");
    m.setHighlight("cc", true, "#dc2626");
    m.setHighlight("tr", true, "#059669");
  }, [cc.mean, trueMean, bias]);

  // 散布図ドメイン。
  const xs = units.map((u) => u.x);
  const ys = units.map((u) => u.yTrue);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  // 座標は小数2桁に丸める（Box-Muller の transcendental が server/client で 1ULP 違い、
  // 未丸めだと SVG 属性の末尾桁がズレてハイドレーション不一致になるのを防ぐ）。
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const sx = (x: number) => round2(PAD + ((x - xMin) / (xMax - xMin)) * (W - 2 * PAD));
  const sy = (y: number) => round2(H - PAD - ((y - yMin) / (yMax - yMin)) * (H - 2 * PAD));

  const meanMax = Math.max(...estimates.map((e) => e.mean)) * 1.05;
  const sdMax = Math.max(...estimates.map((e) => e.sd), trueSd) * 1.1;

  return (
    <div id="missing-operation" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      {/* メカニズム選択 */}
      <div className="grid grid-cols-3 gap-2">
        {MECHANISMS.map((mech) => (
          <button
            key={mech.key}
            type="button"
            onClick={() => setControl("mechanism", mech.key)}
            aria-pressed={controls.mechanism === mech.key}
            className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${
              controls.mechanism === mech.key ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {mech.label}
          </button>
        ))}
      </div>
      <p className="text-center text-[10px] text-slate-400">{MECHANISMS.find((m) => m.key === controls.mechanism)?.desc}・観測割合 {formatNumber(observedFrac * 100, 0)}%</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="md-rate" className="text-xs font-semibold text-slate-700">欠測率 = {formatNumber(controls.missRate * 100, 0)}%</label>
          <input id="md-rate" type="range" min={0.1} max={0.7} step={0.05} value={controls.missRate} onChange={(e) => setControl("missRate", Number(e.target.value))} className="w-full accent-blue-600" />
        </div>
        <div className="space-y-1">
          <label htmlFor="md-str" className="text-xs font-semibold text-slate-700">依存の強さ = {formatNumber(controls.strength, 2)}</label>
          <input id="md-str" type="range" min={0} max={0.45} step={0.05} value={controls.strength} onChange={(e) => setControl("strength", Number(e.target.value))} className="w-full accent-blue-600" disabled={controls.mechanism === "MCAR"} />
        </div>
      </div>

      {/* 散布図（欠測点を灰に） */}
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-md" role="img" aria-label="X と Y の散布図（欠測点は灰）">
          <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} className="stroke-slate-200" />
          <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} className="stroke-slate-200" />
          <text x={W / 2} y={H - 6} textAnchor="middle" className="fill-slate-400 text-[9px]">X（補助変数・常に観測）</text>
          {units.map((u, i) => (
            <circle key={i} cx={sx(u.x)} cy={sy(u.yTrue)} r={2} className={u.observed ? "fill-blue-500" : "fill-slate-300"} opacity={u.observed ? 0.6 : 0.5} />
          ))}
          {/* 真の平均線・完全ケース平均線 */}
          <line x1={PAD} y1={sy(trueMean)} x2={W - PAD} y2={sy(trueMean)} className="stroke-emerald-500" strokeWidth={1.5} strokeDasharray="4 3" />
          <line x1={PAD} y1={sy(cc.mean)} x2={W - PAD} y2={sy(cc.mean)} className="stroke-red-500" strokeWidth={1.5} strokeDasharray="4 3" />
        </svg>
      </div>
      <div className="flex justify-center gap-4 text-[10px]">
        <span className="text-blue-600">● 観測</span>
        <span className="text-slate-400">● 欠測（本当は存在）</span>
        <span className="text-emerald-600">― 真の平均</span>
        <span className="text-red-600">― 完全ケース平均</span>
      </div>

      {/* 推定平均バー */}
      <div className="space-y-1 rounded-xl bg-slate-50 px-4 py-3">
        <p className="text-xs font-semibold text-slate-600">Y の推定平均（真値＝緑）</p>
        {estimates.map((e, i) => (
          <EstBar key={e.label} label={e.label} value={e.mean} max={meanMax} tone={TONES[i]} ref0={trueMean} />
        ))}
      </div>

      {/* SD バー */}
      <div className="space-y-1 rounded-xl bg-slate-50 px-4 py-3">
        <p className="text-xs font-semibold text-slate-600">Y の推定ばらつき SD（真値＝{formatNumber(trueSd, 2)}）</p>
        {estimates.map((e, i) => (
          <EstBar key={e.label} label={e.label} value={e.sd} max={sdMax} tone={TONES[i]} ref0={trueSd} unit="" />
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>

      <Callout
        title="欠測メカニズムで «使える手» が変わる"
        body={`いまは ${controls.mechanism}。完全ケース分析の平均は ${formatNumber(cc.mean, 2)}、真値 ${formatNumber(trueMean, 2)}、バイアス ${formatNumber(bias, 2)}。${
          controls.mechanism === "MCAR"
            ? "MCAR では欠測が完全にランダムなので完全ケースでもほぼ不偏。"
            : controls.mechanism === "MAR"
              ? "MAR では観測 X に欠測が依存するので完全ケースは偏るが、X を使う回帰代入で平均が回復する。"
              : "MNAR では欠測が Y 自身に依存するので、観測変数だけの回帰代入でもバイアスが残る（要・感度分析やモデル化）。"
        }`}
        note="平均代入は平均を保つがばらつきを縮める（分散の過小評価）。回帰代入は平均を回復するがばらつきは足りず、確率的回帰代入（＝多重代入の1手）で残差を足すとばらつきも戻る。欠測率・依存の強さを上げるほど MAR/MNAR のバイアスが拡大する。"
        kind="explain"
      />
    </div>
  );
}

const EstBar = ({ label, value, max, tone, ref0, unit = "" }: { label: string; value: number; max: number; tone: string; ref0: number; unit?: string }) => {
  const w = Math.min(100, (value / max) * 100);
  const refLeft = Math.min(100, (ref0 / max) * 100);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-28 text-right text-slate-600">{label}</span>
      <div className="relative h-3.5 flex-1 rounded bg-slate-200">
        <div className="h-full rounded" style={{ width: `${w}%`, background: tone }} />
        <div className="absolute top-0 h-3.5 border-l-2 border-dashed border-emerald-600" style={{ left: `${refLeft}%` }} />
      </div>
      <span className="w-12 text-right font-mono text-slate-700">{formatNumber(value, 2)}{unit}</span>
    </div>
  );
};
