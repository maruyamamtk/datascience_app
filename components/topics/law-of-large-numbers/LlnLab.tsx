"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { runningMeans } from "@/lib/stats/convergence";
import { DISTRIBUTIONS, getDistribution } from "@/lib/stats/distributions";
import { mulberry32 } from "@/lib/stats/random";
import { useLlnStore } from "@/lib/store/law-of-large-numbers";

const TOTAL = 500;
const W = 360;
const H = 150;
const PAD = { top: 12, right: 12, bottom: 22, left: 30 };

const COLOR_MEAN = "#2563eb"; // 累積平均
const COLOR_MU = "#7c3aed"; // 母平均 μ
const COLOR_BAND = "#7c3aed"; // μ±SE 帯

// 累積平均が母平均へ収束する。x̄_n と μ・|差| の項に id を付け操作で差し込み＋ハイライト。
const FORMULA = `\\bar X_n=${term("xbar", "\\bar X_n")}\\ \\xrightarrow[n\\to\\infty]{}\\ \\mu=${term(
  "mu",
  "\\mu",
)}\\quad |\\bar X_n-\\mu|=${term("diff", "0")}`;

export function LlnLab() {
  const distKind = useLlnStore((s) => s.controls.distKind);
  const revealed = useLlnStore((s) => s.controls.revealed);
  const { mu, sigma, se } = useLlnStore((s) => s.derived);
  const setControl = useLlnStore((s) => s.setControl);

  const [seed, setSeed] = useState(20240601);
  const samples = useMemo(() => {
    const rng = mulberry32(seed);
    const dist = getDistribution(distKind);
    return Array.from({ length: TOTAL }, () => dist.sample(rng));
  }, [distKind, seed]);
  const means = useMemo(() => runningMeans(samples), [samples]);

  const currentMean = means[Math.min(means.length - 1, revealed - 1)] ?? mu;

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const c = mathRef.current;
    if (!c) return;
    c.setValue("xbar", formatNumber(currentMean));
    c.setValue("mu", formatNumber(mu));
    c.setValue("diff", formatNumber(Math.abs(currentMean - mu)));
    c.setHighlight("xbar", true, COLOR_MEAN);
    c.setHighlight("mu", true, COLOR_MU);
    c.setHighlight("diff", true, COLOR_BAND);
  }, [currentMean, mu]);

  const resample = useCallback(() => setSeed((Date.now() & 0xffffffff) >>> 0), []);

  // 折れ線（log 横軸で序盤の揺れと収束を両方見せる）。
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const yLo = mu - 3 * sigma;
  const yHi = mu + 3 * sigma;
  const toX = (i: number) => PAD.left + (Math.log(i + 1) / Math.log(TOTAL)) * plotW;
  const toY = (v: number) =>
    PAD.top + (1 - Math.max(0, Math.min(1, (v - yLo) / (yHi - yLo)))) * plotH;

  const linePath = means
    .slice(0, revealed)
    .map((m, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(m).toFixed(1)}`)
    .join(" ");

  // μ±SE 帯（n に応じて狭まる）の上下を log 軸で描く。
  const bandTop: string[] = [];
  const bandBot: string[] = [];
  for (let i = 0; i < revealed; i++) {
    const seI = sigma / Math.sqrt(i + 1);
    bandTop.push(`${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(mu + seI).toFixed(1)}`);
    bandBot.push(`${toX(i).toFixed(1)},${toY(mu - seI).toFixed(1)}`);
  }
  const bandPath = `${bandTop.join(" ")} L${bandBot.reverse().join(" L")} Z`;

  return (
    <div id="lln-operation" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      {/* 元分布セレクタ */}
      <div className="flex flex-wrap items-center gap-2">
        {DISTRIBUTIONS.map((d) => (
          <button
            key={d.kind}
            type="button"
            onClick={() => setControl("distKind", d.kind)}
            aria-pressed={distKind === d.kind}
            className={`rounded-lg border px-3 py-1.5 text-sm transition ${
              distKind === d.kind
                ? "border-blue-500 bg-blue-50 font-semibold text-blue-700"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {d.label}
          </button>
        ))}
        <button
          type="button"
          onClick={resample}
          className="ml-auto rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
        >
          引き直す
        </button>
      </div>

      {/* n スライダー */}
      <div className="space-y-1">
        <label htmlFor="lln-n" className="text-sm font-semibold text-slate-700">
          標本数 n = {revealed}（母平均 μ={formatNumber(mu)}）
        </label>
        <input
          id="lln-n"
          type="range"
          min={1}
          max={TOTAL}
          step={1}
          value={revealed}
          onChange={(e) => setControl("revealed", Number(e.target.value))}
          className="w-full accent-blue-600"
          aria-label="標本数 n"
        />
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="累積平均の収束"
        data-testid="lln-plot"
      >
        {/* μ±SE 帯 */}
        <path d={bandPath} fill={COLOR_BAND} opacity={0.1} />
        {/* 母平均 μ の水平線 */}
        <line
          x1={PAD.left}
          y1={toY(mu)}
          x2={W - PAD.right}
          y2={toY(mu)}
          stroke={COLOR_MU}
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
        <text
          x={W - PAD.right}
          y={toY(mu) - 3}
          textAnchor="end"
          className="fill-violet-700 text-[10px] font-semibold"
        >
          μ={formatNumber(mu)}
        </text>
        {/* 累積平均の折れ線 */}
        <path d={linePath} fill="none" stroke={COLOR_MEAN} strokeWidth={2} />
        {/* 現在点 */}
        <circle cx={toX(revealed - 1)} cy={toY(currentMean)} r={3} fill={COLOR_MEAN} />
      </svg>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>
      <p className="text-center font-mono text-sm text-slate-600">
        x̄_{revealed} = {formatNumber(currentMean)}・SE = σ/√n = {formatNumber(se)}
      </p>

      <Callout
        title="大数の法則：標本平均は母平均へ収束する"
        body={`n=${revealed} のとき x̄ = ${formatNumber(currentMean)}、母平均 μ=${formatNumber(
          mu,
        )} との差は ${formatNumber(Math.abs(currentMean - mu))}。n を増やすほど帯（μ±σ/√n）が狭まり、平均は μ に張り付く。`}
        note="序盤は大きく揺れるが、√n に反比例して «ばらつき» が縮む（確率収束）。元分布が指数のように歪んでいても成り立つ。"
        kind="explain"
      />
    </div>
  );
}
