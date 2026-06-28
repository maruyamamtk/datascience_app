"use client";

import { useEffect, useMemo, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { likelihoodCurve } from "@/lib/stats/sufficiency";
import { useSufficiencyStore } from "@/lib/store/statistics-sufficiency";

const W = 360;
const H = 130;
const PAD = { top: 10, right: 14, bottom: 24, left: 14 };
const COLOR_LIK = "#2563eb";
const COLOR_MLE = "#dc2626";

// 最尤推定量 p̂ = T/n。T・n・p̂ の項に id を付け、コイン操作で差し込み＋ハイライト。
const FORMULA = `\\hat p=\\dfrac{T}{n}=\\dfrac{${term("T", "T")}}{${term("n", "n")}}=${term(
  "phat",
  "\\hat p",
)}`;

export function SufficiencyLab() {
  const bits = useSufficiencyStore((s) => s.controls.bits);
  const { successes, n, mle } = useSufficiencyStore((s) => s.derived);
  const setControl = useSufficiencyStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const c = mathRef.current;
    if (!c) return;
    c.setValue("T", String(successes));
    c.setValue("n", String(n));
    c.setValue("phat", formatNumber(mle));
    c.setHighlight("T", true, COLOR_LIK);
    c.setHighlight("phat", true, COLOR_MLE);
  }, [successes, n, mle]);

  const curve = useMemo(() => likelihoodCurve(successes, n), [successes, n]);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const toX = (p: number) => PAD.left + p * plotW;
  const toY = (lik: number) => PAD.top + (1 - lik) * plotH;
  const path = curve
    .map((c, i) => `${i === 0 ? "M" : "L"}${toX(c.p).toFixed(1)},${toY(c.lik).toFixed(1)}`)
    .join(" ");

  const toggle = (i: number) => {
    const next = [...bits];
    next[i] = next[i] ? 0 : 1;
    setControl("bits", next);
  };
  const shuffle = () => {
    // 同じ T を保ったままランダムに並べ替え（順序が尤度に効かないことを示す）。
    const next = [...bits].sort(() => Math.random() - 0.5);
    setControl("bits", next);
  };

  return (
    <div
      id="sufficiency-operation"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <p className="text-sm font-semibold text-slate-700">
        コインをクリックで表(1)/裏(0) を切替（成功数 T が十分統計量）
      </p>

      {/* コイン列 */}
      <div className="flex flex-wrap items-center gap-2">
        {bits.map((b, i) => (
          <button
            key={i}
            type="button"
            onClick={() => toggle(i)}
            aria-pressed={b === 1}
            aria-label={`コイン${i + 1}: ${b ? "表" : "裏"}`}
            className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold transition ${
              b
                ? "border-blue-500 bg-blue-500 text-white"
                : "border-slate-300 bg-white text-slate-400"
            }`}
          >
            {b ? "H" : "T"}
          </button>
        ))}
        <button
          type="button"
          onClick={shuffle}
          className="ml-auto rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
        >
          並べ替え（T 不変）
        </button>
      </div>

      <p className="text-center font-mono text-sm text-slate-700">
        成功数 T = {successes}／n = {n}
      </p>

      {/* 尤度曲線（T と n だけで決まる） */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="尤度関数"
        data-testid="likelihood-curve"
      >
        <line x1={PAD.left} y1={toY(0)} x2={W - PAD.right} y2={toY(0)} stroke="#cbd5e1" />
        <path d={path} fill="none" stroke={COLOR_LIK} strokeWidth={2.5} />
        {/* MLE の縦線 */}
        <line
          x1={toX(mle)}
          y1={PAD.top}
          x2={toX(mle)}
          y2={toY(0)}
          stroke={COLOR_MLE}
          strokeWidth={1.5}
          strokeDasharray="3 2"
        />
        <text
          x={toX(mle)}
          y={PAD.top - 1}
          textAnchor="middle"
          className="fill-red-600 text-[10px] font-semibold"
        >
          p̂={formatNumber(mle)}
        </text>
        {[0, 0.5, 1].map((p) => (
          <text
            key={p}
            x={toX(p)}
            y={H - 6}
            textAnchor="middle"
            className="fill-slate-400 text-[9px]"
          >
            {p}
          </text>
        ))}
      </svg>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>

      <Callout
        title="十分統計量：データは T を通してしか効かない（ネイマンの分解）"
        body={`尤度 L(p)=pᵀ(1−p)ⁿ⁻ᵀ は «成功数 T と n» だけで決まる。だから «並べ替え» しても（T が同じなら）尤度曲線も MLE p̂=${formatNumber(
          mle,
        )} も全く変わらない。`}
        note="T が «十分» とは «T を知れば、生データの並びはもう推定に何の情報も足さない» ということ。データを T に要約しても損がない。"
        kind="explain"
      />
    </div>
  );
}
