"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { useGofStore } from "@/lib/store/goodness-of-fit";

const W = 360;
const H = 130;
const PAD = { top: 12, right: 12, bottom: 24, left: 24 };

const COLOR_OBS = "#2563eb";
const COLOR_EXP = "#dc2626";

// χ²=Σ(O−E)²/E と右片側 p 値。χ²・p の項に id を付け、操作で差し込み＋ハイライト。
const FORMULA = `\\chi^2=\\sum_i\\dfrac{(O_i-E_i)^2}{E_i}=${term("chi", "\\chi^2")},\\quad p=${term(
  "p",
  "p",
)}`;

export function GoodnessOfFitLab() {
  const observed = useGofStore((s) => s.controls.observed);
  const { expected, chi2, df, p, total } = useGofStore((s) => s.derived);
  const setControl = useGofStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("chi", formatNumber(chi2, 2));
    m.setValue("p", formatNumber(p, 3));
    m.setHighlight("chi", true, COLOR_OBS);
    m.setHighlight("p", true, p < 0.05 ? "#16a34a" : "#dc2626");
  }, [chi2, p]);

  const k = observed.length;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const maxV = Math.max(...observed, ...expected, 1) * 1.15;
  const bandW = plotW / k;
  const toY = (v: number) => PAD.top + (1 - v / maxV) * plotH;
  const expY = toY(expected[0] ?? 0);

  const setCount = (i: number, v: number) => {
    const next = [...observed];
    next[i] = Math.max(0, Math.round(v));
    setControl("observed", next);
  };

  return (
    <div id="gof-operation" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        サイコロを {total} 回振った観測度数（期待は一様 {formatNumber(expected[0] ?? 0, 1)} ずつ）
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="観測度数と期待度数"
        data-testid="gof-bars"
      >
        {observed.map((o, i) => {
          const h = toY(0) - toY(o);
          return (
            <g key={i}>
              <rect
                id={`cat-${i}`}
                x={PAD.left + i * bandW + bandW * 0.18}
                y={toY(o)}
                width={bandW * 0.64}
                height={h}
                fill={COLOR_OBS}
                opacity={0.7}
              />
              <text
                x={PAD.left + i * bandW + bandW / 2}
                y={H - 8}
                textAnchor="middle"
                className="fill-slate-400 text-[9px]"
              >
                {i + 1}
              </text>
            </g>
          );
        })}
        {/* 期待度数（一様）の水平線 */}
        <line
          x1={PAD.left}
          y1={expY}
          x2={W - PAD.right}
          y2={expY}
          stroke={COLOR_EXP}
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
        <text x={W - PAD.right} y={expY - 2} textAnchor="end" className="fill-red-600 text-[9px]">
          期待 E
        </text>
      </svg>

      {/* 観測度数の調整 */}
      <div className="grid grid-cols-6 gap-1">
        {observed.map((o, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className="font-mono text-xs text-slate-700">{o}</span>
            <div className="flex gap-0.5">
              <button
                type="button"
                onClick={() => setCount(i, o - 1)}
                aria-label={`目${i + 1}を減らす`}
                className="h-5 w-5 rounded border border-slate-300 text-xs leading-none text-slate-600 hover:bg-slate-50"
              >
                −
              </button>
              <button
                type="button"
                onClick={() => setCount(i, o + 1)}
                aria-label={`目${i + 1}を増やす`}
                className="h-5 w-5 rounded border border-slate-300 text-xs leading-none text-slate-600 hover:bg-slate-50"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>
      <p className="text-center font-mono text-sm">
        χ² = {formatNumber(chi2, 2)}（df={df}）・p = {formatNumber(p, 3)}{" "}
        <span className={p < 0.05 ? "text-green-700" : "text-red-600"}>
          → {p < 0.05 ? "一様と言えない（偏りあり）" : "一様と矛盾しない"}
        </span>
      </p>

      <Callout
        title="カイ二乗適合度検定：観測は «想定した分布» と整合するか"
        body={`各目の «期待からのずれ» を E で割って二乗し足し合わせた χ²=${formatNumber(
          chi2,
          2,
        )} を、自由度 ${df} のカイ二乗分布と比べる。p=${formatNumber(p, 3)}。`}
        note="どれかの目を極端に増やすと χ² が跳ね上がり p が小さくなる（一様から外れる）。期待度数は «総数×想定確率»。各セルの期待度数は5以上が目安。"
        kind="explain"
      />
    </div>
  );
}
