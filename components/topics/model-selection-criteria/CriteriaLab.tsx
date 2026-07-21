"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { N_OBS, type ModelFit } from "@/lib/stats/model-selection-criteria";
import { useModelSelectionCriteriaStore } from "@/lib/store/model-selection-criteria";
import { num, round2 } from "./format";

const FORMULA_AIC = `\\mathrm{AIC}=-2\\log L+2k=-2\\times(${term("aic_ll", "?")})+2\\times${term(
  "aic_k",
  "?",
)}=${term("aic_val", "?")}`;
const FORMULA_BIC = `\\mathrm{BIC}=-2\\log L+k\\log n=-2\\times(${term("bic_ll", "?")})+${term(
  "bic_k",
  "?",
)}\\times\\log ${term("bic_n", "?")}=${term("bic_val", "?")}`;
const FORMULA_CP = `C_p=\\dfrac{\\mathrm{RSS}_p}{\\hat\\sigma^2}-n+2p=\\dfrac{${term(
  "cp_rss",
  "?",
)}}{\\hat\\sigma^2}-${term("cp_n", "?")}+2\\times${term("cp_p", "?")}=${term("cp_val", "?")}`;

const COLOR_AIC = "#2563eb";
const COLOR_BIC = "#7c3aed";
const COLOR_CP = "#ea580c";

