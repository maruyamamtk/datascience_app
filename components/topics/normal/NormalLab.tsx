"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { normalCurve } from "@/lib/stats/normal";
import { useNormalStore } from "@/lib/store/normal";
import { NormalCurve, type SigmaBand } from "./NormalCurve";

// 密度関数 f(x)。μ と σ（2 か所）に id を付け、スライダー操作のたびに現在値を差し込み＋ハイライト。
const FORMULA = `f(x)=\\dfrac{1}{${term("sigmaA", "\\sigma")}\\sqrt{2\\pi}}\\,\\exp\\!\\left(-\\dfrac{(x-${term(
  "mu",
  "\\mu",
)})^2}{2\\,${term("sigmaB", "\\sigma")}^2}\\right)`;

const AXIS_MIN = -10;
const AXIS_MAX = 10;
const Y_MAX = 0.85; // σ=0.5 のピーク(≈0.80)が収まる固定スケール。σ を変えても山の高さ変化が見える。
const CURVE_POINTS = 161;

const MU_MIN = -5;
const MU_MAX = 5;
const SIGMA_MIN = 0.5;
const SIGMA_MAX = 4;

const COLOR_MU = "#16a34a";
const COLOR_SIGMA = "#2563eb";

// ±kσ 帯（外側＝薄から内側＝濃の順。NormalCurve はこの順で重ね塗りする）。
const BAND_COLORS: Record<number, string> = { 3: "#bfdbfe", 2: "#60a5fa", 1: "#2563eb" };

/**
 * 正規分布 操作ラボ（描画層 / Control 層）。
 * μ/σ スライダーで密度曲線を動かし、同時に数式 f(x) の μ・σ 項へ現在値を差し込み＋ハイライト
 * （操作→グラフ→数式の強連動, SPEC §4.4）。操作値（μ, σ）は useNormalStore が single source of truth。
 * どの ±kσ 帯に着目するかだけは閲覧時の対話なので component local state に持つ。
 */
export function NormalLab() {
  const mu = useNormalStore((s) => s.controls.mu);
  const sigma = useNormalStore((s) => s.controls.sigma);
  const { variance, p1, p2, p3 } = useNormalStore((s) => s.derived);
  const setControl = useNormalStore((s) => s.setControl);

  const [activeK, setActiveK] = useState<number>(1);

  const curve = useMemo(
    () => normalCurve(mu, sigma, { min: AXIS_MIN, max: AXIS_MAX, points: CURVE_POINTS }),
    [mu, sigma],
  );

  const bands: SigmaBand[] = useMemo(
    () => [
      { k: 3, prob: p3, color: BAND_COLORS[3] },
      { k: 2, prob: p2, color: BAND_COLORS[2] },
      { k: 1, prob: p1, color: BAND_COLORS[1] },
    ],
    [p1, p2, p3],
  );

  const probByK: Record<number, number> = { 1: p1, 2: p2, 3: p3 };

  // 数式の項を差し込み＋ハイライト（全体再描画はせず TermController で DOM 差分パッチ）。
  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const c = mathRef.current;
    if (!c) return;
    c.setValue("mu", formatNumber(mu));
    c.setValue("sigmaA", formatNumber(sigma));
    c.setValue("sigmaB", formatNumber(sigma));
    c.setHighlight("mu", true, COLOR_MU);
    c.setHighlight("sigmaA", true, COLOR_SIGMA);
    c.setHighlight("sigmaB", true, COLOR_SIGMA);
  }, [mu, sigma]);

  const pct = (p: number) => `${formatNumber(p * 100, 1)}%`;

  return (
    <div
      id="normal-operation"
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5"
    >
      {/* ① μ スライダー */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="normal-mu" className="text-sm font-semibold text-slate-700">
            平均 μ（山の位置）
          </label>
          <span className="font-mono text-sm" style={{ color: COLOR_MU }}>
            μ = {formatNumber(mu)}
          </span>
        </div>
        <input
          id="normal-mu"
          type="range"
          min={MU_MIN}
          max={MU_MAX}
          step={0.5}
          value={mu}
          onChange={(e) => setControl("mu", Number(e.target.value))}
          className="w-full accent-green-600"
          aria-label="平均 μ"
        />
      </div>

      {/* ② σ スライダー */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="normal-sigma" className="text-sm font-semibold text-slate-700">
            標準偏差 σ（山の広がり）
          </label>
          <span className="font-mono text-sm" style={{ color: COLOR_SIGMA }}>
            σ = {formatNumber(sigma)}（σ² = {formatNumber(variance)}）
          </span>
        </div>
        <input
          id="normal-sigma"
          type="range"
          min={SIGMA_MIN}
          max={SIGMA_MAX}
          step={0.1}
          value={sigma}
          onChange={(e) => setControl("sigma", Number(e.target.value))}
          className="w-full accent-blue-600"
          aria-label="標準偏差 σ"
        />
      </div>

      {/* ③ 強連動する数式（μ・σ に現在値を差し込み＋ハイライト） */}
      <div className="rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>

      {/* ④ 密度曲線（±kσ の帯つき） */}
      <NormalCurve
        curve={curve}
        mu={mu}
        sigma={sigma}
        axisMin={AXIS_MIN}
        axisMax={AXIS_MAX}
        yMax={Y_MAX}
        bands={bands}
        activeK={activeK}
      />

      {/* ⑤ ±kσ の選択（帯ハイライト＋確率コールアウト連動） */}
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3].map((k) => {
          const active = activeK === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setActiveK(k)}
              aria-pressed={active}
              className={`rounded-lg border px-3 py-2 text-sm transition ${
                active
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              ±{k}σ
              <span className={`ml-1 text-xs ${active ? "text-blue-100" : "text-slate-400"}`}>
                {pct(probByK[k])}
              </span>
            </button>
          );
        })}
      </div>

      <Callout
        title={`μ ± ${activeK}σ の範囲`}
        body={`この区間に観測値が入る確率は約 ${pct(probByK[activeK])}。μ・σ をどう動かしても、この割合は変わりません（形が相似だから）。`}
        note="σ を 2 倍にすると山は低く・横に広がりますが、±kσ の中に入る確率（68-95-99.7）は不変です。"
        kind="explain"
      />

      <p className="text-xs leading-relaxed text-slate-500">
        ヒント: μ を動かすと山が横にスライド、σ を動かすと高さと広がりが変わります。 数式の{" "}
        <span style={{ color: COLOR_MU }}>μ</span>・<span style={{ color: COLOR_SIGMA }}>σ</span>{" "}
        の数値が同時に追従します。
      </p>
    </div>
  );
}
