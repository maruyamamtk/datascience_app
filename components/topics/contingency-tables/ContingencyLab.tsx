"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { useContingencyStore } from "@/lib/store/contingency-tables";

// χ² = Σ (O−E)²/E。χ²・p値・Cramér's V を実時間で差し込み＋ハイライト。
const FORMULA = `\\chi^2=\\sum\\frac{(O-E)^2}{E}=${term("chi", "?")},\\quad p=${term("p", "?")},\\quad V=${term("v", "?")}`;

const ROW_LABELS = ["治療あり", "治療なし"];
const COL_LABELS = ["改善", "非改善"];

/** 標準化残差を色に：正（観測>期待）は青、負は赤。 */
function residualColor(r: number): string {
  const m = Math.min(1, Math.abs(r) / 4);
  return r >= 0 ? `rgba(37,99,235,${0.12 + m * 0.55})` : `rgba(239,68,68,${0.12 + m * 0.55})`;
}

export function ContingencyLab() {
  const controls = useContingencyStore((s) => s.controls);
  const { table, expected, residuals, n, chi2, df, pValue, cramersV, oddsRatio } =
    useContingencyStore((s) => s.derived);
  const setControl = useContingencyStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("chi", formatNumber(chi2, 2));
    m.setValue("p", formatNumber(pValue, 4));
    m.setValue("v", formatNumber(cramersV, 3));
    m.setHighlight("chi", true, "#7c3aed");
    m.setHighlight("p", pValue < 0.05, pValue < 0.05 ? "#dc2626" : "#64748b");
    m.setHighlight("v", true, "#0891b2");
  }, [chi2, pValue, cramersV]);

  const keys: (keyof typeof controls)[] = ["a", "b", "c", "d"];

  return (
    <div id="contingency-operation" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {keys.map((k, idx) => (
          <div key={k} className="space-y-1">
            <label htmlFor={`ct-${k}`} className="text-xs font-semibold text-slate-700">
              {ROW_LABELS[Math.floor(idx / 2)]}×{COL_LABELS[idx % 2]} = {controls[k]}
            </label>
            <input id={`ct-${k}`} type="range" min={0} max={100} step={1} value={controls[k]} onChange={(e) => setControl(k, Number(e.target.value))} className="w-full accent-violet-600" aria-label={`${k}セル`} />
          </div>
        ))}
      </div>

      {/* 観測 / 期待（残差ヒートマップ） */}
      <div className="overflow-x-auto">
        <table className="mx-auto border-collapse text-center text-sm" data-testid="ct-table">
          <thead>
            <tr>
              <th className="px-2 py-1"></th>
              {COL_LABELS.map((c) => (
                <th key={c} className="px-3 py-1 text-xs text-slate-500">{c}</th>
              ))}
              <th className="px-3 py-1 text-xs text-slate-400">計</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row, i) => (
              <tr key={i}>
                <th className="px-2 py-1 text-xs text-slate-500">{ROW_LABELS[i]}</th>
                {row.map((o, j) => (
                  <td key={j} className="border border-slate-200 px-3 py-1.5" style={{ background: residualColor(residuals[i][j]) }}>
                    <div className="font-mono font-semibold text-slate-800">{o}</div>
                    <div className="text-[9px] text-slate-500">期待 {expected[i][j].toFixed(1)}</div>
                  </td>
                ))}
                <td className="px-3 py-1 font-mono text-xs text-slate-400">{row[0] + row[1]}</td>
              </tr>
            ))}
            <tr>
              <th className="px-2 py-1 text-xs text-slate-400">計</th>
              <td className="px-3 py-1 font-mono text-xs text-slate-400">{table[0][0] + table[1][0]}</td>
              <td className="px-3 py-1 font-mono text-xs text-slate-400">{table[0][1] + table[1][1]}</td>
              <td className="px-3 py-1 font-mono text-xs text-slate-400">{n}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-center text-[10px] text-slate-400">セルの色 = 標準化残差（青=観測が期待より多い / 赤=少ない・濃いほど大きなズレ）</p>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>

      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <Stat value={formatNumber(chi2, 2)} label={`χ²（df=${df}）`} tone="violet" />
        <Stat value={formatNumber(pValue, 4)} label="p値" tone={pValue < 0.05 ? "red" : "slate"} />
        <Stat value={formatNumber(cramersV, 3)} label="Cramér's V" tone="cyan" />
        <Stat value={Number.isFinite(oddsRatio) ? formatNumber(oddsRatio, 2) : "∞"} label="オッズ比" tone="amber" />
      </div>

      <Callout
        title="分割表：期待度数とのズレで «関連» を測る"
        body={`独立（無関係）を仮定した期待度数 E=行和·列和/N とのズレを χ²=Σ(O−E)²/E で集計。χ²=${formatNumber(chi2, 2)}、p=${formatNumber(pValue, 4)}。${pValue < 0.05 ? "p<0.05 で独立を棄却＝関連あり。" : "p≥0.05 で独立を棄却できない＝関連の証拠は弱い。"}`}
        note={`χ² は標本サイズに比例して膨らむので «関連の強さ» は Cramér's V=${formatNumber(cramersV, 3)}（0〜1）で測る。2×2 ではオッズ比=${Number.isFinite(oddsRatio) ? formatNumber(oddsRatio, 2) : "∞"} が «オッズが何倍か» を示す。対角（a,d）を増やすと連関が強まり χ² と V が上がる。`}
        kind="explain"
      />
    </div>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone: "violet" | "red" | "cyan" | "amber" | "slate" }) {
  const bg = {
    violet: "bg-violet-50 text-violet-700",
    red: "bg-red-50 text-red-700",
    cyan: "bg-cyan-50 text-cyan-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-700",
  }[tone];
  return (
    <div className={`rounded-lg px-2 py-2 ${bg}`}>
      <div className="font-mono text-base">{value}</div>
      <div className="text-slate-500">{label}</div>
    </div>
  );
}
