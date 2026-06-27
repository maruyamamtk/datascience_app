"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { useProbabilityStore } from "@/lib/store/probability-basics";
import { MosaicPlot } from "./MosaicPlot";

// ベイズの定理 P(D|+) = sens·prior / [ sens·prior + fpr·(1−prior) ]。
// 各項に id を付け、操作のたびに現在値を差し込み＋ハイライト（操作→図→数式の強連動）。
const FORMULA = `${term("post", "P(D\\mid +)")}=\\dfrac{${term("sens", "P(+\\mid D)")}\\,${term(
  "prior",
  "P(D)",
)}}{${term("sens2", "P(+\\mid D)")}\\,${term("prior2", "P(D)")}+${term(
  "fpr",
  "P(+\\mid \\lnot D)",
)}\\,${term("priorc", "P(\\lnot D)")}}`;

const COLOR_PRIOR = "#7c3aed"; // 事前確率
const COLOR_SENS = "#2563eb"; // 感度
const COLOR_FPR = "#dc2626"; // 偽陽性率
const COLOR_POST = "#16a34a"; // 事後確率（結果）

export function BayesLab() {
  const prior = useProbabilityStore((s) => s.controls.prior);
  const sensitivity = useProbabilityStore((s) => s.controls.sensitivity);
  const specificity = useProbabilityStore((s) => s.controls.specificity);
  const { fpr, posterior, pPos } = useProbabilityStore((s) => s.derived);
  const setControl = useProbabilityStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const c = mathRef.current;
    if (!c) return;
    // 分子・分母の同じ記号にも現在値を差し込む（sens/prior は 2 箇所に出る）。
    c.setValue("post", formatNumber(posterior));
    c.setValue("sens", formatNumber(sensitivity));
    c.setValue("sens2", formatNumber(sensitivity));
    c.setValue("prior", formatNumber(prior));
    c.setValue("prior2", formatNumber(prior));
    c.setValue("priorc", formatNumber(1 - prior));
    c.setValue("fpr", formatNumber(fpr));
    c.setHighlight("post", true, COLOR_POST);
    c.setHighlight("sens", true, COLOR_SENS);
    c.setHighlight("sens2", true, COLOR_SENS);
    c.setHighlight("prior", true, COLOR_PRIOR);
    c.setHighlight("prior2", true, COLOR_PRIOR);
    c.setHighlight("priorc", true, COLOR_PRIOR);
    c.setHighlight("fpr", true, COLOR_FPR);
  }, [posterior, sensitivity, prior, fpr]);

  return (
    <div
      id="probability-operation"
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5"
    >
      {/* ① 事前確率（有病率） */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="bp-prior" className="text-sm font-semibold text-slate-700">
            事前確率 P(D)＝有病率（検査前にどれだけ病気っぽいか）
          </label>
          <span className="font-mono text-sm" style={{ color: COLOR_PRIOR }}>
            {formatNumber(prior * 100, 1)}%
          </span>
        </div>
        <input
          id="bp-prior"
          type="range"
          min={0.001}
          max={0.5}
          step={0.001}
          value={prior}
          onChange={(e) => setControl("prior", Number(e.target.value))}
          className="w-full accent-violet-600"
          aria-label="事前確率（有病率）"
        />
      </div>

      {/* ② 感度 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="bp-sens" className="text-sm font-semibold text-slate-700">
            感度 P(+|D)（病気の人が陽性になる割合）
          </label>
          <span className="font-mono text-sm" style={{ color: COLOR_SENS }}>
            {formatNumber(sensitivity * 100, 0)}%
          </span>
        </div>
        <input
          id="bp-sens"
          type="range"
          min={0.5}
          max={1}
          step={0.01}
          value={sensitivity}
          onChange={(e) => setControl("sensitivity", Number(e.target.value))}
          className="w-full accent-blue-600"
          aria-label="感度"
        />
      </div>

      {/* ③ 特異度 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="bp-spec" className="text-sm font-semibold text-slate-700">
            特異度 P(−|¬D)（健康な人が陰性になる割合）
          </label>
          <span className="font-mono text-sm" style={{ color: COLOR_FPR }}>
            {formatNumber(specificity * 100, 0)}%（偽陽性率 {formatNumber(fpr * 100, 0)}%）
          </span>
        </div>
        <input
          id="bp-spec"
          type="range"
          min={0.5}
          max={1}
          step={0.01}
          value={specificity}
          onChange={(e) => setControl("specificity", Number(e.target.value))}
          className="w-full accent-red-600"
          aria-label="特異度"
        />
      </div>

      {/* ④ 強連動する数式（各項に現在値を差し込み＋ハイライト） */}
      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>

      {/* ⑤ モザイク図 */}
      <MosaicPlot prior={prior} sensitivity={sensitivity} fpr={fpr} posterior={posterior} />
      <p className="text-center font-mono text-sm" style={{ color: COLOR_POST }}>
        陽性的中率 P(D|+) = {formatNumber(posterior * 100, 1)}%（陽性になる確率 P(+) ={" "}
        {formatNumber(pPos * 100, 1)}%）
      </p>

      <Callout
        title="陽性でも病気とは限らない（条件付き確率の向きの罠）"
        body={`P(+|D)（病気→陽性）と P(D|+)（陽性→病気）は別物。有病率 ${formatNumber(
          prior * 100,
          1,
        )}% が低いと、感度が高くても陽性者の多くは «偽陽性» の健康な人で、P(D|+) は ${formatNumber(
          posterior * 100,
          0,
        )}% にとどまる。`}
        note="有病率（事前確率）を上げると、同じ検査でも事後確率はぐっと上がる。ベイズの定理は事前×尤度で事後を更新している。"
        kind="explain"
      />

      <p className="text-xs leading-relaxed text-slate-500">
        ヒント: <span style={{ color: COLOR_PRIOR }}>事前確率</span>・
        <span style={{ color: COLOR_SENS }}>感度</span>・
        <span style={{ color: COLOR_FPR }}>偽陽性率</span> を動かすと、数式の各項と
        <span style={{ color: COLOR_POST }}>事後確率 P(D|+)</span> が同時に追従します。
      </p>
    </div>
  );
}