const W = 300;
const H = 160;
const PAD = { top: 14, right: 14, bottom: 22, left: 30 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

function predictorLabel(m: ModelFit): string {
  return m.k === 0 ? "切片のみ" : `+${m.predictorNames.join(",")}`;
}

/**
 * モデル選択基準 操作ラボ(描画層/Control層, Level0)。
 * 「x1・x2だけが真に効き、x3〜x5は無関係」な固定回帰データセットに対して、
 * 説明変数0〜5個のネストされたモデルを比較する。モデルサイズkを選ぶと、
 * RSS・対数尤度・AIC・BIC・Cpが実時間で更新される(Issue #84 中核可視化)。
 * 操作値はuseModelSelectionCriteriaStoreがsingle source of truth。
 */
export function CriteriaLab() {
  const selectedK = useModelSelectionCriteriaStore((s) => s.controls.selectedK);
  const d = useModelSelectionCriteriaStore((s) => s.derived);
  const setControl = useModelSelectionCriteriaStore((s) => s.setControl);

  const mathRefAic = useRef<MathFormulaHandle>(null);
  const mathRefBic = useRef<MathFormulaHandle>(null);
  const mathRefCp = useRef<MathFormulaHandle>(null);

  useEffect(() => {
    const m = mathRefAic.current;
    if (!m) return;
    m.setValue("aic_ll", formatNumber(d.selected.logLik, 2));
    m.setValue("aic_k", String(d.selected.paramCount));
    m.setValue("aic_val", formatNumber(d.selected.aic, 2));
    const isBest = d.selected.k === d.aicBest.k;
    m.setHighlight("aic_val", isBest, COLOR_AIC);
    m.setHighlight("aic_k", isBest, COLOR_AIC);
  }, [d.selected, d.aicBest]);

  useEffect(() => {
    const m = mathRefBic.current;
    if (!m) return;
    m.setValue("bic_ll", formatNumber(d.selected.logLik, 2));
    m.setValue("bic_k", String(d.selected.paramCount));
    m.setValue("bic_n", String(N_OBS));
    m.setValue("bic_val", formatNumber(d.selected.bic, 2));
    const isBest = d.selected.k === d.bicBest.k;
    m.setHighlight("bic_val", isBest, COLOR_BIC);
    m.setHighlight("bic_k", isBest, COLOR_BIC);
  }, [d.selected, d.bicBest, d.models.length]);

  useEffect(() => {
    const m = mathRefCp.current;
    if (!m) return;
    m.setValue("cp_rss", formatNumber(d.selected.rss, 2));
    m.setValue("cp_n", String(N_OBS));
    m.setValue("cp_p", String(d.selected.paramCount));
    m.setValue("cp_val", formatNumber(d.selected.cp, 2));
    const isBest = d.selected.k === d.cpBest.k;
    m.setHighlight("cp_val", isBest, COLOR_CP);
    m.setHighlight("cp_p", isBest, COLOR_CP);
  }, [d.selected, d.cpBest]);

  const aicMin = Math.min(...d.models.map((m) => m.aic));
  const bicMin = Math.min(...d.models.map((m) => m.bic));
  const cpMin = Math.min(...d.models.map((m) => m.cp));
  const deltaMax = Math.max(
    1,
    ...d.models.map((m) => Math.max(m.aic - aicMin, m.bic - bicMin, m.cp - cpMin)),
  );

  const cx = (k: number) => round2(PAD.left + (k / (d.models.length - 1)) * CW);
  const cy = (delta: number) => round2(PAD.top + CH - (delta / deltaMax) * CH);

  const seriesPath = (values: number[], min: number) =>
    values.map((v, k) => `${cx(k)},${cy(v - min)}`).join(" ");

  return (
    <div id="model-selection-criteria-lab" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        真に効くのはx1・x2だけ(x3・x4・x5は無関係なダミー変数)という固定データ(n=24件)に対して、
        説明変数を1個ずつ増やした6個のネストされたモデルを比較する。下でモデルサイズを選ぶと、
        RSS・対数尤度・AIC・BIC・Cpが実時間で更新される。
      </p>

      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="モデルサイズを選択">
        {d.models.map((m) => (
          <button
            key={m.k}
            type="button"
            onClick={() => setControl("selectedK", m.k)}
            aria-pressed={selectedK === m.k}
            data-testid={`k-select-${m.k}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              selectedK === m.k
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            k={m.k}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="mx-auto w-full max-w-2xl border-collapse text-center text-xs" data-testid="criteria-table">
          <thead>
            <tr className="text-slate-500">
              <th className="p-1 text-left">モデル</th>
              <th className="p-1">説明変数</th>
              <th className="p-1">RSS</th>
              <th className="p-1">パラメータ数</th>
              <th className="p-1">対数尤度</th>
              <th className="p-1">AIC</th>
              <th className="p-1">BIC</th>
              <th className="p-1">Cp</th>
            </tr>
          </thead>
          <tbody>
            {d.models.map((m) => {
              const isSelected = m.k === selectedK;
              return (
                <tr
                  key={m.k}
                  data-testid={`criteria-row-${m.k}`}
                  className={isSelected ? "bg-blue-50 font-semibold" : ""}
                >
                  <td className="p-1 text-left font-medium text-slate-700">k={m.k}</td>
                  <td className="p-1 font-mono text-slate-500">{predictorLabel(m)}</td>
                  <td className="p-1 font-mono">{num(m.rss, 2)}</td>
                  <td className="p-1 font-mono">{m.paramCount}</td>
                  <td className="p-1 font-mono">{num(m.logLik, 2)}</td>
                  <td className={`p-1 font-mono ${m.k === d.aicBest.k ? "text-blue-700 underline decoration-2" : ""}`}>
                    {num(m.aic, 2)}
                  </td>
                  <td className={`p-1 font-mono ${m.k === d.bicBest.k ? "text-violet-700 underline decoration-2" : ""}`}>
                    {num(m.bic, 2)}
                  </td>
                  <td className={`p-1 font-mono ${m.k === d.cpBest.k ? "text-orange-700 underline decoration-2" : ""}`}>
                    {num(m.cp, 2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto">
        <p className="mb-1 text-center text-xs text-slate-500">
          各指標の最小値からの差(Δ)——0が各指標にとっての最良モデル
        </p>
        <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-sm" role="img" aria-label="AIC・BIC・Cpの比較(最小値からの差)">
          <line x1={PAD.left} y1={PAD.top + CH} x2={W - PAD.right} y2={PAD.top + CH} stroke="#cbd5e1" />
          <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + CH} stroke="#cbd5e1" />
          <polyline points={seriesPath(d.models.map((m) => m.aic), aicMin)} fill="none" stroke={COLOR_AIC} strokeWidth={2} data-testid="criteria-line-aic" />
          <polyline points={seriesPath(d.models.map((m) => m.bic), bicMin)} fill="none" stroke={COLOR_BIC} strokeWidth={2} data-testid="criteria-line-bic" />
          <polyline points={seriesPath(d.models.map((m) => m.cp), cpMin)} fill="none" stroke={COLOR_CP} strokeWidth={2} data-testid="criteria-line-cp" />
          {d.models.map((m) => (
            <line key={`grid-${m.k}`} x1={cx(m.k)} y1={PAD.top} x2={cx(m.k)} y2={PAD.top + CH} stroke={m.k === selectedK ? "#94a3b8" : "transparent"} strokeDasharray="2 2" />
          ))}
          {d.models.map((m) => (
            <circle
              key={`aic-${m.k}`}
              cx={cx(m.k)}
              cy={cy(m.aic - aicMin)}
              r={m.k === d.aicBest.k ? 5 : 2.5}
              fill={COLOR_AIC}
              stroke={m.k === selectedK ? "#0f172a" : "none"}
              strokeWidth={1.5}
            />
          ))}
          {d.models.map((m) => (
            <circle
              key={`bic-${m.k}`}
              cx={cx(m.k)}
              cy={cy(m.bic - bicMin)}
              r={m.k === d.bicBest.k ? 5 : 2.5}
              fill={COLOR_BIC}
              stroke={m.k === selectedK ? "#0f172a" : "none"}
              strokeWidth={1.5}
            />
          ))}
          {d.models.map((m) => (
            <circle
              key={`cp-${m.k}`}
              cx={cx(m.k)}
              cy={cy(m.cp - cpMin)}
              r={m.k === d.cpBest.k ? 5 : 2.5}
              fill={COLOR_CP}
              stroke={m.k === selectedK ? "#0f172a" : "none"}
              strokeWidth={1.5}
            />
          ))}
          {d.models.map((m) => (
            <text key={`label-${m.k}`} x={cx(m.k)} y={PAD.top + CH + 14} textAnchor="middle" className="fill-slate-500 text-[9px]">
              {m.k}
            </text>
          ))}
          <text x={2} y={PAD.top + 8} className="fill-slate-400 text-[9px]">
            Δ↑
          </text>
        </svg>
        <div className="mt-1 flex flex-wrap justify-center gap-3 text-[10px]">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: COLOR_AIC }} />AIC</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: COLOR_BIC }} />BIC</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: COLOR_CP }} />Cp</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="overflow-x-auto rounded-xl bg-slate-50 px-3 py-3 text-center">
          <MathFormula ref={mathRefAic} tex={FORMULA_AIC} display={false} />
        </div>
        <div className="overflow-x-auto rounded-xl bg-slate-50 px-3 py-3 text-center">
          <MathFormula ref={mathRefBic} tex={FORMULA_BIC} display={false} />
        </div>
        <div className="overflow-x-auto rounded-xl bg-slate-50 px-3 py-3 text-center">
          <MathFormula ref={mathRefCp} tex={FORMULA_CP} display={false} />
        </div>
      </div>

      <Callout
        title="この例ではAICだけが1つ余分な変数を含むモデルを選んでしまう"
        body={`AICが最小になるのはk=${d.aicBest.k}(${predictorLabel(d.aicBest)})だが、BIC・Cpが最小になるのはどちらもk=${d.bicBest.k}(真のモデルと一致)。`}
        note="AICの罰則(パラメータ1個につき2)はBICの罰則(パラメータ1個につきlog n)より緩いため、真には無関係な変数を含めてもRSSがわずかに下がると«得»と判断してしまうことがある——次のLevelでこの罰則の差を数値で確認する。"
        kind="explain"
      />
    </div>
  );
}
