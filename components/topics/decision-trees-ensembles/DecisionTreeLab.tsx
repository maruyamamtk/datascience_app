"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { CLASS_TRAIN, GRID_RESOLUTION, MAX_DEPTH_MAX, MAX_DEPTH_MIN, useDecisionTreesEnsemblesStore } from "@/lib/store/decision-trees-ensembles";
import type { Criterion } from "@/lib/stats/decision-trees-ensembles";

const round2 = (v: number) => Math.round(v * 100) / 100;

// [0,1]×[0,1] の判別平面を描くSVGレイアウト。
const W = 300;
const H = 300;
const PAD = 22;
const px = (v: number) => round2(PAD + v * (W - 2 * PAD));
// x2は上が1になるよう反転（数学の座標系に合わせる）。
const py = (v: number) => round2(PAD + (1 - v) * (H - 2 * PAD));

const LABEL_FILL = { 0: "#2563eb", 1: "#d97706" } as const;
const LABEL_BG = { 0: "#dbeafe", 1: "#fef3c7" } as const;

function formulaFor(criterion: Criterion): string {
  const impFormula = criterion === "gini" ? "1-\\sum_k p_k^2" : "-\\sum_k p_k\\log_2 p_k";
  const label = criterion === "gini" ? "\\text{ジニ不純度}" : "\\text{エントロピー}";
  return `\\underbrace{${impFormula}}_{${label}}\\Big|_{\\text{根}}=${term("imp", "?")}\\qquad \\text{情報利得（根の分割）}=${term("gain", "?")}`;
}

/** 決定木ラボ（Level0）: 判別平面に決定境界・分割線・訓練点を重ね、深さ/分岐基準を操作する。 */
export function DecisionTreeLab() {
  const d = useDecisionTreesEnsemblesStore((s) => s.derived);
  const setControl = useDecisionTreesEnsemblesStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("imp", formatNumber(d.rootImpurity, 3));
    m.setValue("gain", formatNumber(d.rootGain, 3));
    m.setHighlight("imp", true, "#64748b");
    m.setHighlight("gain", true, d.criterion === "gini" ? "#2563eb" : "#0891b2");
  }, [d.rootImpurity, d.rootGain, d.criterion]);

  const cellSize = round2((W - 2 * PAD) / GRID_RESOLUTION);

  return (
    <div id="decision-tree-lab" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        2つの特徴量 <span className="font-mono">x₁, x₂</span> で判別する {CLASS_TRAIN.length} 点の訓練データ。«真の境界»
        は波打つ曲線だが、決定木は軸に平行な直線でしか区切れない——深さを上げるほど階段状に細かく近似していく様子を確かめよう。
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-1 rounded-lg border border-slate-300 bg-slate-50 p-1">
          {(["gini", "entropy"] as Criterion[]).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={d.criterion === c}
              onClick={() => setControl("criterion", c)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                d.criterion === c ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {c === "gini" ? "ジニ不純度" : "エントロピー"}
            </button>
          ))}
        </div>
        <div className="min-w-[220px] flex-1 space-y-1">
          <label htmlFor="dt-maxdepth" className="font-mono text-xs font-semibold text-slate-700">
            木の最大深さ = {d.maxDepth}
          </label>
          <input
            id="dt-maxdepth"
            type="range"
            min={MAX_DEPTH_MIN}
            max={MAX_DEPTH_MAX}
            step={1}
            value={d.maxDepth}
            onChange={(e) => setControl("maxDepth", Number(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-sm" role="img" aria-label="決定境界と訓練データ">
          {d.treeBoundary.map((cell, i) => (
            <rect
              key={`cell${i}`}
              x={round2(px(cell.x1) - cellSize / 2)}
              y={round2(py(cell.x2) - cellSize / 2)}
              width={cellSize}
              height={cellSize}
              fill={LABEL_BG[cell.label]}
            />
          ))}
          {d.splitLines.map((line, i) =>
            line.feature === 0 ? (
              <line
                key={`sl${i}`}
                x1={px(line.threshold)}
                y1={py(line.to)}
                x2={px(line.threshold)}
                y2={py(line.from)}
                className="stroke-slate-800"
                strokeWidth={1.6}
              />
            ) : (
              <line
                key={`sl${i}`}
                x1={px(line.from)}
                y1={py(line.threshold)}
                x2={px(line.to)}
                y2={py(line.threshold)}
                className="stroke-slate-800"
                strokeWidth={1.6}
              />
            ),
          )}
          <rect x={PAD} y={PAD} width={W - 2 * PAD} height={H - 2 * PAD} fill="none" className="stroke-slate-300" />
          {CLASS_TRAIN.map((p, i) => (
            <circle key={`p${i}`} cx={px(p.x1)} cy={py(p.x2)} r={3} fill={LABEL_FILL[p.label]} stroke="#fff" strokeWidth={0.8} />
          ))}
          <text x={PAD} y={H - 4} className="fill-slate-400 text-[9px]">
            x₁ →
          </text>
          <text x={4} y={PAD + 8} className="fill-slate-400 text-[9px]">
            ↑x₂
          </text>
        </svg>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={formulaFor(d.criterion)} />
      </div>

      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <Stat value={formatNumber(d.treeTrainAcc * 100, 1) + "%"} label="訓練正解率" tone="emerald" />
        <Stat value={formatNumber(d.treeTestAcc * 100, 1) + "%"} label="テスト正解率" tone="red" />
        <Stat value={String(d.treeLeafCount)} label="葉の数" tone="amber" />
        <Stat value={String(d.treeDepthActual)} label="実際の深さ" tone="blue" />
      </div>

      <Callout
        title={`深さ${d.maxDepth}・${d.criterion === "gini" ? "ジニ不純度" : "エントロピー"}: 葉${d.treeLeafCount}枚`}
        body={
          d.maxDepth <= 2
            ? "木が浅いうちは大まかな矩形でしか区切れず、波打つ境界を粗くしか近似できない（適合不足に近い）。"
            : d.treeTrainAcc - d.treeTestAcc > 0.12
              ? "訓練正解率がテスト正解率を大きく上回り始めた——木を深くしすぎると個々のノイズ点まで区切りにいく過学習の兆候。"
              : "訓練とテストの正解率が近く、階段状の境界が波打つ真の境界をうまく近似できている。"
        }
        note="決定木はいくらでも深くすれば訓練データを完全に暗記できる（葉が1点ずつになるまで）——だから深さの上限（木の複雑さ）は過学習を抑える主要なノブになる。"
        kind={d.maxDepth >= 5 ? "supplement" : "explain"}
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
