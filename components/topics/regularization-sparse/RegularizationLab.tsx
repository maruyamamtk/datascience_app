"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import {
  COEF_LABELS,
  LOG_LAMBDA_MAX,
  LOG_LAMBDA_MIN,
  POLY_DEGREE,
  useRegularizationSparseStore,
} from "@/lib/store/regularization-sparse";
import type { Method } from "@/lib/stats/regularization-sparse";

const round2 = (v: number) => Math.round(v * 100) / 100;

function formulaFor(method: Method): string {
  const penalty = method === "ridge" ? "\\sum_j\\beta_j^2" : "\\sum_j|\\beta_j|";
  return `\\min_\\beta\\ \\|y-X\\beta\\|^2+\\lambda\\underbrace{(${penalty})}_{\\text{罰則}}\\quad \\lambda=${term("lam", "?")}\\quad \\|\\hat\\beta\\|_0=${term("nz", "?")}`;
}

// フィット曲線パネル（左）。
const W = 300;
const H = 220;
const PADL = 28;
const PADR = 10;
const PADT = 12;
const PADB = 24;
const Y_LO = -1.7;
const Y_HI = 1.7;
const fx = (x: number) => round2(PADL + x * (W - PADL - PADR));
const fy = (v: number) => {
  const c = Math.max(Y_LO, Math.min(Y_HI, v));
  return round2(PADT + ((Y_HI - c) / (Y_HI - Y_LO)) * (H - PADT - PADB));
};

// 係数バーパネル（右）。
const BAR_MAX = 5;
const slot = (W - PADL - PADR) / POLY_DEGREE;
const bx = (j: number) => round2(PADL + (j + 0.5) * slot);
const BAR_W = round2(slot * 0.6);
const by = (v: number) => {
  const c = Math.min(BAR_MAX, v);
  return round2(PADT + (1 - c / BAR_MAX) * (H - PADT - PADB));
};
const baseline = round2(H - PADB);

