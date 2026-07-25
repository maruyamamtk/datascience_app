"use client";

import { useEffect, useRef } from "react";
import { Term } from "@/components/content";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { useValueOfInformationStore } from "@/lib/store/value-of-information";
import { num, pct } from "./format";

const FORMULA = `\\mathrm{VOI}_{\\mathrm{pre}}=\\underbrace{${term(
  "sum",
  "?",
)}}_{\\text{予報込みの期待ESV}}-\\underbrace{${term("prior", "?")}}_{\\text{事前情報のみ}}=${term(
  "voipre",
  "?",
)}`;

const COLOR_PRIOR = "#94a3b8";
const COLOR_POSTERIOR = "#2563eb";
const COLOR_VOI = "#16a34a";

/**
 * 事前/事後分析ラボ(L2の中核可視化)。予報(シグナル)の的中率qをスライダーで動かすと、
 * シグナルごとの事後確率・条件付きESV・事後分析VOI_post(s)・事前分析VOI_pre(EVSI)が
 * リアルタイムに再計算される(操作→図→数式の強連動)。qを1に近づけるとVOI_preがEVPIに
 * 近づき、q=0.5(無情報)では0になる様子を確かめられる。
 */
export function PriorPosteriorLab() {
  const probGood = useValueOfInformationStore((s) => s.controls.probGood);
  const forecastAccuracy = useValueOfInformationStore((s) => s.controls.forecastAccuracy);
  const actions = useValueOfInformationStore((s) => s.derived.actions);
  const states = useValueOfInformationStore((s) => s.derived.states);
  const analysis = useValueOfInformationStore((s) => s.derived.posteriorAnalysis);
  const evpiValue = useValueOfInformationStore((s) => s.derived.evpi);
  const setControl = useValueOfInformationStore((s) => s.setControl);

  const sumTerm = analysis.voiPre + analysis.priorBestEsv;

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("sum", formatNumber(sumTerm, 0));
    m.setValue("prior", formatNumber(analysis.priorBestEsv, 0));
    m.setValue("voipre", formatNumber(analysis.voiPre, 0));
    m.setHighlight("sum", true, COLOR_POSTERIOR);
    m.setHighlight("prior", true, COLOR_PRIOR);
    m.setHighlight("voipre", true, COLOR_VOI);
  }, [sumTerm, analysis]);

  const gaugeRatio = evpiValue > 1e-9 ? Math.min(1, Math.max(0, analysis.voiPre / evpiValue)) : 0;

  return (
    <div id="prior-posterior-lab" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        「完全情報」ではなく、的中率 q の(不完全な)予報を得た場合を考える。予報を観測すると
        ベイズの定理で事前確率 → 事後確率が更新され(<Term id="prior-posterior-analysis">事前/事後分析</Term>)、
        条件付きESVが変わる。q を動かして、事前分析
        <strong className="font-semibold text-slate-900">VOI_pre</strong>
        がどこまでEVPIに近づくか確かめよう。
      </p>

      <label className="flex flex-col gap-1 text-sm text-slate-700">
        予報の的中率 q = {pct(forecastAccuracy)}(q=0.5で無情報、q=1で完全情報)
        <input
          type="range"
          min={0.5}
          max={1}
          step={0.01}
          value={forecastAccuracy}
          onChange={(e) => setControl("forecastAccuracy", Number(e.target.value))}
          aria-label="予報の的中率q"
          data-testid="forecast-accuracy-slider"
          className="accent-green-600"
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {states.map((stateLabel, s) => {
          const esv = analysis.esvGivenSignal[s];
          const maxAbs = Math.max(1, ...esv.scores.map((v) => Math.abs(v)));
          return (
            <div
              key={stateLabel}
              className="space-y-2 rounded-xl border border-slate-200 p-3"
              data-testid={`signal-panel-${s}`}
            >
              <p className="text-xs font-semibold text-slate-700">
                予報「{stateLabel}」(P(s)={pct(analysis.signalProbability[s])})
              </p>
              <div className="flex gap-2 text-[11px] text-slate-600">
                {states.map((th, j) => (
                  <span key={th} className="flex items-center gap-1">
                    <span
                      className="inline-block h-2 w-6 rounded-full"
                      style={{
                        background: j === 0 ? COLOR_POSTERIOR : COLOR_PRIOR,
                        opacity: 0.3 + 0.7 * analysis.posterior[s][j],
                      }}
                    />
                    P({th}|s)={pct(analysis.posterior[s][j])}
                  </span>
                ))}
              </div>
              <div className="space-y-1">
                {actions.map((a, i) => {
                  const v = esv.scores[i];
                  const widthPct = (Math.abs(v) / maxAbs) * 100;
                  const isBest = i === esv.bestIndex;
                  return (
                    <div key={a} className="flex items-center gap-2 text-[11px] text-slate-600">
                      <span className="w-12 shrink-0 text-right">{a}</span>
                      <div className="h-3 flex-1 rounded bg-slate-100">
                        <div
                          className={`h-3 rounded ${isBest ? "bg-green-600" : "bg-slate-400"}`}
                          style={{ width: `${widthPct}%` }}
                          data-testid={`signal-${s}-esv-bar-${i}`}
                        />
                      </div>
                      <span className={`w-14 shrink-0 font-mono ${isBest ? "font-bold text-green-700" : ""}`}>
                        {num(v)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500" data-testid={`signal-${s}-voi-post`}>
                VOI_post(s)={num(analysis.voiPost[s])}(事前情報のみ({num(analysis.priorBestEsv)})との差)
              </p>
            </div>
          );
        })}
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold text-slate-700">
          事前分析 VOI_pre(EVSI) と EVPI の比較
        </p>
        <div className="h-5 w-full overflow-hidden rounded-full bg-slate-100" data-testid="voi-pre-gauge">
          <div
            className="h-5 rounded-full bg-green-600"
            style={{ width: `${gaugeRatio * 100}%` }}
            data-testid="voi-pre-gauge-fill"
          />
        </div>
        <p className="text-[11px] text-slate-500">
          VOI_pre={num(analysis.voiPre)} / EVPI={num(evpiValue)}(比 {pct(gaugeRatio)})——
          qを1に近づけるほどVOI_preがEVPIに近づき、q=0.5では0になる。
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} display={false} />
      </div>

      <p className="text-xs text-slate-500">
        好況になる事前確率 p={pct(probGood)} は上のラボと共有している。
      </p>
    </div>
  );
}
