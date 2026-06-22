"use client";

import { useCallback, useEffect, useState } from "react";
import { MathFormula } from "@/components/math/MathFormula";
import type { TermController } from "@/components/math/term-controller";
import { formatNumber, term } from "@/components/math/tex";
import { standardError } from "@/lib/stats/clt";
import { createTopicStore } from "@/lib/store/topicStore";

// PoC 専用のローカルストア（σ スライダー → SE のデモ）。本番の usePocStore は元分布 + n を
// 操作値に持つ別物なので、3 層疎結合パターンの実証はこの最小ストアで自己完結させる。
const usePocStore = createTopicStore<{ sigma: number; n: number }, { standardError: number }>({
  initialControls: { sigma: 10, n: 4 },
  derive: ({ sigma, n }) => ({ standardError: standardError(sigma, n) }),
});

// 数式は static（項に id を付けるだけ）。数値はストア購読 → DOM 差分パッチで差し込む。
const FORMULA = `\\mathrm{SE}(\\bar X) \\;=\\; \\dfrac{${term("sigma", "\\sigma")}}{\\sqrt{${term(
  "n",
  "n",
)}}} \\;=\\; ${term("se", "?")}`;

const COLORS = {
  sigma: "#9333ea", // purple
  n: "#2563eb", // blue
  se: "#16a34a", // green
} as const;

/**
 * Issue #3 配線パターンの実証 PoC。
 * Control（スライダー）→ Store（usePocStore, single source of truth）→
 * Render（Math = KaTeX 項パッチ / Graph = SVG バー / 数値表示）。
 * 3 つの描画は同一ストアを購読し、1 つの操作変更が全てに一貫反映される。
 */
export function StorePoc() {
  return (
    <div className="space-y-8">
      <MathView />
      <GraphView />
      <Controls />
      <Readout />
      <p className="text-sm leading-relaxed text-slate-600">
        スライダー（Control）を動かすと <code>usePocStore</code> の操作値だけが変わり、 派生値 SE
        は計算層 <code>deriveClt</code> が再計算します。 Math・Graph・数値表示は
        <strong>同じストアを購読</strong>しているので、1 つの操作変更が全てに一貫して反映されます。
        n を4倍にすると SE が半分（バーも半分）になることを確認してください。
      </p>
    </div>
  );
}

/** Render 層: 数式。ストアの操作値・派生値を購読し、該当項だけ DOM 差分パッチする。 */
function MathView() {
  const sigma = usePocStore((s) => s.controls.sigma);
  const n = usePocStore((s) => s.controls.n);
  const se = usePocStore((s) => s.derived.standardError);
  const [controller, setController] = useState<TermController | null>(null);
  const handleReady = useCallback((c: TermController) => setController(c), []);

  useEffect(() => {
    if (!controller) return;
    controller.setValue("sigma", formatNumber(sigma));
    controller.setValue("n", String(n));
    controller.setValue("se", formatNumber(se));
    controller.setHighlight("sigma", true, COLORS.sigma);
    controller.setHighlight("n", true, COLORS.n);
    controller.setHighlight("se", true, COLORS.se);
  }, [controller, sigma, n, se]);

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-10 text-center text-2xl"
      data-testid="formula"
    >
      <MathFormula tex={FORMULA} onReady={handleReady} />
    </div>
  );
}

/** Render 層: グラフ。ストアの派生値 SE だけを購読し、バー長で可視化する。 */
function GraphView() {
  const se = usePocStore((s) => s.derived.standardError);
  // σ_max=30, n_min=1 のとき SE_max=30。それを 100% に正規化してバー幅にする。
  const ratio = Number.isFinite(se) ? Math.min(se / 30, 1) : 0;

  return (
    <div className="rounded-2xl border border-slate-200 px-6 py-6">
      <p className="mb-3 text-sm font-medium text-slate-700">
        標準誤差 SE の大きさ（同一ストアを購読する Graph 層）
      </p>
      <div className="h-8 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-[width] duration-150 ease-out"
          style={{ width: `${ratio * 100}%`, backgroundColor: COLORS.se }}
          data-testid="se-bar"
          aria-label={`SE バー 幅 ${Math.round(ratio * 100)}%`}
        />
      </div>
    </div>
  );
}

/** Control 層: 操作 UI。ストアの action を呼ぶだけ（描画も計算も持たない）。 */
function Controls() {
  const sigma = usePocStore((s) => s.controls.sigma);
  const n = usePocStore((s) => s.controls.n);
  const setControl = usePocStore((s) => s.setControl);
  const reset = usePocStore((s) => s.reset);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <SliderControl
          label="母標準偏差 σ"
          color={COLORS.sigma}
          min={1}
          max={30}
          step={1}
          value={sigma}
          onChange={(v) => setControl("sigma", v)}
          display={formatNumber(sigma)}
        />
        <SliderControl
          label="標本サイズ n"
          color={COLORS.n}
          min={1}
          max={200}
          step={1}
          value={n}
          onChange={(v) => setControl("n", v)}
          display={String(n)}
        />
      </div>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        初期値に戻す
      </button>
    </div>
  );
}

/** Render 層: 数値表示。ストアの派生値を購読する 3 つ目の購読者。 */
function Readout() {
  const se = usePocStore((s) => s.derived.standardError);

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl bg-slate-900 px-5 py-4 text-slate-100">
      <p className="text-sm">
        標準誤差{" "}
        <span className="font-mono text-base" style={{ color: COLORS.se }} data-testid="se-value">
          SE = {formatNumber(se)}
        </span>
      </p>
    </div>
  );
}

type SliderControlProps = {
  label: string;
  color: string;
  min: number;
  max: number;
  step: number;
  value: number;
  display: string;
  onChange: (value: number) => void;
};

function SliderControl({
  label,
  color,
  min,
  max,
  step,
  value,
  display,
  onChange,
}: SliderControlProps) {
  return (
    <label className="block space-y-2">
      <span className="flex items-baseline justify-between text-sm font-medium text-slate-700">
        {label}
        <span className="font-mono text-base" style={{ color }}>
          {display}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-current"
        style={{ color }}
        aria-label={label}
      />
    </label>
  );
}
