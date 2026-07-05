"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { OBJ_F, useOptimizationStore, X_MAX, X_MIN } from "@/lib/store/optimization";

// x0・η・f'(x0)（＝勾配）・x1（1歩目）を実時間で差し込み＋ハイライト。
const FORMULA = `x_{k+1}=x_k-${term("lr", "?")}\\cdot f'(x_k),\\quad x_0=${term("x0", "?")},\\ f'(x_0)=${term("grad0", "?")},\\ x_1=${term("x1", "?")}`;

const W = 320;
const H = 240;
const PAD = 10;
const Y_MIN = 0;
const Y_MAX = OBJ_F(X_MAX) * 1.05; // ½·3² = 4.5 に余白。
const round2 = (v: number) => Math.round(v * 100) / 100;
const sx = (x: number) => round2(PAD + ((x - X_MIN) / (X_MAX - X_MIN)) * (W - 2 * PAD));
const sy = (y: number) => round2(H - PAD - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * (H - 2 * PAD));

// 目的関数 f(x)=½x² の折れ線（クランプして枠内に収める）。
const CURVE = Array.from({ length: 97 }, (_, i) => {
  const x = X_MIN + ((X_MAX - X_MIN) * i) / 96;
  return `${sx(x)},${sy(Math.min(OBJ_F(x), Y_MAX))}`;
}).join(" ");

const behaviorInfo = {
  converged: { color: "#2563eb", tone: "blue" as const, label: "なめらかに収束" },
  oscillating: { color: "#d97706", tone: "amber" as const, label: "振動しながら収束" },
  diverged: { color: "#dc2626", tone: "red" as const, label: "発散（学習率が大きすぎ）" },
};

export function GradientDescentLab() {
  const { x0, lr, traj, grad0, x1, behavior, threshold } = useOptimizationStore((s) => s.derived);
  const setControl = useOptimizationStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("x0", formatNumber(x0, 2));
    m.setValue("lr", formatNumber(lr, 2));
    m.setValue("grad0", formatNumber(grad0, 2));
    m.setValue("x1", formatNumber(x1, 2));
    m.setHighlight("lr", true, behaviorInfo[behavior].color);
    m.setHighlight("x1", true, behaviorInfo[behavior].color);
    m.setHighlight("x0", true, "#7c3aed");
  }, [x0, lr, grad0, x1, behavior]);

  const info = behaviorInfo[behavior];
  // 軌跡を枠内に収めた点列（発散時は Y_MAX でクランプ）。
  const pts = traj.map((x) => ({ x, y: Math.min(OBJ_F(x), Y_MAX) }));

  return (
    <div id="opt-gd" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        勾配降下法は «坂の傾き（勾配 <span className="font-mono">f′(x)=x</span>）の逆向きに、学習率 <span className="font-mono">η</span> の歩幅で下る» を繰り返す。出発点 <span className="font-mono">x₀</span> と学習率 <span className="font-mono">η</span> を動かして、軌跡が谷底 <span className="font-mono">x=0</span> へ収束するか、振動するか、発散するかを確かめよう（この関数の閾値は <span className="font-mono">η={threshold}</span>）。
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="opt-x0" className="font-mono text-xs font-semibold text-slate-700">
            x₀ = {formatNumber(x0, 2)}（出発点）
          </label>
          <input
            id="opt-x0"
            type="range"
            min={X_MIN}
            max={X_MAX}
            step={0.1}
            value={x0}
            onChange={(e) => setControl("x0", Number(e.target.value))}
            className="w-full accent-violet-600"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="opt-lr" className="font-mono text-xs font-semibold text-slate-700">
            η = {formatNumber(lr, 2)}（学習率）
          </label>
          <input
            id="opt-lr"
            type="range"
            min={0.1}
            max={2.6}
            step={0.05}
            value={lr}
            onChange={(e) => setControl("lr", Number(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-md" role="img" aria-label="勾配降下の軌跡">
          {/* グリッド */}
          {[-2, -1, 1, 2].map((g) => (
            <line key={`v${g}`} x1={sx(g)} y1={PAD} x2={sx(g)} y2={H - PAD} className="stroke-slate-100" />
          ))}
          {/* x 軸・最小点 */}
          <line x1={PAD} y1={sy(0)} x2={W - PAD} y2={sy(0)} className="stroke-slate-300" />
          <line x1={sx(0)} y1={PAD} x2={sx(0)} y2={H - PAD} className="stroke-slate-200" strokeDasharray="4 3" />
          {/* 目的関数 f(x)=½x² */}
          <polyline points={CURVE} fill="none" className="stroke-slate-800" strokeWidth={2} />
          {/* 軌跡（点をつなぐジグザグ） */}
          <polyline
            points={pts.map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ")}
            fill="none"
            stroke={info.color}
            strokeWidth={1.2}
            strokeDasharray="3 2"
          />
          {pts.map((p, i) => (
            <circle
              key={i}
              cx={sx(p.x)}
              cy={sy(p.y)}
              r={i === 0 ? 5 : 3}
              fill={i === 0 ? "#7c3aed" : info.color}
              opacity={i === 0 ? 1 : Math.max(0.35, 1 - i * 0.08)}
            />
          ))}
        </svg>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <Stat value={formatNumber(x0, 2)} label="出発点 x₀" tone="violet" />
        <Stat value={formatNumber(lr, 2)} label="学習率 η" tone={info.tone} />
        <Stat value={info.label} label="挙動" tone={info.tone} />
      </div>

      <Callout
        title={`学習率 η=${formatNumber(lr, 2)} → ${info.label}`}
        body={
          behavior === "converged"
            ? `η がこの関数の閾値 ${threshold} より十分小さいので、各ステップで谷底へ近づき、勾配が縮むと歩幅も縮んで x=0 に収束する。`
            : behavior === "oscillating"
              ? `η が 1 と ${threshold} の間なので、毎回谷を «行き過ぎて» 反対側に着地する。それでも行き過ぎ量が減るので、ジグザグしながら収束する。`
              : `η がこの関数の閾値 ${threshold} を超えたので、毎回さらに遠くへ飛んでいき発散する。学習率は «大きいほど速い» ではなく、大きすぎると壊れる。`
        }
        note={`凸2次関数 f(x)=½ax² では更新が x←x(1−ηa)。|1−ηa|<1、すなわち η<2/a（ここでは a=1 で η<${threshold}）が収束条件。ニュートン法はこの歩幅を f'' で自動調整し、1歩で谷底へ届く。`}
        kind={behavior === "converged" ? "explain" : "supplement"}
      />
    </div>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone: "violet" | "blue" | "amber" | "red" }) {
  const bg = {
    violet: "bg-violet-50 text-violet-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
  }[tone];
  return (
    <div className={`rounded-lg px-2 py-2 ${bg}`}>
      <div className="font-mono text-base">{value}</div>
      <div className="text-slate-500">{label}</div>
    </div>
  );
}
