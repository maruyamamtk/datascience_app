"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { STATES, useMarkovStore } from "@/lib/store/markov-chains";

const STATE_COLORS = ["#f59e0b", "#94a3b8", "#2563eb"]; // 晴/曇/雨

// 定常分布 πP=π。π_雨 の項に id を付け、操作で差し込み＋ハイライト。
const FORMULA = `\\pi P=\\pi,\\quad \\pi_{\\text{雨}}=${term("prain", "?")}`;

/** 確率0..1を青の濃さに。 */
function cellColor(v: number): string {
  return `hsl(221 75% ${94 - v * 52}%)`;
}

export function MarkovLab() {
  const rainStick = useMarkovStore((s) => s.controls.rainStick);
  const { P, stationary } = useMarkovStore((s) => s.derived);
  const setControl = useMarkovStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("prain", formatNumber(stationary[2], 3));
    m.setHighlight("prain", true, "#2563eb");
  }, [stationary]);

  const cell = 34;
  const gridX = 46;
  const gridY = 20;

  return (
    <div
      id="markov-operation"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <div className="space-y-1">
        <label htmlFor="mk-rain" className="text-sm font-semibold text-slate-700">
          雨の続きやすさ P(雨→雨) = {formatNumber(rainStick)}（大きいほど雨がちな気候）
        </label>
        <input
          id="mk-rain"
          type="range"
          min={0.1}
          max={0.9}
          step={0.02}
          value={rainStick}
          onChange={(e) => setControl("rainStick", Number(e.target.value))}
          className="w-full accent-blue-600"
          aria-label="雨の続きやすさ"
        />
      </div>

      {/* 遷移行列 */}
      <div>
        <p className="mb-1 text-center text-[10px] font-semibold text-slate-600">
          遷移行列 P（行=今日, 列=明日）
        </p>
        <svg
          viewBox={`0 0 ${gridX + cell * 3 + 6} ${gridY + cell * 3 + 6}`}
          className="mx-auto h-auto w-2/3"
          role="img"
          aria-label="遷移行列"
          data-testid="transition-matrix"
        >
          {P.map((row, i) =>
            row.map((v, j) => (
              <g key={`${i}-${j}`}>
                <rect
                  x={gridX + j * cell}
                  y={gridY + i * cell}
                  width={cell - 2}
                  height={cell - 2}
                  fill={cellColor(v)}
                  rx={2}
                />
                <text
                  x={gridX + j * cell + cell / 2 - 1}
                  y={gridY + i * cell + cell / 2 + 2}
                  textAnchor="middle"
                  className="text-[9px]"
                  fill={v > 0.5 ? "#fff" : "#334155"}
                >
                  {v.toFixed(2)}
                </text>
              </g>
            )),
          )}
          {STATES.map((s, i) => (
            <g key={s}>
              <text
                x={gridX - 6}
                y={gridY + i * cell + cell / 2 + 2}
                textAnchor="end"
                className="text-[9px] font-semibold"
                fill={STATE_COLORS[i]}
              >
                {s}
              </text>
              <text
                x={gridX + i * cell + cell / 2 - 1}
                y={gridY - 6}
                textAnchor="middle"
                className="text-[9px] font-semibold"
                fill={STATE_COLORS[i]}
              >
                {s}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* 定常分布バー */}
      <div className="space-y-1">
        <p className="text-[10px] font-semibold text-slate-600">定常分布 π（長期の滞在割合）</p>
        {STATES.map((s, i) => (
          <div key={s} className="flex items-center gap-2 text-xs">
            <span className="w-8" style={{ color: STATE_COLORS[i] }}>
              {s}
            </span>
            <div className="h-4 flex-1 overflow-hidden rounded bg-slate-100">
              <div
                className="h-full"
                style={{ width: `${stationary[i] * 100}%`, background: STATE_COLORS[i] }}
              />
            </div>
            <span className="w-12 text-right font-mono text-slate-600">
              {formatNumber(stationary[i] * 100, 1)}%
            </span>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>
      <p className="text-center font-mono text-sm text-slate-600">
        定常分布 π=[{stationary.map((v) => formatNumber(v, 2)).join(", ")}]（晴, 曇, 雨）
      </p>

      <Callout
        title="マルコフ連鎖：次の状態は «今» だけで決まる"
        body={`天気が «晴・曇・雨» を確率的に移り変わる。雨の続きやすさ P(雨→雨)=${formatNumber(
          rainStick,
        )} を上げると、長期の滞在割合＝定常分布の «雨»=${formatNumber(
          stationary[2] * 100,
          1,
        )}% が増える。`}
        note="遷移が現在の状態だけに依存し過去に依らない（マルコフ性）。既約・非周期なら、初期状態を忘れて必ず一つの定常分布 πP=π に落ち着く。"
        kind="explain"
      />
    </div>
  );
}
