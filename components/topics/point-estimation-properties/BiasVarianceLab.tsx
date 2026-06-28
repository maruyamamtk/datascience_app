"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { simulateVarianceEstimators } from "@/lib/stats/estimator-properties";
import { histogram } from "@/lib/stats/histogram";
import { mulberry32 } from "@/lib/stats/random";
import { EST_SIGMA, useEstPropStore } from "@/lib/store/point-estimation-properties";

const TRIALS = 2000;
const W = 360;
const H = 150;
const PAD = { top: 12, right: 12, bottom: 22, left: 14 };
const AXIS_MIN = 0;
const AXIS_MAX = 12;
const BINS = 30;

const COLOR_BIASED = "#dc2626"; // 偏り分散 1/n
const COLOR_UNBIASED = "#2563eb"; // 不偏分散 1/(n-1)
const COLOR_TRUE = "#16a34a"; // 真値 σ²

// MSE = バイアス² + 分散（偏り分散について）。各項に id を付け、n 操作で差し込み＋ハイライト。
const FORMULA = `\\mathrm{MSE}=${term("mse", "?")}=\\underbrace{${term(
  "bias2",
  "?",
)}}_{\\text{バイアス}^2}+\\underbrace{${term("var", "?")}}_{\\text{分散}}`;

export function BiasVarianceLab() {
  const n = useEstPropStore((s) => s.controls.n);
  const { trueVar } = useEstPropStore((s) => s.derived);
  const setControl = useEstPropStore((s) => s.setControl);

  const [seed, setSeed] = useState(424242);
  const sim = useMemo(
    () =>
      simulateVarianceEstimators({
        mu: 0,
        sigma: EST_SIGMA,
        n,
        trials: TRIALS,
        rng: mulberry32(seed),
      }),
    [n, seed],
  );

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const c = mathRef.current;
    if (!c) return;
    c.setValue("mse", formatNumber(sim.biased.mse));
    c.setValue("bias2", formatNumber(sim.biased.bias ** 2));
    c.setValue("var", formatNumber(sim.biased.variance));
    c.setHighlight("mse", true, COLOR_BIASED);
    c.setHighlight("bias2", true, "#7c3aed");
    c.setHighlight("var", true, COLOR_UNBIASED);
  }, [sim]);

  const hBiased = useMemo(
    () => histogram(sim.biased.estimates, { min: AXIS_MIN, max: AXIS_MAX, bins: BINS }),
    [sim],
  );
  const hUnbiased = useMemo(
    () => histogram(sim.unbiased.estimates, { min: AXIS_MIN, max: AXIS_MAX, bins: BINS }),
    [sim],
  );
  const maxCount = Math.max(...hBiased.map((b) => b.count), ...hUnbiased.map((b) => b.count), 1);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const toX = (v: number) => PAD.left + ((v - AXIS_MIN) / (AXIS_MAX - AXIS_MIN)) * plotW;
  const toY = (c: number) => PAD.top + (1 - c / maxCount) * plotH;
  const barW = plotW / BINS;

  const meanBiased = trueVar + sim.biased.bias;

  return (
    <div
      id="estprop-operation"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="ep-n" className="text-sm font-semibold text-slate-700">
          各標本のサイズ n = {n}
        </label>
        <input
          id="ep-n"
          type="range"
          min={2}
          max={40}
          step={1}
          value={n}
          onChange={(e) => setControl("n", Number(e.target.value))}
          className="flex-1 accent-blue-600"
          aria-label="標本サイズ n"
        />
        <button
          type="button"
          onClick={() => setSeed((Date.now() & 0xffffffff) >>> 0)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
        >
          引き直す
        </button>
      </div>

      <p className="text-xs text-slate-500">
        母 N(0, σ²={trueVar}) から サイズ n を {TRIALS} 回抽出し、各標本で 2
        つの分散推定量を計算した標本分布
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="2つの分散推定量の標本分布"
        data-testid="estprop-hist"
      >
        {hUnbiased.map((b, i) => (
          <rect
            key={`u${i}`}
            x={toX(b.x0)}
            y={toY(b.count)}
            width={barW}
            height={toY(0) - toY(b.count)}
            fill={COLOR_UNBIASED}
            opacity={0.4}
          />
        ))}
        {hBiased.map((b, i) => (
          <rect
            key={`b${i}`}
            x={toX(b.x0)}
            y={toY(b.count)}
            width={barW}
            height={toY(0) - toY(b.count)}
            fill={COLOR_BIASED}
            opacity={0.4}
          />
        ))}
        {/* 真値 σ² */}
        <line
          x1={toX(trueVar)}
          y1={PAD.top}
          x2={toX(trueVar)}
          y2={toY(0)}
          stroke={COLOR_TRUE}
          strokeWidth={2}
        />
        <text
          x={toX(trueVar)}
          y={PAD.top - 1}
          textAnchor="middle"
          className="fill-green-700 text-[10px] font-semibold"
        >
          σ²={trueVar}
        </text>
        {/* 偏り分散の平均（真値より左にずれる） */}
        <line
          x1={toX(meanBiased)}
          y1={PAD.top + 6}
          x2={toX(meanBiased)}
          y2={toY(0)}
          stroke={COLOR_BIASED}
          strokeWidth={1}
          strokeDasharray="3 2"
        />
      </svg>

      <div className="grid grid-cols-2 gap-3 text-center text-xs">
        <div className="rounded-lg border border-red-200 bg-red-50 p-2">
          <p className="font-semibold text-red-700">偏り分散 S²ₙ（1/n）</p>
          <p className="font-mono text-slate-700">
            バイアス {formatNumber(sim.biased.bias)}／分散 {formatNumber(sim.biased.variance)}／MSE{" "}
            {formatNumber(sim.biased.mse)}
          </p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-2">
          <p className="font-semibold text-blue-700">不偏分散 s²（1/(n−1)）</p>
          <p className="font-mono text-slate-700">
            バイアス {formatNumber(sim.unbiased.bias)}／分散 {formatNumber(sim.unbiased.variance)}
            ／MSE {formatNumber(sim.unbiased.mse)}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>

      <Callout
        title="不偏性とMSE：バイアスと分散のトレードオフ"
        body={`不偏分散はバイアス≈0（${formatNumber(
          sim.unbiased.bias,
        )}）だが分散はやや大きい。偏り分散（1/n）はバイアス ${formatNumber(
          sim.biased.bias,
        )}（σ²/n だけ下にずれる）が分散は小さく、MSE は ${formatNumber(sim.biased.mse)}。n を増やすと両者の差は消える。`}
        note="MSE = バイアス² + 分散。不偏（バイアス0）が常に最良とは限らない——少し偏らせて分散を下げ MSE を小さくする推定量もある（縮小推定）。"
        kind="explain"
      />
    </div>
  );
}
