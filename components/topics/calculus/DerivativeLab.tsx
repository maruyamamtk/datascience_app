"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { useCalculusStore, X_MAX, X_MIN } from "@/lib/store/calculus";
import { type Pt } from "@/lib/stats/calculus";

// f(x0)・f'(x0)（＝接線の傾き）を実時間で差し込み＋ハイライト。
const FORMULA = `f(x)=\\tfrac{x^3}{3}-x,\\quad f'(x)=x^2-1,\\quad x_0=${term("x0", "?")},\\ f(x_0)=${term("fx0", "?")},\\ f'(x_0)=${term("dfx0", "?")}`;

const W = 320;
const H = 260;
const PAD = 8;
// 表示するデータ範囲（y は f の値域に少し余裕を持たせる）。
const Y_MIN = -2.2;
const Y_MAX = 2.2;
const round2 = (v: number) => Math.round(v * 100) / 100;
const sx = (x: number) => round2(PAD + ((x - X_MIN) / (X_MAX - X_MIN)) * (W - 2 * PAD));
const sy = (y: number) => round2(H - PAD - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * (H - 2 * PAD));

function polyline(pts: readonly Pt[]): string {
  return pts
    .filter((p) => p.y >= Y_MIN - 0.5 && p.y <= Y_MAX + 0.5)
    .map((p) => `${sx(p.x)},${sy(p.y)}`)
    .join(" ");
}

export function DerivativeLab() {
  const { curve, x0, fx0, dfx0, tangent, isExtremum, increasing } = useCalculusStore((s) => s.derived);
  const setControl = useCalculusStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("x0", formatNumber(x0, 2));
    m.setValue("fx0", formatNumber(fx0, 2));
    m.setValue("dfx0", formatNumber(dfx0, 2));
    // 接線の傾き＝f'(x0)：極値で緑、増加で青、減少で赤。
    const color = isExtremum ? "#16a34a" : increasing ? "#2563eb" : "#dc2626";
    m.setHighlight("dfx0", true, color);
    m.setHighlight("x0", true, "#7c3aed");
  }, [x0, fx0, dfx0, isExtremum, increasing]);

  // 接線を表示範囲の左右端で切って2点にする。
  const tx1 = X_MIN;
  const tx2 = X_MAX;
  const tangentColor = isExtremum ? "#16a34a" : increasing ? "#2563eb" : "#dc2626";

  return (
    <div id="calc-derivative" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        微分とは «その点での接線の傾き»＝瞬間の変化率。接点 <span className="font-mono">x₀</span> を動かすと、曲線 <span className="font-mono">f(x)=x³/3−x</span> の接線と傾き <span className="font-mono">f′(x₀)=x₀²−1</span> が同時に追従する。<span className="font-mono">x₀=±1</span> で傾きが 0（山頂・谷底＝極値）になるのを確かめよう。
      </p>

      <div className="space-y-1">
        <label htmlFor="calc-x0" className="font-mono text-xs font-semibold text-slate-700">
          x₀ = {formatNumber(x0, 2)}（接点）
        </label>
        <input
          id="calc-x0"
          type="range"
          min={X_MIN}
          max={X_MAX}
          step={0.05}
          value={x0}
          onChange={(e) => setControl("x0", Number(e.target.value))}
          className="w-full accent-violet-600"
        />
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-md" role="img" aria-label="関数と接線">
          {/* グリッド */}
          {[-2, -1, 1, 2].map((g) => (
            <g key={`v${g}`}>
              <line x1={sx(g)} y1={PAD} x2={sx(g)} y2={H - PAD} className="stroke-slate-100" />
              <line x1={PAD} y1={sy(g)} x2={W - PAD} y2={sy(g)} className="stroke-slate-100" />
            </g>
          ))}
          {/* 座標軸 */}
          <line x1={PAD} y1={sy(0)} x2={W - PAD} y2={sy(0)} className="stroke-slate-300" />
          <line x1={sx(0)} y1={PAD} x2={sx(0)} y2={H - PAD} className="stroke-slate-300" />
          {/* 接線（傾き＝f'(x0)） */}
          <line
            x1={sx(tx1)}
            y1={sy(tangent.slope * tx1 + tangent.intercept)}
            x2={sx(tx2)}
            y2={sy(tangent.slope * tx2 + tangent.intercept)}
            stroke={tangentColor}
            strokeWidth={1.5}
            strokeDasharray="5 3"
          />
          {/* 曲線 f(x) */}
          <polyline points={polyline(curve)} fill="none" className="stroke-slate-800" strokeWidth={2} />
          {/* 接点 */}
          <circle cx={sx(x0)} cy={sy(fx0)} r={5} fill={tangentColor} />
        </svg>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <Stat value={formatNumber(x0, 2)} label="接点 x₀" tone="violet" />
        <Stat value={formatNumber(dfx0, 2)} label="接線の傾き f′(x₀)" tone={isExtremum ? "green" : increasing ? "blue" : "red"} />
        <Stat value={isExtremum ? "極値" : increasing ? "増加中" : "減少中"} label="f の増減" tone={isExtremum ? "green" : increasing ? "blue" : "red"} />
      </div>

      <Callout
        title="接線の傾き f′(x₀) が «その瞬間の変化率»"
        body={`x₀=${formatNumber(x0, 2)} での傾きは f′(x₀)=x₀²−1=${formatNumber(dfx0, 2)}。${
          isExtremum
            ? "傾きがほぼ 0——曲線が水平になる山頂/谷底で、ここが極値（最適化で «勾配 0» を探すのと同じ）。"
            : increasing
              ? "傾きが正なので、この点で f は増加中（右上がり）。"
              : "傾きが負なので、この点で f は減少中（右下がり）。"
        }`}
        note="接線は «割線（2点を結ぶ直線）» の2点を限りなく近づけた極限。傾きの符号が f の増減を、傾き 0 が極値を教える。f′(x)=x²−1 は x=±1 で 0 になる。"
        kind="explain"
      />
    </div>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone: "violet" | "green" | "blue" | "red" }) {
  const bg = {
    violet: "bg-violet-50 text-violet-700",
    green: "bg-green-50 text-green-700",
    blue: "bg-blue-50 text-blue-700",
    red: "bg-red-50 text-red-700",
  }[tone];
  return (
    <div className={`rounded-lg px-2 py-2 ${bg}`}>
      <div className="font-mono text-base">{value}</div>
      <div className="text-slate-500">{label}</div>
    </div>
  );
}
