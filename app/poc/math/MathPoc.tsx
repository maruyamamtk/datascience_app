"use client";

import { useCallback, useEffect, useState } from "react";
import { MathFormula } from "@/components/math/MathFormula";
import type { TermController } from "@/components/math/term-controller";
import { formatNumber, standardError, term } from "@/components/math/tex";

// 数式は static（項に id を付けるだけ）。数値はマウント後に DOM 差分パッチで差し込むため、
// この tex 文字列は再描画トリガにならない（= KaTeX 全体の再描画を避ける）。
const FORMULA = `\\mathrm{SE}(\\bar X) \\;=\\; \\dfrac{${term("sigma", "\\sigma")}}{\\sqrt{${term(
  "n",
  "n",
)}}} \\;=\\; ${term("se", "?")}`;

const COLORS = {
  sigma: "#9333ea", // purple
  n: "#2563eb", // blue
  se: "#16a34a", // green
} as const;

export function MathPoc() {
  const [sigma, setSigma] = useState(10);
  const [n, setN] = useState(4);
  const [controller, setController] = useState<TermController | null>(null);
  const [fps, setFps] = useState(0);

  const handleReady = useCallback((c: TermController) => setController(c), []);

  // 操作値が変わるたびに、該当項だけを DOM 差分パッチ（数値 + ハイライト）。
  useEffect(() => {
    if (!controller) return;
    controller.setValue("sigma", formatNumber(sigma));
    controller.setValue("n", String(n));
    controller.setValue("se", formatNumber(standardError(sigma, n)));
    controller.setHighlight("sigma", true, COLORS.sigma);
    controller.setHighlight("n", true, COLORS.n);
    controller.setHighlight("se", true, COLORS.se);
  }, [controller, sigma, n]);

  // fps 計測（rAF で 500ms ウィンドウごとに算出）。連続操作中の描画スループットの目安。
  useEffect(() => {
    let raf = 0;
    let frames = 0;
    let last = performance.now();
    const loop = (now: number) => {
      frames += 1;
      const elapsed = now - last;
      if (elapsed >= 500) {
        setFps(Math.round((frames * 1000) / elapsed));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const se = standardError(sigma, n);

  return (
    <div className="space-y-8">
      <div
        className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-10 text-center text-2xl"
        data-testid="formula"
      >
        <MathFormula tex={FORMULA} onReady={handleReady} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <SliderControl
          label="母標準偏差 σ"
          color={COLORS.sigma}
          min={1}
          max={30}
          step={1}
          value={sigma}
          onChange={setSigma}
          display={formatNumber(sigma)}
        />
        <SliderControl
          label="標本サイズ n"
          color={COLORS.n}
          min={1}
          max={200}
          step={1}
          value={n}
          onChange={setN}
          display={String(n)}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-900 px-5 py-4 text-slate-100">
        <p className="text-sm">
          標準誤差{" "}
          <span className="font-mono text-base" style={{ color: COLORS.se }} data-testid="se-value">
            SE = {formatNumber(se)}
          </span>
        </p>
        <p className="text-sm text-slate-300">
          描画 <span className="font-mono text-base text-emerald-400">{fps} fps</span>
        </p>
      </div>

      <p className="text-sm leading-relaxed text-slate-600">
        スライダーを動かすと、数式中の <span style={{ color: COLORS.sigma }}>σ</span>・
        <span style={{ color: COLORS.n }}>n</span>・<span style={{ color: COLORS.se }}>SE</span>{" "}
        の各項だけが（全体を再描画せずに）リアルタイムで数値・色更新されます。 n を4倍にすると SE
        が半分になることを確認してみてください。
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
