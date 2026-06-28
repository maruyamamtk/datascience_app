"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { OBSERVED_CORR, VARIABLE_NAMES, useFactorStore } from "@/lib/store/factor-analysis";

// 残差平方和 RSS。rss の項に id を付け、操作で差し込み＋ハイライト。
const FORMULA = `r_{ij}=\\lambda_i\\lambda_j,\\quad \\text{残差}^2=${term("rss", "?")}`;

/** 相関値 0..1 を青のヒートマップ色に。 */
function heatColor(v: number): string {
  const t = Math.max(0, Math.min(1, v));
  const light = 96 - t * 56; // 96%→40%
  return `hsl(221 70% ${light}%)`;
}

export function FactorLab() {
  const loadingScale = useFactorStore((s) => s.controls.loadingScale);
  const { loadings, impliedCorr, residualSS, communalities, meanCommunality } = useFactorStore(
    (s) => s.derived,
  );
  const setControl = useFactorStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("rss", formatNumber(residualSS, 3));
    m.setHighlight("rss", true, residualSS < 0.02 ? "#16a34a" : "#dc2626");
  }, [residualSS]);

  const p = VARIABLE_NAMES.length;
  const cell = 30;
  const gridW = cell * p + 40;

  const Matrix = ({ data, title, testid }: { data: number[][]; title: string; testid: string }) => (
    <div className="space-y-1">
      <p className="text-center text-[10px] font-semibold text-slate-600">{title}</p>
      <svg
        viewBox={`0 0 ${gridW} ${gridW}`}
        className="h-auto w-full"
        role="img"
        aria-label={title}
        data-testid={testid}
      >
        {data.map((row, i) =>
          row.map((v, j) => (
            <g key={`${i}-${j}`}>
              <rect
                x={40 + j * cell}
                y={40 + i * cell}
                width={cell - 1}
                height={cell - 1}
                fill={heatColor(v)}
                rx={2}
              />
              <text
                x={40 + j * cell + cell / 2}
                y={40 + i * cell + cell / 2 + 3}
                textAnchor="middle"
                className="text-[8px]"
                fill={v > 0.6 ? "#fff" : "#334155"}
              >
                {v.toFixed(2)}
              </text>
            </g>
          )),
        )}
        {VARIABLE_NAMES.map((n, i) => (
          <g key={n}>
            <text
              x={36}
              y={40 + i * cell + cell / 2 + 3}
              textAnchor="end"
              className="fill-slate-500 text-[8px]"
            >
              {n}
            </text>
            <text
              x={40 + i * cell + cell / 2}
              y={34}
              textAnchor="middle"
              className="fill-slate-500 text-[8px]"
            >
              {n}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );

  return (
    <div
      id="factor-operation"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <div className="space-y-1">
        <label htmlFor="fa-scale" className="text-sm font-semibold text-slate-700">
          因子負荷の倍率 = {formatNumber(loadingScale)}（1で観測相関に最も一致）
        </label>
        <input
          id="fa-scale"
          type="range"
          min={0.2}
          max={1.2}
          step={0.02}
          value={loadingScale}
          onChange={(e) => setControl("loadingScale", Number(e.target.value))}
          className="w-full accent-blue-600"
          aria-label="因子負荷の倍率"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Matrix data={OBSERVED_CORR} title="観測相関（目標）" testid="observed-matrix" />
        <Matrix data={impliedCorr} title="モデル含意相関 λᵢλⱼ" testid="implied-matrix" />
      </div>

      {/* 因子負荷と共通性 */}
      <div className="space-y-1">
        {VARIABLE_NAMES.map((n, i) => (
          <div key={n} className="flex items-center gap-2 text-xs">
            <span className="w-10 text-slate-600">{n}</span>
            <span className="w-16 font-mono text-slate-500">λ={formatNumber(loadings[i])}</span>
            <div className="flex h-3 flex-1 overflow-hidden rounded bg-slate-100">
              <div
                className="h-full bg-blue-600"
                style={{ width: `${communalities[i] * 100}%` }}
                title="共通性"
              />
              <div
                className="h-full bg-amber-300"
                style={{ width: `${(1 - communalities[i]) * 100}%` }}
                title="独自性"
              />
            </div>
            <span className="w-12 text-right font-mono text-blue-700">
              h²={formatNumber(communalities[i], 2)}
            </span>
          </div>
        ))}
        <p className="text-[10px] text-slate-400">
          青=共通性（共通因子）／黄=独自性（固有＋誤差）。各変数の分散1を分け合う。
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>
      <p className="text-center font-mono text-sm">
        残差平方和={formatNumber(residualSS, 3)}・平均共通性={formatNumber(meanCommunality, 2)}{" "}
        <span className={residualSS < 0.02 ? "text-green-700" : "text-red-600"}>
          → {residualSS < 0.02 ? "よく当てはまる" : "ずれあり"}
        </span>
      </p>

      <Callout
        title="因子分析：観測相関を «少数の潜在因子» で再現する"
        body={`観測変数の相関を、共通因子の負荷 λ で r_ij=λ_i·λ_j と説明する。負荷倍率=${formatNumber(
          loadingScale,
        )} で含意相関が観測相関にどれだけ合うか（残差平方和=${formatNumber(
          residualSS,
          3,
        )}）。倍率1で残差が最小。`}
        note="共通性 h²=λ² が «共通因子で説明できた分散»、独自性 1−λ² が «その変数固有＋誤差»。共分散構造分析（SEM）は、こうした潜在変数の関係を相関構造として仮定し検証する枠組み。"
        kind="explain"
      />
    </div>
  );
}
