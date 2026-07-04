"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { useGraphStore } from "@/lib/store/graphical-models";
import type { Structure } from "@/lib/stats/graphical";

// 周辺相関と偏相関を実時間で差し込み＋ハイライト。
const FORMULA = `\\text{corr}(A,C)=${term("marg", "?")},\\quad \\text{corr}(A,C\\mid B)=${term("part", "?")}`;

const STRUCTURES: { key: Structure; label: string; desc: string }[] = [
  { key: "chain", label: "連鎖 A→B→C", desc: "A の影響が B 経由で C へ" },
  { key: "fork", label: "分岐 A←B→C", desc: "共通原因 B が A,C を相関" },
  { key: "collider", label: "合流 A→B←C", desc: "A,C は共通結果 B を持つ" },
];

// ノード座標。
const POS = { A: { x: 50, y: 60 }, B: { x: 160, y: 60 }, C: { x: 270, y: 60 } };

/** 構造ごとの有向辺（from→to）。 */
function edges(s: Structure): [keyof typeof POS, keyof typeof POS][] {
  if (s === "chain") return [["A", "B"], ["B", "C"]];
  if (s === "fork") return [["B", "A"], ["B", "C"]];
  return [["A", "B"], ["C", "B"]];
}

export function GraphLab() {
  const controls = useGraphStore((s) => s.controls);
  const { marginal, partialGivenB, dsep, effective } = useGraphStore((s) => s.derived);
  const setControl = useGraphStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("marg", formatNumber(marginal, 3));
    m.setValue("part", formatNumber(partialGivenB, 3));
    m.setHighlight("marg", !controls.conditionOnB, "#2563eb");
    m.setHighlight("part", controls.conditionOnB, controls.conditionOnB ? "#7c3aed" : "#64748b");
  }, [marginal, partialGivenB, controls.conditionOnB]);

  const indep = Math.abs(effective) < 0.08;

  return (
    <div id="graph-operation" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      {/* 構造選択 */}
      <div className="grid grid-cols-3 gap-2">
        {STRUCTURES.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setControl("structure", s.key)}
            aria-pressed={controls.structure === s.key}
            className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${
              controls.structure === s.key ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="gm-w" className="text-xs font-semibold text-slate-700">辺の強さ w = {formatNumber(controls.w, 2)}</label>
          <input id="gm-w" type="range" min={0.2} max={1.5} step={0.1} value={controls.w} onChange={(e) => setControl("w", Number(e.target.value))} className="w-full accent-blue-600" />
        </div>
        <div className="flex items-end">
          <button
            type="button"
            role="switch"
            aria-checked={controls.conditionOnB}
            onClick={() => setControl("conditionOnB", !controls.conditionOnB)}
            className={`w-full rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              controls.conditionOnB ? "border-violet-500 bg-violet-50 text-violet-700" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {controls.conditionOnB ? "✓ B を条件づけ中（観測）" : "B を条件づける（観測する）"}
          </button>
        </div>
      </div>

      {/* DAG */}
      <div className="overflow-x-auto">
        <svg viewBox="0 0 320 110" className="mx-auto w-full max-w-sm" role="img" aria-label="3ノードの有向グラフ">
          <defs>
            <marker id="gm-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" className="fill-slate-500" />
            </marker>
          </defs>
          {edges(controls.structure).map(([from, to], i) => {
            const f = POS[from];
            const t = POS[to];
            const dx = t.x - f.x;
            const ux = dx / Math.abs(dx);
            return (
              <line key={i} x1={f.x + ux * 18} y1={f.y} x2={t.x - ux * 18} y2={t.y} className="stroke-slate-500" strokeWidth={2} markerEnd="url(#gm-arrow)" />
            );
          })}
          {(["A", "B", "C"] as const).map((k) => {
            const p = POS[k];
            const isB = k === "B";
            const conditioned = isB && controls.conditionOnB;
            return (
              <g key={k}>
                {conditioned ? (
                  <rect x={p.x - 16} y={p.y - 16} width={32} height={32} rx={4} className="fill-violet-100 stroke-violet-500" strokeWidth={2} />
                ) : (
                  <circle cx={p.x} cy={p.y} r={16} className="fill-white stroke-slate-400" strokeWidth={2} />
                )}
                <text x={p.x} y={p.y + 4} textAnchor="middle" className={`text-sm font-semibold ${conditioned ? "fill-violet-700" : "fill-slate-700"}`}>{k}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="text-center text-[10px] text-slate-400">紫の四角＝条件づけた（観測した）ノード。{STRUCTURES.find((s) => s.key === controls.structure)?.desc}</p>

      {/* 相関バー */}
      <div className="space-y-2 rounded-xl bg-slate-50 px-4 py-3">
        <CorrBar label="周辺 corr(A,C)" value={marginal} active={!controls.conditionOnB} tone="#2563eb" />
        <CorrBar label="偏相関 corr(A,C|B)" value={partialGivenB} active={controls.conditionOnB} tone="#7c3aed" />
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>

      <div className={`rounded-lg px-3 py-2 text-center text-sm font-semibold ${indep ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
        {controls.conditionOnB ? "B を条件づけたとき：" : "何も条件づけないとき："}
        A ⫫ C は {indep ? "成り立つ（d分離・独立）" : "成り立たない（従属）"}
        {dsep === indep ? "" : "（有限標本の揺らぎ）"}
      </div>

      <Callout
        title="グラフが «条件付き独立» を教える：d分離"
        body={`いまの構造は «${STRUCTURES.find((s) => s.key === controls.structure)?.label}»。周辺相関 corr(A,C)=${formatNumber(marginal, 3)}、B を条件づけた偏相関=${formatNumber(partialGivenB, 3)}。${
          controls.structure === "collider"
            ? "合流（コライダー）だけは «条件づけると逆に依存が開く»。"
            : "連鎖・分岐は «中間/共通原因を条件づけると遮断» される。"
        }`}
        note="d分離のルール：連鎖・分岐の中心ノードを条件づけると経路は閉じる（独立になる）。合流点は逆で、条件づけると開く（依存が生まれる）。だから «調整すべき変数» と «調整してはいけない変数（合流点）» をグラフで見分けるのが因果推論の要。辺の強さ w を上げると相関が濃くなる。"
        kind="explain"
      />
    </div>
  );
}

function CorrBar({ label, value, active, tone }: { label: string; value: number; active: boolean; tone: string }) {
  const w = Math.min(100, Math.abs(value) * 100);
  return (
    <div className={`flex items-center gap-3 text-xs ${active ? "" : "opacity-45"}`}>
      <span className="w-32 text-slate-600">{label}</span>
      <div className="h-3 flex-1 rounded bg-slate-200">
        <div className="h-full rounded" style={{ width: `${w}%`, background: tone }} />
      </div>
      <span className="w-12 text-right font-mono text-slate-700">{formatNumber(value, 3)}</span>
    </div>
  );
}