export function RegularizationLab() {
  const d = useRegularizationSparseStore((s) => s.derived);
  const setControl = useRegularizationSparseStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("lam", formatNumber(d.lambda, 4));
    m.setValue("nz", String(d.nonzeroCount));
    m.setHighlight("lam", true, "#7c3aed");
    m.setHighlight("nz", true, d.method === "lasso" ? "#d97706" : "#2563eb");
  }, [d.lambda, d.nonzeroCount, d.method]);

  const fitPts = d.fitCurve.map((p) => `${fx(p.x)},${fy(p.y)}`).join(" ");
  const truePts = d.trueCurve.map((p) => `${fx(p.x)},${fy(p.y)}`).join(" ");

  const regimeText =
    d.logLambda < -2
      ? "λ が小さすぎて不安定（多重共線性で係数が暴れる）"
      : d.logLambda > 0.5
        ? "λ が大きすぎて縮小しすぎ（適合不足に近づく）"
        : "係数が安定してきた領域";

  return (
    <div id="regularization-lab" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        次数<span className="font-mono">9</span>の多項式を、わずか<span className="font-mono">{10}</span>点の訓練データ（点）にフィットする——
        <Link href="/topics/learning-framework#complexity-lab" className="underline underline-offset-2">
          機械学習の枠組み
        </Link>
        と同じ «次数が高すぎて不安定» な設定。罰則の強さ <span className="font-mono">λ</span> を上げると、L2（リッジ）は係数全体を縮め、
        L1（Lasso）は一部の係数を «ちょうど0» にして自動的に変数を間引く。
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-1 rounded-lg border border-slate-300 bg-slate-50 p-1">
          {(["ridge", "lasso"] as Method[]).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={d.method === m}
              onClick={() => setControl("method", m)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                d.method === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {m === "ridge" ? "L2（リッジ）" : "L1（Lasso）"}
            </button>
          ))}
        </div>
        <div className="min-w-[220px] flex-1 space-y-1">
          <label htmlFor="rs-loglambda" className="font-mono text-xs font-semibold text-slate-700">
            log₁₀λ = {formatNumber(d.logLambda, 2)}（λ = {formatNumber(d.lambda, 4)}）
          </label>
          <input
            id="rs-loglambda"
            type="range"
            min={LOG_LAMBDA_MIN}
            max={LOG_LAMBDA_MAX}
            step={0.05}
            value={d.logLambda}
            onChange={(e) => setControl("logLambda", Number(e.target.value))}
            className={`w-full ${d.method === "lasso" ? "accent-amber-600" : "accent-blue-600"}`}
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {/* 左: データとフィット */}
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="訓練データと正則化フィット">
            {[-1, 0, 1].map((v) => (
              <g key={`g${v}`}>
                <line x1={PADL} y1={fy(v)} x2={W - PADR} y2={fy(v)} className="stroke-slate-100" />
                <text x={PADL - 4} y={fy(v) + 3} textAnchor="end" className="fill-slate-400 text-[8px]">
                  {v}
                </text>
              </g>
            ))}
            <polyline points={truePts} fill="none" className="stroke-slate-800" strokeWidth={1.4} strokeDasharray="4 3" opacity={0.6} />
            <polyline points={fitPts} fill="none" className={d.method === "lasso" ? "stroke-amber-600" : "stroke-blue-600"} strokeWidth={2} />
            {d.trainPoints.map((p, i) => (
              <circle key={`p${i}`} cx={fx(p.x)} cy={fy(p.y)} r={3} className="fill-slate-700" stroke="#fff" strokeWidth={0.8} />
            ))}
            <text x={(PADL + W - PADR) / 2} y={H - 2} textAnchor="middle" className="fill-slate-500 text-[9px]">
              破線=真の関数, 点=訓練データ（10点）
            </text>
          </svg>
        </div>

        {/* 右: 係数の絶対値バー */}
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="係数の絶対値（次数ごと）">
            {[0, 2.5, 5].map((v) => (
              <g key={`bg${v}`}>
                <line x1={PADL} y1={by(v)} x2={W - PADR} y2={by(v)} className="stroke-slate-100" />
                <text x={PADL - 4} y={by(v) + 3} textAnchor="end" className="fill-slate-400 text-[8px]">
                  {v}
                </text>
              </g>
            ))}
            {d.coeffs.map((c, j) => {
              const abs = Math.abs(c);
              const isZero = abs <= 1e-6;
              return (
                <g key={`bar${j}`}>
                  <rect
                    x={bx(j) - BAR_W / 2}
                    y={isZero ? baseline - 1 : by(abs)}
                    width={BAR_W}
                    height={isZero ? 1 : baseline - by(abs)}
                    className={isZero ? "fill-slate-200" : d.method === "lasso" ? "fill-amber-600" : "fill-blue-600"}
                  />
                  <text x={bx(j)} y={H - 8} textAnchor="middle" className="fill-slate-400 text-[7px]">
                    x^{j + 1}
                  </text>
                </g>
              );
            })}
            <text x={(PADL + W - PADR) / 2} y={12} textAnchor="middle" className="fill-slate-500 text-[9px]">
              |係数| （灰=0, {d.method === "lasso" ? "橙=Lasso" : "青=Ridge"}）
            </text>
          </svg>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={formulaFor(d.method)} />
      </div>

      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <Stat value={formatNumber(d.trainRmse, 3)} label="訓練RMSE" tone="emerald" />
        <Stat value={formatNumber(d.testRmse, 3)} label="テストRMSE" tone="red" />
        <Stat value={`${d.nonzeroCount}/${POLY_DEGREE}`} label="非ゼロ係数" tone="amber" />
        <Stat value={formatNumber(d.coefNorm, 2)} label="Σ|係数|" tone="blue" />
      </div>

      <Callout
        title={`λ=${formatNumber(d.lambda, 4)}：${regimeText}`}
        body={
          d.method === "lasso"
            ? `Lasso（L1）は ${POLY_DEGREE - d.nonzeroCount} 個の係数をちょうど0にした。«使う変数を自動的に選ぶ» のが L1 の特徴——モデルがスパース（疎）になり解釈しやすくなる。`
            : `Ridge（L2）はどの係数もちょうど0にはしない。代わりに ${COEF_LABELS.length} 個の係数すべてを一様に縮め、多重共線性（高次の項どうしの強い相関）で暴れがちな係数を安定させる。`
        }
        note="λ→0 だと通常の最小二乗（不安定）、λ→∞ だと全係数が0（切片だけ）に近づく。ちょうどよい λ は交差検証で選ぶ。"
        kind={Math.abs(d.logLambda - (LOG_LAMBDA_MIN + LOG_LAMBDA_MAX) / 2) < 1.5 ? "explain" : "supplement"}
      />
    </div>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone: "emerald" | "red" | "amber" | "blue" }) {
  const bg = {
    emerald: "bg-emerald-50 text-emerald-700",
    red: "bg-rose-50 text-rose-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
  }[tone];
  return (
    <div className={`rounded-lg px-2 py-2 ${bg}`}>
      <div className="font-mono text-sm">{value}</div>
      <div className="text-slate-500">{label}</div>
    </div>
  );
}
