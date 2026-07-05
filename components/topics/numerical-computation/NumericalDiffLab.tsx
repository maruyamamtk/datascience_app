"use client";

import { useEffect, useRef, useState } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import {
  LAB_EXACT,
  LOGH_MAX,
  LOGH_MIN,
  useNumericalComputationStore,
} from "@/lib/store/numerical-computation";

// h（刻み幅）・近似値・誤差を実時間で差し込み＋ハイライト。h は 10^{logh} の形で表示。
const FORMULA = `f'(1)\\approx\\frac{f(1+h)-f(1-h)}{2h}=${term("approx", "?")},\\quad h=10^{${term("logh", "?")}},\\ \\varepsilon_{\\text{abs}}=${term("err", "?")}`;

const W = 340;
const H = 240;
const PADL = 34;
const PADR = 12;
const PADT = 12;
const PADB = 26;
// 縦軸は log₁₀(誤差)。上を 10⁰、下を 10⁻¹²。
const ERR_LOG_MAX = 0;
const ERR_LOG_MIN = -12;
const round2 = (v: number) => Math.round(v * 100) / 100;
const sx = (logh: number) =>
  round2(PADL + ((logh - LOGH_MIN) / (LOGH_MAX - LOGH_MIN)) * (W - PADL - PADR));
const clampLog = (e: number) => {
  const l = e > 0 ? Math.log10(e) : ERR_LOG_MIN;
  return Math.max(ERR_LOG_MIN, Math.min(ERR_LOG_MAX, l));
};
const sy = (errLog: number) =>
  round2(PADT + ((ERR_LOG_MAX - errLog) / (ERR_LOG_MAX - ERR_LOG_MIN)) * (H - PADT - PADB));

// 誤差を TeX の科学表記に整形（例: 3.2×10⁻¹¹）。
function sci(v: number): string {
  if (!Number.isFinite(v) || v === 0) return "0";
  const exp = Math.floor(Math.log10(v));
  const mant = v / 10 ** exp;
  return `${mant.toFixed(1)}{\\times}10^{${exp}}`;
}

const regimeInfo = {
  truncation: { color: "#d97706", tone: "amber" as const, label: "打ち切り誤差が優勢" },
  optimal: { color: "#2563eb", tone: "blue" as const, label: "最適付近（誤差が最小）" },
  rounding: { color: "#dc2626", tone: "red" as const, label: "丸め誤差が優勢" },
};

