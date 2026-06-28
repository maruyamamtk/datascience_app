"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { simulateMleSampling, stdNormalPdf } from "@/lib/stats/asymptotics";
import { histogram } from "@/lib/stats/histogram";
import { mulberry32 } from "@/lib/stats/random";
import { TRUE_LAMBDA, useAsymptoticStore } from "@/lib/store/asymptotic-properties";

const TRIALS = 2500;
const W = 360;
const H = 150;
const PAD = { top: 12, right: 12, bottom: 22, left: 14 };
const AXIS_MIN = 0;
const AXIS_MAX = 4;
const BINS = 36;

const COLOR_HIST = "#2563eb";
const COLOR_NORMAL = "#dc2626";
const COLOR_TRUE = "#16a34a";

// 最尤推定量の漸近正規性 λ̂ ≈ N(λ, λ²/n)。λ・n・λ²/n の項に id を付け、n 操作で差し込み＋ハイライト。
const FORMULA = `\\hat\\lambda\\ \\approx\\ N\\!\\left(${term("lam", "\\lambda")},\\ \\dfrac{${term(
  "lam2",
  "\\lambda^2",
)}}{${term("n", "n")}}=${term("avar", "?")}\\right)`;

export function AsymptoticLab() {
  const n = useAsymptoticStore((s) => s.controls.n);
  const { trueLambda, fisherInfo, asymptoticVar, asymptoticSd } = useAsymptoticStore(
    (s) => s.derived,
  );
  const setControl = useAsymptoticStore((s) => s.setControl);

  const [seed, setSeed] = useState(31337);
  const sim = useMemo(
    () =>
      simulateMleSampling({ trueLambda: TRUE_LAMBDA, n, trials: TRIALS, rng: mulberry32(seed) }),
    [n, seed],
  );

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const c = mathRef.current;
    if (!c) return;
    c.setValue("lam", formatNumber(trueLambda));
    c.setValue("lam2", formatNumber(trueLambda * trueLambda));
    c.setValue("n", String(n));
    c.setValue("avar", formatNumber(asymptoticVar, 3));
    c.setHighlight("lam", true, COLOR_TRUE);
    c.setHighlight("n", true, COLOR_HIST);
    c.setHighlight("avar", true, COLOR_NORMAL);
  }, [trueLambda, n, asymptoticVar]);

  const hist = useMemo(
    () => histogram(sim.estimates, { min: AXIS_MIN, max: AXIS_MAX, bins: BINS }),
    [sim],
  );
  const maxCount = Math.max(...hist.map((b) => b.count), 1);
  const binW = (AXIS_MAX - AXIS_MIN) / BINS;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const toX = (v: number) => PAD.left + ((v - AXIS_MIN) / (AXIS_MAX - AXIS_MIN)) * plotW;
  const toYcount = (c: number) => PAD.top + (1 - c / maxCount) * plotH;
  const barW = plotW / BINS;

  // 漸近正規 N(λ, λ²/n) を «ヒストグラムと同尺度» に（密度×総数×ビン幅）。座標変換は安定なので毎描画計算で十分軽い。
  const sd = asymptoticSd || 1e-6;
  const normalPath = Array.from({ length: 101 }, (_, i) => {
    const x = AXIS_MIN + (i / 100) * (AXIS_MAX - AXIS_MIN);
    const density = stdNormalPdf((x - trueLambda) / sd) / sd;
    const countScale = density * TRIALS * binW;
    return `${i === 0 ? "M" : "L"}${toX(x).toFixed(1)},${toYcount(countScale).toFixed(1)}`;
  }).join(" ");

  return (
    <div
      id="asymptotic-operation"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="as-n" className="text-sm font-semibold text-slate-700">
          各標本のサイズ n = {n}
        </label>
        <input
          id="as-n"
          type="range"
          min={3}
          max={200}
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
        Exp(λ={trueLambda}) から サイズ n を {TRIALS} 回抽出し、各標本の最尤推定 λ̂=1/x̄
        を集めた標本分布（青）と漸近正規 N(λ, λ²/n)（赤）
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="最尤推定量の漸近正規性"
        data-testid="asymptotic-hist"
      >
        {hist.map((b, i) => (
          <rect
            key={i}
            x={toX(b.x0)}
            y={toYcount(b.count)}
            width={barW}
            height={toYcount(0) - toYcount(b.count)}
            fill={COLOR_HIST}
            opacity={0.45}
          />
        ))}
        <path d={normalPath} fill="none" stroke={COLOR_NORMAL} strokeWidth={2} />
        <line
          x1={toX(trueLambda)}
          y1={PAD.top}
          x2={toX(trueLambda)}
          y2={toYcount(0)}
          stroke={COLOR_TRUE}
          strokeWidth={2}
        />
        <text
          x={toX(trueLambda)}
          y={PAD.top - 1}
          textAnchor="middle"
          className="fill-green-700 text-[10px] font-semibold"
        >
          λ={trueLambda}
        </text>
      </svg>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>
      <p className="text-center font-mono text-sm text-slate-600">
        フィッシャー情報量 I(λ)=1/λ²={formatNumber(fisherInfo, 3)}・漸近SD=√(λ²/n)=
        {formatNumber(asymptoticSd, 3)}・実測SD={formatNumber(Math.sqrt(sim.variance), 3)}
      </p>

      <Callout
        title="漸近正規性：最尤推定量は n→∞ で正規分布に近づく"
        body={`λ̂ の標本分布は N(λ, λ²/n) に近づく。分散 λ²/n=${formatNumber(
          asymptoticVar,
          3,
        )} は «1/(n·フィッシャー情報量)»＝クラメール・ラオ下限。n を増やすと正規に重なり、SD は √n で縮む。`}
        note="フィッシャー情報量 I(λ) が大きいほど（データが母数の情報を多く持つほど）推定の分散の下限が小さい。小標本では右に歪むが n とともに対称化する。"
        kind="explain"
      />
    </div>
  );
}
