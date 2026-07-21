"use client";

import { useEffect, useMemo, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout, frameAt, isHighlighted, StepPlayer, useFramePlayer } from "@/components/viz";
import { MODELS, useModelSelectionCriteriaStore } from "@/lib/store/model-selection-criteria";
import { buildCriteriaFrames } from "./frames";
import { num } from "./format";

const FORMULA_AIC = `\\mathrm{AIC}=${term("step_aic_val", "?")}`;
const FORMULA_BIC = `\\mathrm{BIC}=${term("step_bic_val", "?")}`;
const FORMULA_CP = `C_p=${term("step_cp_val", "?")}`;

/**
 * CriteriaStepper(Level1): 説明変数0〜5個のネストモデルを1つずつコマ送りで当てはめ、
 * RSS→対数尤度→AIC・BIC・Cpの表を少しずつ埋めていき、最後に3指標の«最小を選ぶモデル»が
 * 一致するとは限らないことをまとめて見せる(Issue #84 中核可視化)。
 * ステッパーは1つだけなのでメインストアのframeを共用する(tasks/lessons.md #76の判断目安)。
 */
export function CriteriaStepper() {
  const index = useModelSelectionCriteriaStore((s) => s.frame.index);
  const count = useModelSelectionCriteriaStore((s) => s.frame.count);
  const playing = useModelSelectionCriteriaStore((s) => s.frame.playing);
  const nextFrame = useModelSelectionCriteriaStore((s) => s.nextFrame);
  const prevFrame = useModelSelectionCriteriaStore((s) => s.prevFrame);
  const goToFrame = useModelSelectionCriteriaStore((s) => s.goToFrame);
  const setPlaying = useModelSelectionCriteriaStore((s) => s.setPlaying);

  const frames = useMemo(() => buildCriteriaFrames(MODELS), []);
  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 1400 });

  const frame = frameAt(frames, index);
  const p = frame?.payload;

  const mathRefAic = useRef<MathFormulaHandle>(null);
  const mathRefBic = useRef<MathFormulaHandle>(null);
  const mathRefCp = useRef<MathFormulaHandle>(null);

  useEffect(() => {
    const aic = mathRefAic.current;
    const bic = mathRefBic.current;
    const cp = mathRefCp.current;
    const current = p?.step === "model" ? p.current : undefined;
    const fmt = (v: number | undefined) => (v === undefined ? "?" : formatNumber(v, 2));
    if (aic) {
      aic.setValue("step_aic_val", fmt(current?.aic));
      aic.setHighlight("step_aic_val", !!current, "#2563eb");
    }
    if (bic) {
      bic.setValue("step_bic_val", fmt(current?.bic));
      bic.setHighlight("step_bic_val", !!current, "#7c3aed");
    }
    if (cp) {
      cp.setValue("step_cp_val", fmt(current?.cp));
      cp.setHighlight("step_cp_val", !!current, "#ea580c");
    }
  }, [p]);

  if (!p) return null;

  const revealedKs = new Set(p.revealed.map((m) => m.k));

  return (
    <div id="model-selection-criteria-stepper" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        説明変数を1個ずつ増やしながら、RSS→対数尤度→AIC・BIC・Cpの表を組み立てる
      </p>

      <div className="overflow-x-auto">
        <table className="mx-auto w-full max-w-2xl border-collapse text-center text-xs" data-testid="criteria-stepper-table">
          <thead>
            <tr className="text-slate-500">
              <th className="p-1 text-left">モデル</th>
              <th className="p-1">RSS</th>
              <th className="p-1">対数尤度</th>
              <th className="p-1">AIC</th>
              <th className="p-1">BIC</th>
              <th className="p-1">Cp</th>
            </tr>
          </thead>
          <tbody>
            {p.all.map((m) => {
              const revealed = revealedKs.has(m.k);
              const isCurrent = p.step === "model" && p.current?.k === m.k;
              return (
                <tr
                  key={m.k}
                  data-testid={`criteria-stepper-row-${m.k}`}
                  className={isCurrent || isHighlighted(frame, `criteria-model-${m.k}`) ? "bg-blue-50 font-semibold" : ""}
                >
                  <td className="p-1 text-left font-medium text-slate-700">k={m.k}</td>
                  <td className="p-1 font-mono">{revealed ? num(m.rss, 2) : "—"}</td>
                  <td className="p-1 font-mono">{revealed ? num(m.logLik, 2) : "—"}</td>
                  <td className="p-1 font-mono">{revealed ? num(m.aic, 2) : "—"}</td>
                  <td className="p-1 font-mono">{revealed ? num(m.bic, 2) : "—"}</td>
                  <td className="p-1 font-mono">{revealed ? num(m.cp, 2) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
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

      {frame?.callout ? <Callout {...frame.callout} /> : null}

      <StepPlayer
        count={count}
        index={index}
        playing={playing}
        onPrev={prevFrame}
        onNext={nextFrame}
        onSeek={goToFrame}
        onTogglePlay={() => setPlaying(!playing)}
        labels={["全体像", ...p.all.map((m) => `k=${m.k}`), "まとめ"]}
      />
    </div>
  );
}
