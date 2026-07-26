"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { ACT_X_MAX, ACT_X_MIN, useNeuralNetworkBasicsStore } from "@/lib/store/neural-network-basics";
import type { ActivationName } from "@/lib/stats/neural-network-basics";

const FORMULA = `\\phi(${term("x", "?")})=${term("phi", "?")},\\qquad \\phi'(${term("x2", "?")})=${term("dphi", "?")}`;

const ACT_TEX: Record<ActivationName, string> = {
  relu: "\\phi(z)=\\max(0,z)",
  sigmoid: "\\phi(z)=\\dfrac{1}{1+e^{-z}}",
  rbf: "\\phi(z)=e^{-\\gamma z^2}",
};

const ACT_LABEL: Record<ActivationName, string> = { relu: "ReLU", sigmoid: "シグモイド", rbf: "動径基底関数" };
const ACT_COLOR: Record<ActivationName, string> = { relu: "#2563eb", sigmoid: "#d97706", rbf: "#7c3aed" };

const W = 320;
const H = 140;
const PAD = 10;
const round2 = (v: number) => Math.round(v * 100) / 100;

function Chart({
  curve,
  x,
  y,
  color,
  yMin,
  yMax,
  label,
}: {
  curve: { x: number; y: number }[];
  x: number;
  y: number;
  color: string;
  yMin: number;
  yMax: number;
  label: string;
}) {
  const sx = (v: number) => round2(PAD + ((v - ACT_X_MIN) / (ACT_X_MAX - ACT_X_MIN)) * (W - 2 * PAD));
  const sy = (v: number) => round2(H - PAD - ((v - yMin) / (yMax - yMin || 1)) * (H - 2 * PAD));
  const points = curve.map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ");
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-sm" role="img" aria-label={label}>
        <line x1={PAD} y1={sy(0)} x2={W - PAD} y2={sy(0)} className="stroke-slate-200" />
        <line x1={sx(0)} y1={PAD} x2={sx(0)} y2={H - PAD} className="stroke-slate-100" />
        <polyline points={points} fill="none" stroke={color} strokeWidth={2} />
        <circle cx={sx(x)} cy={sy(y)} r={5} fill={color} />
        <text x={PAD} y={PAD + 8} className="fill-slate-400 text-[9px]">
          {label}
        </text>
      </svg>
    </div>
  );
}

/** 活性化関数比較ラボ（L1）。ReLU・シグモイド・RBF の曲線と微分、勾配消失の層積を見せる。 */
export function ActivationLab() {
  const { activation, actX, actValue, derivValue, actCurve, derivCurve, depth, gradProfile } =
    useNeuralNetworkBasicsStore((s) => s.derived);
  const setControl = useNeuralNetworkBasicsStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("x", formatNumber(actX, 2));
    m.setValue("x2", formatNumber(actX, 2));
    m.setValue("phi", formatNumber(actValue, 3));
    m.setValue("dphi", formatNumber(derivValue, 3));
    m.setHighlight("phi", true, ACT_COLOR[activation]);
    m.setHighlight("dphi", true, "#dc2626");
  }, [actX, actValue, derivValue, activation]);

  const yRange = { min: Math.min(0, ...actCurve.map((p) => p.y)) - 0.1, max: Math.max(1, ...actCurve.map((p) => p.y)) + 0.1 };
  const dRange = { min: Math.min(0, ...derivCurve.map((p) => p.y)) - 0.05, max: Math.max(0.3, ...derivCurve.map((p) => p.y)) + 0.05 };

  const barMax = Math.max(...gradProfile, 1e-6);

  return (
    <div id="nn-activation" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        活性化関数を切り替え、x を動かして関数の形と微分（傾き）を比べよう。下のバーは、その微分を層の数だけ掛け合わせた
        «累積勾配» ——誤差逆伝播で層をさかのぼるほど、この掛け算が繰り返される。
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1 sm:col-span-1">
          <label htmlFor="nn-act-select" className="text-xs font-semibold text-slate-700">
            活性化関数
          </label>
          <select
            id="nn-act-select"
            value={activation}
            onChange={(e) => setControl("activation", e.target.value as ActivationName)}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="relu">ReLU</option>
            <option value="sigmoid">シグモイド</option>
            <option value="rbf">動径基底関数</option>
          </select>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label htmlFor="nn-act-x" className="font-mono text-xs font-semibold text-slate-700">
            x = {formatNumber(actX, 2)}
          </label>
          <input
            id="nn-act-x"
            type="range"
            min={ACT_X_MIN}
            max={ACT_X_MAX}
            step={0.1}
            value={actX}
            onChange={(e) => setControl("actX", Number(e.target.value))}
            className="w-full accent-amber-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Chart curve={actCurve} x={actX} y={actValue} color={ACT_COLOR[activation]} yMin={yRange.min} yMax={yRange.max} label="φ(z)" />
        <Chart curve={derivCurve} x={actX} y={derivValue} color="#dc2626" yMin={dRange.min} yMax={dRange.max} label="φ'(z)" />
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula tex={ACT_TEX[activation]} display={false} />
      </div>
      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} display={false} />
      </div>

      <div className="space-y-1">
        <label htmlFor="nn-depth" className="font-mono text-xs font-semibold text-slate-700">
          層数 = {depth}（{ACT_LABEL[activation]}の代表的な微分を depth 回掛け合わせる）
        </label>
        <input
          id="nn-depth"
          type="range"
          min={1}
          max={8}
          step={1}
          value={depth}
          onChange={(e) => setControl("depth", Number(e.target.value))}
          className="w-full accent-red-600"
        />
      </div>
      <div className="flex items-end gap-2 overflow-x-auto rounded-xl bg-slate-50 px-4 py-3" style={{ height: 100 }}>
        {gradProfile.map((v, i) => (
          <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
            <span className="font-mono text-[10px] text-slate-500">{v < 0.001 ? v.toExponential(1) : formatNumber(v, 3)}</span>
            <div
              className="w-full rounded-t"
              style={{ height: `${Math.max(2, (v / barMax) * 60)}px`, backgroundColor: i === 0 ? "#94a3b8" : "#dc2626" }}
            />
            <span className="text-[10px] text-slate-400">{i}層</span>
          </div>
        ))}
      </div>

      <Callout
        title={activation === "sigmoid" ? "勾配消失: シグモイドは層を重ねるほど急速に0へ" : "勾配が縮みにくいケース"}
        body={
          activation === "sigmoid"
            ? "シグモイドの微分は最大でも0.25。誤差逆伝播でこれを層の数だけ掛け合わせると、深いネットワークほど入力側に届く勾配が指数的に小さくなり、学習がほとんど進まなくなる（勾配消失）。"
            : activation === "relu"
              ? "ReLU は活性域（z>0）で微分が常に1なので、層を重ねても勾配の大きさが縮まない。深いネットワークで勾配消失を避けやすい理由の1つ（ただし z≤0 では微分0で «死んだユニット» になりうる）。"
              : "動径基底関数は中心付近でしか大きな微分を持たず、中心から離れると急速に0に近づく（局所表現）。層を重ねる文脈より、1層で «局所的に反応する» 特徴抽出に向く。"
        }
        note="活性化関数の微分の大きさが、誤差逆伝播で下流（入力側）まで届く勾配の大きさを決める——これが活性化関数の選択が学習の成否を左右する理由。"
        kind={activation === "sigmoid" ? "supplement" : "explain"}
      />
    </div>
  );
}
