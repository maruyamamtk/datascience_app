"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { CI_MEAN } from "@/lib/stats/interval";
import { useIntervalStore } from "@/lib/store/interval";
import { IntervalBar } from "./IntervalBar";

// 信頼区間 x̄ ± z·σ/√n。z・σ・n・半幅 h の項に id を付け、操作のたびに現在値を差し込み＋ハイライト。
const FORMULA = `\\bar x \\pm ${term("z", "z")}\\cdot\\dfrac{${term(
  "sigma",
  "\\sigma",
)}}{\\sqrt{${term("n", "n")}}}=\\bar x \\pm ${term("half", "h")}`;

const AXIS_MIN = -25;
const AXIS_MAX = 25;

const N_MIN = 4;
const N_MAX = 100;
const SIGMA_MIN = 4;
const SIGMA_MAX = 16;
const LEVEL_MIN = 0.8;
const LEVEL_MAX = 0.99;

const COLOR_Z = "#7c3aed"; // 信頼係数 → z
const COLOR_SE = "#2563eb"; // σ・n → SE
const COLOR_HALF = "#16a34a"; // 半幅 h（結果）

/**
 * 区間推定 操作ラボ（描画層 / Control 層）。
 * n・信頼係数 level・σ のスライダーで信頼区間 x̄ ± z·σ/√n を動かし、同時に数式の z・σ・n・半幅 h 項へ
 * 現在値を差し込み＋ハイライトする（操作→グラフ→数式の強連動, 受け入れ条件）。
 * 操作値（n・level・σ）は useIntervalStore が single source of truth。x̄ は CI_MEAN（=0）固定で
 * 「区間幅が何で決まるか」に集中して見せる。
 */
export function IntervalLab() {
  const n = useIntervalStore((s) => s.controls.n);
  const level = useIntervalStore((s) => s.controls.level);
  const sigma = useIntervalStore((s) => s.controls.sigma);
  const { z, se, lower, upper, halfWidth } = useIntervalStore((s) => s.derived);
  const setControl = useIntervalStore((s) => s.setControl);

  // 数式の項を差し込み＋ハイライト（全体再描画はせず TermController で DOM 差分パッチ）。
  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const c = mathRef.current;
    if (!c) return;
    c.setValue("z", formatNumber(z));
    c.setValue("sigma", formatNumber(sigma));
    c.setValue("n", String(n));
    c.setValue("half", formatNumber(halfWidth));
    c.setHighlight("z", true, COLOR_Z);
    c.setHighlight("sigma", true, COLOR_SE);
    c.setHighlight("n", true, COLOR_SE);
    c.setHighlight("half", true, COLOR_HALF);
  }, [z, sigma, n, halfWidth]);

  const levelPct = `${formatNumber(level * 100, 0)}%`;

  return (
    <div
      id="interval-operation"
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5"
    >
      {/* ① 信頼係数 level */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="ci-level" className="text-sm font-semibold text-slate-700">
            信頼係数（広げるほど区間は広い）
          </label>
          <span className="font-mono text-sm" style={{ color: COLOR_Z }}>
            {levelPct}（z = {formatNumber(z)}）
          </span>
        </div>
        <input
          id="ci-level"
          type="range"
          min={LEVEL_MIN}
          max={LEVEL_MAX}
          step={0.01}
          value={level}
          onChange={(e) => setControl("level", Number(e.target.value))}
          className="w-full accent-violet-600"
          aria-label="信頼係数"
        />
      </div>

      {/* ② 標本サイズ n */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="ci-n" className="text-sm font-semibold text-slate-700">
            標本サイズ n（増やすほど区間は狭い）
          </label>
          <span className="font-mono text-sm" style={{ color: COLOR_SE }}>
            n = {n}
          </span>
        </div>
        <input
          id="ci-n"
          type="range"
          min={N_MIN}
          max={N_MAX}
          step={1}
          value={n}
          onChange={(e) => setControl("n", Number(e.target.value))}
          className="w-full accent-blue-600"
          aria-label="標本サイズ n"
        />
      </div>

      {/* ③ 母標準偏差 σ */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="ci-sigma" className="text-sm font-semibold text-slate-700">
            母標準偏差 σ（ばらつき）
          </label>
          <span className="font-mono text-sm" style={{ color: COLOR_SE }}>
            σ = {formatNumber(sigma)}（SE = {formatNumber(se)}）
          </span>
        </div>
        <input
          id="ci-sigma"
          type="range"
          min={SIGMA_MIN}
          max={SIGMA_MAX}
          step={1}
          value={sigma}
          onChange={(e) => setControl("sigma", Number(e.target.value))}
          className="w-full accent-blue-600"
          aria-label="母標準偏差 σ"
        />
      </div>

      {/* ④ 強連動する数式（z・σ・n・半幅 h に現在値を差し込み＋ハイライト） */}
      <div className="rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>

      {/* ⑤ 信頼区間バー */}
      <IntervalBar
        lower={lower}
        upper={upper}
        center={CI_MEAN}
        mu={CI_MEAN}
        axisMin={AXIS_MIN}
        axisMax={AXIS_MAX}
        color={COLOR_SE}
      />
      <p className="text-center font-mono text-sm text-slate-700">
        {levelPct} 信頼区間 = [{formatNumber(lower)}, {formatNumber(upper)}]（幅{" "}
        {formatNumber(upper - lower)}）
      </p>

      <Callout
        title="区間幅は z・σ・n で決まる"
        body={`半幅 h = z·σ/√n = ${formatNumber(z)} × ${formatNumber(sigma)} / √${n} = ${formatNumber(
          halfWidth,
        )}。信頼係数を上げると z が増えて区間は広がり、n を増やすと SE=σ/√n が縮んで区間は狭まります。`}
        note="x̄（区間の中心）はこのラボでは 0 に固定し、「幅が何で決まるか」だけに注目しています。"
        kind="explain"
      />

      <p className="text-xs leading-relaxed text-slate-500">
        ヒント: <span style={{ color: COLOR_Z }}>信頼係数</span> を上げると{" "}
        <span style={{ color: COLOR_Z }}>z</span> が、<span style={{ color: COLOR_SE }}>n・σ</span> を
        変えると <span style={{ color: COLOR_SE }}>SE</span> が、数式と同時に追従します。
      </p>
    </div>
  );
}
