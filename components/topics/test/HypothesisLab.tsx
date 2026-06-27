"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import type { Alternative } from "@/lib/stats/test";
import { useTestStore } from "@/lib/store/test";
import { TwoDistChart } from "./TwoDistChart";

// H1 側の検定統計量の中心 δ=d√n。d・n・δ 項に id を付け、操作のたびに現在値を差し込み＋ハイライト。
const FORMULA = `Z=\\dfrac{\\bar x-\\mu_0}{\\sigma/\\sqrt n}\\;\\Rightarrow\\;\\delta=${term(
  "d",
  "d",
)}\\sqrt{${term("n", "n")}}=${term("delta", "\\delta")}`;

const D_MIN = 0;
const D_MAX = 1.5;
const N_MIN = 5;
const N_MAX = 100;
const ALPHA_OPTIONS = [0.1, 0.05, 0.01] as const;

const COLOR_D = "#0f766e"; // 効果量 d（H1 側）
const COLOR_N = "#2563eb"; // n
const COLOR_DELTA = "#7c3aed"; // δ（結果）

const ALT_LABELS: Record<Alternative, string> = {
  "two-sided": "両側 (μ≠μ₀)",
  greater: "右片側 (μ>μ₀)",
  less: "左片側 (μ<μ₀)",
};

/**
 * 仮説検定 操作ラボ（描画層 / Control 層）。
 * 効果量 d・標本サイズ n・有意水準 α・片側/両側を操作すると、H0:N(0,1) と H1:N(δ,1) の 2 分布の重なりが
 * 動き、棄却域・α(第一種)・β(第二種)・検出力が塗り分けで連動する。同時に数式 δ=d√n の d・n・δ 項へ
 * 現在値を差し込み＋ハイライトする（操作→グラフ→数式の強連動, 受け入れ条件）。
 * 操作値は useTestStore が single source of truth。
 */
export function HypothesisLab() {
  const effectSize = useTestStore((s) => s.controls.effectSize);
  const n = useTestStore((s) => s.controls.n);
  const alpha = useTestStore((s) => s.controls.alpha);
  const alternative = useTestStore((s) => s.controls.alternative);
  const { delta, critical, pValue, power, beta } = useTestStore((s) => s.derived);
  const setControl = useTestStore((s) => s.setControl);

  // 数式の項を差し込み＋ハイライト（全体再描画はせず TermController で DOM 差分パッチ）。
  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const c = mathRef.current;
    if (!c) return;
    c.setValue("d", formatNumber(effectSize));
    c.setValue("n", String(n));
    c.setValue("delta", formatNumber(delta));
    c.setHighlight("d", true, COLOR_D);
    c.setHighlight("n", true, COLOR_N);
    c.setHighlight("delta", true, COLOR_DELTA);
  }, [effectSize, n, delta]);

  return (
    <div id="test-operation" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
      {/* ① 効果量 d */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="ht-d" className="text-sm font-semibold text-slate-700">
            効果量 d =(μ₁−μ₀)/σ（H₀ と H₁ の距離）
          </label>
          <span className="font-mono text-sm" style={{ color: COLOR_D }}>
            d = {formatNumber(effectSize)}
          </span>
        </div>
        <input
          id="ht-d"
          type="range"
          min={D_MIN}
          max={D_MAX}
          step={0.1}
          value={effectSize}
          onChange={(e) => setControl("effectSize", Number(e.target.value))}
          className="w-full accent-teal-700"
          aria-label="効果量 d"
        />
      </div>

      {/* ② 標本サイズ n */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="ht-n" className="text-sm font-semibold text-slate-700">
            標本サイズ n（増やすほど検出力↑）
          </label>
          <span className="font-mono text-sm" style={{ color: COLOR_N }}>
            n = {n}
          </span>
        </div>
        <input
          id="ht-n"
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

      {/* ③ 有意水準 α */}
      <div className="space-y-2">
        <span className="text-sm font-semibold text-slate-700">
          有意水準 α（第一種の過誤の許容）
        </span>
        <div className="flex gap-2">
          {ALPHA_OPTIONS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setControl("alpha", a)}
              aria-pressed={alpha === a}
              className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                alpha === a
                  ? "border-red-500 bg-red-50 font-semibold text-red-700"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* ④ 対立仮説（片側/両側） */}
      <div className="space-y-2">
        <span className="text-sm font-semibold text-slate-700">対立仮説</span>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(ALT_LABELS) as Alternative[]).map((alt) => (
            <button
              key={alt}
              type="button"
              onClick={() => setControl("alternative", alt)}
              aria-pressed={alternative === alt}
              className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                alternative === alt
                  ? "border-slate-800 bg-slate-800 font-semibold text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {ALT_LABELS[alt]}
            </button>
          ))}
        </div>
      </div>

      {/* ⑤ 強連動する数式（d・n・δ に現在値を差し込み＋ハイライト） */}
      <div className="rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>

      {/* ⑥ 2分布の重ね描き（棄却域・α・β・検出力の塗り分け） */}
      <TwoDistChart delta={delta} critical={critical} alternative={alternative} />

      {/* 凡例 */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-3 rounded-sm" style={{ backgroundColor: "#dc2626", opacity: 0.45 }} />α（第一種）
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-3 rounded-sm" style={{ backgroundColor: "#f59e0b", opacity: 0.4 }} />β（第二種）
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-3 rounded-sm" style={{ backgroundColor: "#16a34a", opacity: 0.4 }} />検出力 1−β
        </span>
      </div>

      {/* ⑦ 数値パネル */}
      <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
        <Metric label="臨界値" value={`±${formatNumber(critical)}`} color="#1e293b" />
        <Metric label="p値 (z=δ)" value={formatNumber(pValue)} color={COLOR_DELTA} />
        <Metric label="β（第二種）" value={formatNumber(beta)} color="#b45309" />
        <Metric label="検出力 1−β" value={formatNumber(power)} color="#16a34a" />
      </div>

      <Callout
        title="α を下げると β が上がる／n を増やすと検出力が上がる"
        body={`いまは d=${formatNumber(effectSize)}, n=${n}, α=${alpha}（${
          ALT_LABELS[alternative]
        }）→ 検出力 1−β=${formatNumber(power)}, β=${formatNumber(beta)}。α を小さくすると臨界線が外へ動き、H1 の採択域（橙=β）が広がって検出力は下がります。`}
        note="効果量 d を 0 にすると H1 が H0 に重なり、検出力は α まで下がります（区別できない）。"
        kind="explain"
      />

      <p className="text-xs leading-relaxed text-slate-500">
        ヒント: <span style={{ color: COLOR_D }}>効果量 d</span>・<span style={{ color: COLOR_N }}>n</span>{" "}
        を上げると H₁ 分布が右へ離れて<span style={{ color: "#16a34a" }}>検出力（緑）</span>が増え、
        <span style={{ color: "#dc2626" }}>α（赤）</span>を下げると臨界線が外へ動いて
        <span style={{ color: "#b45309" }}>β（橙）</span>が広がります。
      </p>
    </div>
  );
}

/** 数値パネルの 1 セル。 */
function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="font-mono text-base font-semibold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