export function NumericalDiffLab() {
  const { h, logh, approx, err, truncErr, roundErr, hOpt, regime, curve } =
    useNumericalComputationStore((s) => s.derived);
  const setControl = useNumericalComputationStore((s) => s.setControl);

  // 誤差カーブは Math.sin/Math.log10 の «実測» 浮動小数点誤差をプロットするため、
  // 丸め誤差優勢な小さい h の領域では実行エンジン（Node/ブラウザ）ごとに最終桁が
  // わずかに食い違う。これはこのトピックが可視化する現象そのものなので、
  // SSR 不一致を避けるためカーブはクライアントマウント後にのみ描く。
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("approx", formatNumber(approx, 5));
    m.setValue("logh", formatNumber(logh, 1));
    m.setValue("err", sci(err));
    m.setHighlight("logh", true, regimeInfo[regime].color);
    m.setHighlight("err", true, regimeInfo[regime].color);
  }, [approx, logh, err, regime]);

  const info = regimeInfo[regime];
  const curvePts = curve.map((p) => `${sx(p.logh)},${sy(clampLog(p.err))}`).join(" ");
  const loghOpt = Math.log10(hOpt);

  return (
    <div id="num-diff" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        中心差分 <span className="font-mono">(f(x+h)−f(x−h))/(2h)</span> で{" "}
        <span className="font-mono">f(x)=sin x</span> の <span className="font-mono">x=1</span> での微分（真値{" "}
        <span className="font-mono">cos 1≈{LAB_EXACT.toFixed(4)}</span>）を近似する。刻み幅{" "}
        <span className="font-mono">h</span> を小さくすると打ち切り誤差は減るが、ある点から «近い 2 値の引き算» の
        丸め誤差（桁落ち）が増える。«小さいほど正確» ではないことを確かめよう。
      </p>

      <div className="space-y-1">
        <label htmlFor="num-logh" className="font-mono text-xs font-semibold text-slate-700">
          h = 10^{formatNumber(logh, 1)} ≈ {h.toExponential(1)}（刻み幅）
        </label>
        <input
          id="num-logh"
          type="range"
          min={LOGH_MIN}
          max={LOGH_MAX}
          step={0.5}
          value={logh}
          onChange={(e) => setControl("logh", Number(e.target.value))}
          className="w-full accent-blue-600"
        />
        <div className="flex justify-between font-mono text-[10px] text-slate-400">
          <span>小 10⁻¹⁴（丸め優勢）</span>
          <span>大 10⁰（打ち切り優勢）</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-md" role="img" aria-label="刻み幅と誤差のU字カーブ">
          {/* y グリッド（10 の冪ごと） */}
          {[0, -3, -6, -9, -12].map((g) => (
            <g key={`y${g}`}>
              <line x1={PADL} y1={sy(g)} x2={W - PADR} y2={sy(g)} className="stroke-slate-100" />
              <text x={PADL - 4} y={sy(g) + 3} textAnchor="end" className="fill-slate-400 text-[8px]">
                10{sup(g)}
              </text>
            </g>
          ))}
          {/* x グリッド（log₁₀h） */}
          {[-12, -9, -6, -3, 0].map((g) => (
            <text key={`x${g}`} x={sx(g)} y={H - PADB + 12} textAnchor="middle" className="fill-slate-400 text-[8px]">
              10{sup(g)}
            </text>
          ))}
          <text x={(PADL + W - PADR) / 2} y={H - 2} textAnchor="middle" className="fill-slate-500 text-[9px]">
            刻み幅 h（対数）
          </text>
          {/* 最適刻み幅 h* の縦線 */}
          <line x1={sx(loghOpt)} y1={PADT} x2={sx(loghOpt)} y2={H - PADB} className="stroke-blue-300" strokeDasharray="4 3" />
          <text x={sx(loghOpt)} y={PADT + 8} textAnchor="middle" className="fill-blue-500 text-[8px]">
            h*≈ε^⅓
          </text>
          {/* 実測の誤差カーブ（U 字）。マウント後のみ（SSR 不一致回避） */}
          {mounted ? (
            <polyline points={curvePts} fill="none" className="stroke-slate-800" strokeWidth={1.6} />
          ) : null}
          {/* 現在の h の縦線＋点 */}
          <line x1={sx(logh)} y1={PADT} x2={sx(logh)} y2={H - PADB} stroke={info.color} strokeWidth={1} opacity={0.4} />
          {mounted ? <circle cx={sx(logh)} cy={sy(clampLog(err))} r={5} fill={info.color} /> : null}
        </svg>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <Stat value={h.toExponential(1)} label="刻み幅 h" tone="slate" />
        <Stat value={err.toExponential(1)} label="絶対誤差" tone={info.tone} />
        <Stat value={info.label} label="誤差の領域" tone={info.tone} />
      </div>

      <Callout
        title={`h=10^${formatNumber(logh, 1)} → ${info.label}`}
        body={
          regime === "truncation"
            ? `h が大きいので、テイラー展開の «切り捨てた 3 次項» に由来する打ち切り誤差 (h²/6)|f‴|≈${truncErr.toExponential(1)} が支配的。h を小さくすれば誤差は h² に比例して減る。`
            : regime === "optimal"
              ? `打ち切り誤差 ${truncErr.toExponential(1)} と丸め誤差 ${roundErr.toExponential(1)} が拮抗し、総誤差がほぼ最小。中心差分の最適刻み幅は h*≈ε^{1/3}≈${hOpt.toExponential(1)}。`
              : `h が小さすぎて、近い 2 値 f(x+h)≈f(x−h) の引き算で有効数字が消える «桁落ち»。その誤差を 2h（微小）で割るので丸め誤差 ε|f|/(2h)≈${roundErr.toExponential(1)} が急増。h をこれ以上小さくしても悪化する。`
        }
        note={`総誤差 ≈ (h²/6)|f‴| + ε|f|/(2h)。第 1 項（打ち切り）は h↓ で減り、第 2 項（丸め）は h↓ で増える。両者が釣り合う h*≈ε^{1/3}≈6×10⁻⁶ が最小点。«小さいほど正確» は浮動小数点では成り立たない。`}
        kind={regime === "optimal" ? "explain" : "supplement"}
      />
    </div>
  );
}

// 10 の指数を上付き文字で（負号込み）。
function sup(n: number): string {
  const map: Record<string, string> = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
  return String(n).split("").map((c) => map[c] ?? c).join("");
}

function Stat({ value, label, tone }: { value: string; label: string; tone: "slate" | "blue" | "amber" | "red" }) {
  const bg = {
    slate: "bg-slate-50 text-slate-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
  }[tone];
  return (
    <div className={`rounded-lg px-2 py-2 ${bg}`}>
      <div className="font-mono text-sm">{value}</div>
      <div className="text-slate-500">{label}</div>
    </div>
  );
}
