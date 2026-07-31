"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { FILTER_LABELS, SOURCE_IMAGE, type FilterPresetName, useImageAnalysisStore } from "@/lib/store/image-analysis";
import { Grid } from "./Grid";

const CONV_FORMULA = `z_{${term("ia_i", "i")},${term("ia_j", "j")}}=\\sum_{a,b} K_{a,b}\\,X_{i+a,\\,j+b} \\;=\\; ${term("ia_z", "?")}`;
const MAGNITUDE_FORMULA = `G=\\sqrt{G_x^2+G_y^2}=\\sqrt{${term("ia_gx", "?")}^2+${term("ia_gy", "?")}^2}=${term("ia_mag", "?")}`;
const THRESHOLD_FORMULA = `p(x)=\\begin{cases}1&x\\ge ${term("ia_t", "?")}\\\\0&x< ${term("ia_t2", "?")}\\end{cases}\\qquad x=${term(
  "ia_x",
  "?",
)}\\ \\Rightarrow\\ p=${term("ia_p", "?")}`;

const ACCENT = "#2563eb";
const ACCENT_OUT = "#dc2626";

/**
 * 画像処理フィルタの実時間操作ラボ（L1 Interact）。フィルタ種別を切り替えると出力グリッドが
 * 即座に再計算され、着目する出力マスの数式（畳み込みの和／勾配強度の合成／閾値判定）が連動する。
 * [NNモデル（CNN・RNN）]のConvLabと似た構造だが、統計的畳み込みではなく画像処理応用として
 * 独立に実装する（issue #98、トピック間の直接依存は避ける）。
 */
