"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { marginalLogLikelihoodBetaBinomial, pointNullLogLikelihood } from "@/lib/stats/bayesian-basics";
import { useBayesianBasicsStore } from "@/lib/store/bayesian-basics";
import { BF_STRENGTH_LABEL, num, pct, round2 } from "./format";

const FORMULA = `\\mathrm{BF}_{10}=\\dfrac{m(D\\mid H_1)}{m(D\\mid H_0)}=\\dfrac{${term(
  "m1",
  "?",
)}}{${term("m0", "?")}}=${term("bf", "?")}`;

const W = 320;
const H = 70;
const PAD_X = 16;
// 対数10スケールで表示する範囲(1/300〜300程度)。
const LOG_MIN = -2.5;
const LOG_MAX = 2.5;

function logScaleX(bf: number): number {
  const clamped = Math.max(10 ** LOG_MIN, Math.min(10 ** LOG_MAX, bf));
  const t = (Math.log10(clamped) - LOG_MIN) / (LOG_MAX - LOG_MIN);
  return round2(PAD_X + t * (W - PAD_X * 2));
}

const BANDS: { from: number; to: number; color: string }[] = [
  { from: -2.5, to: -2, color: "#1d4ed8" },
  { from: -2, to: -1.48, color: "#2563eb" },
  { from: -1.48, to: -0.48, color: "#60a5fa" },
  { from: -0.48, to: 0.48, color: "#e2e8f0" },
  { from: 0.48, to: 1.48, color: "#fca5a5" },
  { from: 1.48, to: 2, color: "#ef4444" },
  { from: 2, to: 2.5, color: "#b91c1c" },
];

/**
 * ベイズファクター・ベイズ的仮説検定ラボ(Level2, 描画層/Control層)。
 * n回中k回成功というデータに対し、点仮説H0(θ=θ0)と複合仮説H1(θ~Beta(1,1))の
 * ベイズファクターBF10を計算し、頻度論の両側p値と並べて表示する
 * ——「同じデータでも、有意/非有意という二分と、証拠の強さの連続的な目安は別物」を体感する。
 */
export function BayesFactorLab() {
  const bfN = useBayesianBasicsStore((s) => s.controls.bfN);
  const bfK = useBayesianBasicsStore((s) => s.controls.bfK);
  const bfTheta0 = useBayesianBasicsStore((s) => s.controls.bfTheta0);
  const bf10 = useBayesianBasicsStore((s) => s.derived.bf10);
  const bfInterpretation = useBayesianBasicsStore((s) => s.derived.bfInterpretation);
  const pValue = useBayesianBasicsStore((s) => s.derived.pValue);
  const patchControls = useBayesianBasicsStore((s) => s.patchControls);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    const logM1 = marginalLogLikelihoodBetaBinomial({ alpha: 1, beta: 1 }, bfN, bfK);
    const logM0 = pointNullLogLikelihood(bfTheta0, bfN, bfK);
    m.setValue("m1", formatNumber(Math.exp(logM1), 4));
    m.setValue("m0", formatNumber(Math.exp(logM0), 4));
    m.setValue("bf", formatNumber(bf10, 2));
    m.setHighlight("bf", true, bf10 >= 1 ? "#ef4444" : "#2563eb");
  }, [bfN, bfK, bfTheta0, bf10]);

  const markerX = logScaleX(bf10);
  const pRejects = pValue < 0.05;

  return (
    <div id="bayes-factor-lab" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        「n回中k回成功」というデータに対し、θ=θ₀という点仮説(H0)と、θの値は分からず
        Beta(1,1)(一様)の事前分布を置く複合仮説(H1)を比較する。
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          試行数 n = {bfN}
          <input
            type="range"
            min={4}
            max={40}
            step={1}
            value={bfN}
            onChange={(e) => {
              const n = Number(e.target.value);
              patchControls({ bfN: n, bfK: Math.min(bfK, n) });
            }}
            aria-label="試行数n"
            data-testid="bf-n-slider"
            className="accent-blue-600"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          成功数 k = {bfK}
          <input
            type="range"
            min={0}
            max={bfN}
            step={1}
            value={bfK}
            onChange={(e) => patchControls({ bfK: Number(e.target.value) })}
            aria-label="成功数k"
            data-testid="bf-k-slider"
            className="accent-blue-600"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          点仮説 θ₀ = {num(bfTheta0, 2)}
          <input
            type="range"
            min={0.05}
            max={0.95}
            step={0.05}
            value={bfTheta0}
            onChange={(e) => patchControls({ bfTheta0: Number(e.target.value) })}
            aria-label="点仮説theta0"
            data-testid="bf-theta0-slider"
            className="accent-blue-600"
          />
        </label>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-md" role="img" aria-label="ベイズファクターの強さの目安(Jeffreysスケール)" data-testid="bf-scale-svg">
        {BANDS.map((b, i) => (
          <rect
            key={i}
            x={round2(PAD_X + ((b.from - LOG_MIN) / (LOG_MAX - LOG_MIN)) * (W - PAD_X * 2))}
            y={20}
            width={round2(((b.to - b.from) / (LOG_MAX - LOG_MIN)) * (W - PAD_X * 2))}
            height={16}
            fill={b.color}
          />
        ))}
        <line x1={markerX} y1={10} x2={markerX} y2={44} stroke="#0f172a" strokeWidth={2} data-testid="bf-marker" />
        <text x={markerX} y={8} textAnchor="middle" className="fill-slate-900 text-[9px] font-bold">
          BF₁₀={num(bf10, 2)}
        </text>
        <text x={PAD_X} y={50} className="fill-blue-700 text-[9px]">
          ← H0(θ=θ₀)を支持
        </text>
        <text x={W - PAD_X} y={50} textAnchor="end" className="fill-red-700 text-[9px]">
          H1(θ不明)を支持 →
        </text>
      </svg>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} display={false} />
      </div>

      <div className="grid grid-cols-1 gap-3 text-center text-sm sm:grid-cols-2">
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <div className="font-semibold text-slate-700">ベイズ的結論</div>
          <div className="mt-1 text-slate-900" data-testid="bf-conclusion">
            {bfInterpretation.favors === "none"
              ? "どちらの仮説も優劣なし"
              : `${bfInterpretation.favors === "H1" ? "H1(θ不明)" : "H0(θ=θ₀)"}を支持——${BF_STRENGTH_LABEL[bfInterpretation.strength]}`}
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <div className="font-semibold text-slate-700">頻度論の結論(両側p値)</div>
          <div className="mt-1 text-slate-900" data-testid="p-value-conclusion">
            p = {pct(pValue, 2)}({pRejects ? "α=5%で有意(H0棄却)" : "α=5%で有意でない"})
          </div>
        </div>
      </div>

      <Callout
        title="p値とベイズファクターは別の問いに答えている"
        body="p値は「H0が正しいと仮定したとき、観測以上に極端な結果が起きる確率」——H0の真偽そのものの確率ではない。ベイズファクターは「このデータがH0とH1のどちらをどれだけ強く支持するか」という比を直接与える。"
        note="nを小さくしたまま極端なk(例: 全部成功)にすると、p値は非常に小さく«有意»になるのに、ベイズファクターは«中程度»止まりのことがある——標本サイズが小さいと両者の結論が食い違いやすい。"
        kind="explain"
      />
    </div>
  );
}
