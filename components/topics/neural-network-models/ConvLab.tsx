"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import {
  FILTER_LABELS,
  type FilterPresetName,
  useNeuralNetworkModelsStore,
} from "@/lib/store/neural-network-models";
import type { PoolMode } from "@/lib/stats/neural-network-models";
import { Grid } from "./Grid";

const Z_FORMULA = `z_{${term("nnmc_i", "i")},${term("nnmc_j", "j")}}=\\sum_{a,b} K_{a,b}\\,X_{i+a,\\,j+b} \\;=\\; ${term("nnmc_z", "?")}`;
const SIZE_FORMULA = `n_{\\text{out}}=\\left\\lfloor\\dfrac{n+2p-f}{s}\\right\\rfloor+1=${term("nnmc_nout", "?")}`;

/**
 * CNN の実時間操作ラボ（L0/L1 Interact）。フィルタ・ストライド・パディングを切り替えると
 * 特徴マップと出力サイズが即座に再計算され、着目する出力マスの数式（z の総和）が連動する。
 * ConvPoolStepper（固定設定のコマ送り）とは独立に、«自由に触って確かめる» 役割を担う。
 */
export function ConvLab() {
  const {
    inputGrid,
    filterPreset,
    convStride,
    convPadding,
    convOut,
    windowList,
    windowIndex,
    activeWindow,
    activeWindowValue,
    poolMode,
    poolStride,
    poolOut,
  } = useNeuralNetworkModelsStore((s) => s.derived);
  const setControl = useNeuralNetworkModelsStore((s) => s.setControl);

  const zRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = zRef.current;
    if (!m) return;
    m.setValue("nnmc_i", String(activeWindow.row));
    m.setValue("nnmc_j", String(activeWindow.col));
    m.setValue("nnmc_z", formatNumber(activeWindowValue, 2));
    m.setHighlight("nnmc_z", true, "#2563eb");
  }, [activeWindow, activeWindowValue]);

  const sizeRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = sizeRef.current;
    if (!m) return;
    m.setValue("nnmc_nout", String(convOut.length));
    m.setHighlight("nnmc_nout", true, "#16a34a");
  }, [convOut.length]);

  const inputHighlights = Array.from({ length: 3 }, (_, a) =>
    Array.from({ length: 3 }, (_, b) => ({ row: activeWindow.row * convStride + a, col: activeWindow.col * convStride + b })),
  ).flat();

  return (
    <div id="nnm-conv-lab" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        フィルタ・ストライド・パディングを切り替えると、特徴マップ（畳み込み出力）と出力サイズが実時間で再計算される。
        「前へ / 次へ」で着目する出力マスを移動すると、対応する入力の窓（青枠）と数式の値が連動する。
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <label htmlFor="nnm-filter-select" className="text-xs font-semibold text-slate-700">
            フィルタ
          </label>
          <select
            id="nnm-filter-select"
            value={filterPreset}
            onChange={(e) => setControl("filterPreset", e.target.value as FilterPresetName)}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          >
            {(Object.keys(FILTER_LABELS) as FilterPresetName[]).map((k) => (
              <option key={k} value={k}>
                {FILTER_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="nnm-stride-select" className="text-xs font-semibold text-slate-700">
            ストライド s
          </label>
          <select
            id="nnm-stride-select"
            value={convStride}
            onChange={(e) => setControl("convStride", Number(e.target.value) as 1 | 2)}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="nnm-padding-select" className="text-xs font-semibold text-slate-700">
            パディング p
          </label>
          <select
            id="nnm-padding-select"
            value={convPadding}
            onChange={(e) => setControl("convPadding", Number(e.target.value) as 0 | 1)}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value={0}>0（valid）</option>
            <option value={1}>1（same相当）</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setControl("windowIndex", Math.max(0, windowIndex - 1))}
          disabled={windowIndex <= 0}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ◀ 前の窓へ
        </button>
        <span className="font-mono text-xs text-slate-500">
          窓 {windowIndex + 1} / {windowList.length}
        </span>
        <button
          type="button"
          onClick={() => setControl("windowIndex", Math.min(windowList.length - 1, windowIndex + 1))}
          disabled={windowIndex >= windowList.length - 1}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          次の窓へ ▶
        </button>
      </div>

      <div className="flex flex-wrap items-start justify-center gap-6 overflow-x-auto py-2">
        <Grid values={inputGrid} highlighted={inputHighlights} accent="#2563eb" label={`入力（パディング p=${convPadding}分は範囲外）`} />
        <Grid values={convOut} highlighted={[activeWindow]} accent="#2563eb" label={`特徴マップ ${convOut.length}×${convOut[0]?.length ?? 0}`} />
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={zRef} tex={Z_FORMULA} display={false} />
      </div>
      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={sizeRef} tex={SIZE_FORMULA} display={false} />
      </div>

      <div className="space-y-3 border-t border-slate-100 pt-4">
        <p className="text-sm font-semibold text-slate-700">プーリング層（特徴マップをさらに縮約）</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="nnm-pool-mode" className="text-xs font-semibold text-slate-700">
              方式
            </label>
            <select
              id="nnm-pool-mode"
              value={poolMode}
              onChange={(e) => setControl("poolMode", e.target.value as PoolMode)}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="max">Max プーリング</option>
              <option value="avg">Average プーリング</option>
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="nnm-pool-stride" className="text-xs font-semibold text-slate-700">
              プーリングのストライド
            </label>
            <select
              id="nnm-pool-stride"
              value={poolStride}
              onChange={(e) => setControl("poolStride", Number(e.target.value) as 1 | 2)}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value={1}>1（窓が重なる）</option>
              <option value={2}>2（窓が重ならない、一般的）</option>
            </select>
          </div>
        </div>
        <div className="flex justify-center overflow-x-auto py-2">
          <Grid values={poolOut} accent="#16a34a" label={`プーリング出力 ${poolOut.length}×${poolOut[0]?.length ?? 0}`} />
        </div>
      </div>

      <Callout
        title="ストライド・パディングが出力サイズを決める"
        body="ストライドを大きくすると窓の間隔が広がり出力が粗くなる（計算量も減る）。パディングは入力の周囲をゼロで囲み、端のマスも窓の中心に近い扱いにできる——paddingなし（valid）では端のピクセルが窓の中心に来る機会が少なく、情報が薄まりやすい。"
        note="Maxプーリングは«最も強く反応した特徴»を残し、Averageプーリングは«窓全体の平均的な強さ»を残す——用途に応じて使い分ける。"
      />
    </div>
  );
}