export function FilterLab() {
  const { filterPreset, filterOutput, windowList, windowIndex, activeWindow, activeWindowValue, activeGx, activeGy, threshold } =
    useImageAnalysisStore((s) => s.derived);
  const setControl = useImageAnalysisStore((s) => s.setControl);

  // tex は常に固定文字列を1つだけ使い、内容(構造)の切替はtexプロパティの文字列選択で行う
  // （tasks/lessons.md #79: 条件付きマウント切替ではなくtex切替にする）。
  const tex = filterPreset === "magnitude" ? MAGNITUDE_FORMULA : filterPreset === "threshold" ? THRESHOLD_FORMULA : CONV_FORMULA;
  const mathRef = useRef<MathFormulaHandle>(null);

  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    if (filterPreset === "threshold") {
      const activeVal = SOURCE_IMAGE[activeWindow.row]?.[activeWindow.col] ?? 0;
      m.setValue("ia_t", String(threshold));
      m.setValue("ia_t2", String(threshold));
      m.setValue("ia_x", String(activeVal));
      m.setValue("ia_p", String(activeVal >= threshold ? 1 : 0));
      m.setHighlight("ia_p", true, ACCENT_OUT);
    } else if (filterPreset === "magnitude") {
      m.setValue("ia_gx", formatNumber(activeGx, 1));
      m.setValue("ia_gy", formatNumber(activeGy, 1));
      m.setValue("ia_mag", formatNumber(activeWindowValue, 2));
      m.setHighlight("ia_mag", true, ACCENT_OUT);
    } else {
      m.setValue("ia_i", String(activeWindow.row));
      m.setValue("ia_j", String(activeWindow.col));
      m.setValue("ia_z", formatNumber(activeWindowValue, 1));
      m.setHighlight("ia_z", true, ACCENT_OUT);
    }
  }, [filterPreset, activeWindow, activeWindowValue, activeGx, activeGy, threshold]);

  // activeWindow はpadding後の入力上の座標。padding=1（same畳み込み）なのでハイライト座標は1引き戻す。
  // 範囲外（パディング領域）になったセルはGrid側が無視するので実害は無い。
  const padding = filterPreset === "threshold" ? 0 : 1;
  const inputHighlights =
    filterPreset === "threshold"
      ? [activeWindow]
      : Array.from({ length: 3 }, (_, a) =>
          Array.from({ length: 3 }, (_, b) => ({
            row: activeWindow.row + a - padding,
            col: activeWindow.col + b - padding,
          })),
        ).flat();

  return (
    <div id="ia-filter-lab" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        フィルタを切り替えると出力グリッドが即座に再計算される。「前へ / 次へ」で着目するマスを移動すると、
        対応する入力の窓（青枠）と数式の値が連動する。
      </p>

      <div className="space-y-1">
        <label htmlFor="ia-filter-select" className="text-xs font-semibold text-slate-700">
          フィルタ
        </label>
        <select
          id="ia-filter-select"
          value={filterPreset}
          onChange={(e) => setControl("filterPreset", e.target.value as FilterPresetName)}
          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm sm:w-64"
        >
          {(Object.keys(FILTER_LABELS) as FilterPresetName[]).map((k) => (
            <option key={k} value={k}>
              {FILTER_LABELS[k]}
            </option>
          ))}
        </select>
      </div>

      {filterPreset === "threshold" ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="ia-threshold" className="text-sm font-semibold text-slate-700">
              閾値 t
            </label>
            <span className="font-mono text-sm" style={{ color: ACCENT }}>
              {threshold}
            </span>
          </div>
          <input
            id="ia-threshold"
            type="range"
            min={0}
            max={255}
            step={5}
            value={threshold}
            onChange={(e) => setControl("threshold", Number(e.target.value))}
            className="w-full accent-blue-600"
            aria-label="二値化の閾値"
          />
        </div>
      ) : null}

      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setControl("windowIndex", Math.max(0, windowIndex - 1))}
          disabled={windowIndex <= 0}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ◀ 前のマスへ
        </button>
        <span className="font-mono text-xs text-slate-500">
          マス {windowIndex + 1} / {windowList.length}
        </span>
        <button
          type="button"
          onClick={() => setControl("windowIndex", Math.min(windowList.length - 1, windowIndex + 1))}
          disabled={windowIndex >= windowList.length - 1}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          次のマスへ ▶
        </button>
      </div>

      <div className="flex flex-wrap items-start justify-center gap-6 overflow-x-auto py-2">
        <Grid values={SOURCE_IMAGE} highlighted={inputHighlights} accent={ACCENT} label="元画像 6×6" />
        <Grid values={filterOutput} highlighted={[activeWindow]} accent={ACCENT_OUT} label={`出力 ${filterOutput.length}×${filterOutput[0]?.length ?? 0}`} />
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={tex} display={false} />
      </div>

      <Callout
        title={
          filterPreset === "threshold"
            ? "二値化: 閾値との比較だけで白黒に分ける"
            : filterPreset === "magnitude"
              ? "勾配強度: 縦・横2方向の変化を三平方の定理で合成する"
              : "エッジ検出・ぼかし: 同じ«窓をスライドして積の総和»という計算"
        }
        body={
          filterPreset === "threshold"
            ? `画素値が閾値 t=${threshold} 以上なら白（1）、未満なら黒（0）——単純な比較だけで画像を2値に分ける、最も単純な画像処理。`
            : filterPreset === "magnitude"
              ? "Sobel Gx（縦エッジ）とGy（横エッジ）は別々の方向の明暗変化しか捉えないため、どちらか一方だけでは斜めのエッジを見落とす。2つを直交する成分とみなし、三平方の定理と同じ形で合成すると«どの向きのエッジでも»強さを検出できる。"
            : "フィルタの重みを入力にかけて総和を取る操作を、位置をずらしながら繰り返す——畳み込み層と同じ計算の形（CNNの畳み込みは前提トピックで既習）。Sobelは輝度の«変化»に反応する重み配置、平均化フィルタは«窓内の平均»を取ることで細かいノイズを均す。"
        }
        note={
          filterPreset === "sobel-x" || filterPreset === "sobel-y"
            ? "この画面のGx・Gyの値は«勾配強度»プリセットに切り替えると合成され、エッジの強さ1つの数値にまとまる。"
            : undefined
        }
      />
    </div>
  );
}
