"use client";

import { useEffect, useMemo, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout, StepPlayer, useFramePlayer } from "@/components/viz";
import {
  cFactor,
  kNearestIndices,
  localReachabilityDensity,
  mahalanobisT2,
  pathLength,
  pcaResidualQ,
} from "@/lib/stats/imbalanced-anomaly";
import {
  ANOMALY_DATA,
  ANOMALY_GRID_RESOLUTION,
  ANOMALY_POINTS,
  IFOREST,
  IFOREST_SUBSAMPLE_SIZE,
  LOF_K_MAX,
  LOF_K_MIN,
  MSPC_MOMENTS,
  type AnomalyMethod,
  useAnomalyStore,
} from "@/lib/store/imbalanced-anomaly";
import { normalizeScores, px, py, round2, scoreToHeatColor, SCATTER_H, SCATTER_W } from "./scatter-layout";

const LOF_FORMULA = `\\text{LOF}(x)=\\dfrac{${term("nlrd", "?")}}{${term("lrd", "?")}}=${term("lofval", "?")}`;
const ISO_FORMULA = `s(x)=2^{-{${term("eh", "?")}}/{${term("cn", "?")}}}=${term("isoval", "?")}`;
const MSPC_FORMULA = `T^2+Q=${term("t2", "?")}+${term("q", "?")}=${term("mspcval", "?")}`;

const METHOD_FORMULA: Record<AnomalyMethod, string> = { lof: LOF_FORMULA, iforest: ISO_FORMULA, mspc: MSPC_FORMULA };

const METHOD_LABEL: Record<AnomalyMethod, string> = { lof: "LOF（局所外れ値因子）", iforest: "Isolation Forest", mspc: "MSPC（T²+Q）" };

const GRID_CELL = round2((SCATTER_W - 44) / ANOMALY_GRID_RESOLUTION);

/**
 * 異常検知ラボ（Level2）: LOF / Isolation Forest / MSPC(T²+Q) を切替え、上位◯%しきい値
 * スライダーで異常判定境界を動かす。粗いヒートマップで手法ごとの«異常の形»の違いを見せ、
 * スコア上位10件を1件ずつ辿るステッパーで数式の該当項を強連動させる（メインストア・
 * SmoteFormulaStepperとは独立した専用ストアのframeを使う, tasks/lessons.md #76）。
 */
export function AnomalyLab() {
  const controls = useAnomalyStore((s) => s.controls);
  const d = useAnomalyStore((s) => s.derived);
  const patchControls = useAnomalyStore((s) => s.patchControls);

  const index = useAnomalyStore((s) => s.frame.index);
  const count = useAnomalyStore((s) => s.frame.count);
  const playing = useAnomalyStore((s) => s.frame.playing);
  const nextFrame = useAnomalyStore((s) => s.nextFrame);
  const prevFrame = useAnomalyStore((s) => s.prevFrame);
  const goToFrame = useAnomalyStore((s) => s.goToFrame);
  const setPlaying = useAnomalyStore((s) => s.setPlaying);

  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 1100 });

  const focusedIndex = d.ranking[index] ?? d.ranking[0];
  const focusedPoint = ANOMALY_POINTS[focusedIndex];

  const normalizedGrid = useMemo(() => {
    const values = normalizeScores(d.grid.map((c) => c.score));
    return d.grid.map((c, i) => ({ ...c, normalized: values[i] }));
  }, [d.grid]);

  // 3手法で数式の構造（分数/べき乗/和）が異なるため tex 文字列は method ごとに切り替えるが、
  // <MathFormula> 自体は常時1つだけマウントしたままにする——method変化のたびに
  // 条件付きマウント/アンマウントで別インスタンスに切り替えると、新インスタンスの
  // KaTeX描画（子のuseEffect）と本コンポーネントの setValue（親のuseEffect）が同一コミットで
  // 競合し、初回だけ数式が"?"のまま更新されない（実機Playwright検証で発見した回帰）。
  // tex を差し替えるだけならMathFormula自身のuseEffectがtex変更を検知して再描画するため、
  // refの再アタッチが起きず後続のsetValueが確実に効く。
  const mathRef = useRef<MathFormulaHandle>(null);

  useEffect(() => {
    const m = mathRef.current;
    if (!m || !focusedPoint) return;
    if (controls.method === "lof") {
      const neighbors = kNearestIndices(ANOMALY_POINTS, focusedPoint, controls.lofK, focusedIndex);
      const ownLrd = localReachabilityDensity(ANOMALY_POINTS, focusedIndex, controls.lofK);
      const meanNeighborLrd = neighbors.length > 0 ? neighbors.reduce((s, j) => s + localReachabilityDensity(ANOMALY_POINTS, j, controls.lofK), 0) / neighbors.length : 0;
      m.setValue("nlrd", formatNumber(meanNeighborLrd, 2));
      m.setValue("lrd", formatNumber(ownLrd, 2));
      m.setValue("lofval", formatNumber(d.scores[focusedIndex], 2));
      m.setHighlight("nlrd", true, "#7c3aed");
      m.setHighlight("lrd", true, "#2563eb");
      m.setHighlight("lofval", true, "#dc2626");
    } else if (controls.method === "iforest") {
      const avgPath = IFOREST.reduce((s, tree) => s + pathLength(tree, focusedPoint), 0) / IFOREST.length;
      const c = cFactor(IFOREST_SUBSAMPLE_SIZE);
      m.setValue("eh", formatNumber(avgPath, 2));
      m.setValue("cn", formatNumber(c, 2));
      m.setValue("isoval", formatNumber(d.scores[focusedIndex], 2));
      m.setHighlight("eh", true, "#7c3aed");
      m.setHighlight("cn", true, "#2563eb");
      m.setHighlight("isoval", true, "#dc2626");
    } else {
      const t2 = mahalanobisT2(focusedPoint, MSPC_MOMENTS);
      const q = pcaResidualQ(focusedPoint, MSPC_MOMENTS);
      m.setValue("t2", formatNumber(t2, 2));
      m.setValue("q", formatNumber(q, 2));
      m.setValue("mspcval", formatNumber(d.scores[focusedIndex], 2));
      m.setHighlight("t2", true, "#2563eb");
      m.setHighlight("q", true, "#7c3aed");
      m.setHighlight("mspcval", true, "#dc2626");
    }
  }, [controls.method, controls.lofK, focusedIndex, focusedPoint, d.scores]);

  const overlapWithPlanted = d.flagged.filter((f, i) => f && ANOMALY_DATA[i].isPlantedOutlier).length;

  return (
    <div id="anomaly-lab" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        正常クラスタ（32点）に5点の外れ値を混ぜたデータ。手法を切り替え、しきい値（上位◯%）を動かすと、粗いヒートマップ（背景色）と異常判定（赤い点）が変わる——3手法とも«スコアが高いほど異常»に統一してあるので、同じパーセンタイルしきい値で比較できる。
      </p>

      <div className="flex flex-wrap gap-2" role="group" aria-label="異常検知手法の切替">
        {(Object.keys(METHOD_LABEL) as AnomalyMethod[]).map((method) => (
          <button
            key={method}
            type="button"
            onClick={() => patchControls({ method })}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              controls.method === method ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {METHOD_LABEL[method]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={`flex flex-col gap-1 text-sm text-slate-700 ${controls.method !== "lof" ? "opacity-40" : ""}`}>
          <span>
            LOF近傍数 k = <span className="font-mono">{controls.lofK}</span>
          </span>
          <input
            type="range"
            min={LOF_K_MIN}
            max={LOF_K_MAX}
            step={1}
            value={controls.lofK}
            disabled={controls.method !== "lof"}
            onChange={(e) => patchControls({ lofK: Number(e.target.value) })}
            aria-label="LOF近傍数"
            className="accent-red-600"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          <span>
            異常しきい値（上位 <span className="font-mono">{controls.thresholdPercentile}</span>%）
          </span>
          <input
            type="range"
            min={0}
            max={50}
            step={1}
            value={controls.thresholdPercentile}
            onChange={(e) => patchControls({ thresholdPercentile: Number(e.target.value) })}
            aria-label="異常しきい値パーセンタイル"
            className="accent-red-600"
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${SCATTER_W} ${SCATTER_H}`} className="mx-auto h-auto w-full max-w-sm touch-none select-none" role="img" aria-label="異常スコアのヒートマップと判定">
          {normalizedGrid.map((c, i) => (
            <rect key={i} x={round2(px(c.x1) - GRID_CELL / 2)} y={round2(py(c.x2) - GRID_CELL / 2)} width={GRID_CELL} height={GRID_CELL} fill={scoreToHeatColor(c.normalized)} opacity={0.55} />
          ))}
          <rect x={22} y={22} width={256} height={256} fill="none" className="stroke-slate-300" />

          {ANOMALY_POINTS.map((p, i) => (
            <circle
              key={i}
              cx={px(p.x1)}
              cy={py(p.x2)}
              r={i === focusedIndex ? 6.5 : d.flagged[i] ? 4.4 : 3}
              fill={d.flagged[i] ? "#dc2626" : "#1e293b"}
              stroke={ANOMALY_DATA[i].isPlantedOutlier ? "#000" : "#fff"}
              strokeWidth={ANOMALY_DATA[i].isPlantedOutlier ? 2 : 0.8}
              opacity={i === focusedIndex ? 1 : 0.85}
            />
          ))}
          {focusedPoint ? <circle cx={px(focusedPoint.x1)} cy={py(focusedPoint.x2)} r={10} fill="none" stroke="#7c3aed" strokeWidth={2} /> : null}
        </svg>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={METHOD_FORMULA[controls.method]} display={false} />
      </div>

      <StepPlayer count={count} index={index} playing={playing} onPrev={prevFrame} onNext={nextFrame} onSeek={goToFrame} onTogglePlay={() => setPlaying(!playing)} labels={Array.from({ length: count }, (_, i) => `スコア第${i + 1}位`)} />

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <Stat label="異常フラグ件数" value={String(d.cutoffCount)} />
        <Stat label="うち«植えた»外れ値" value={`${overlapWithPlanted} / 5`} tone="emerald" />
        <Stat label="現在の順位" value={`${index + 1} / ${count}`} />
      </div>

      <Callout
        title={ANOMALY_DATA[focusedIndex]?.isPlantedOutlier ? "この点は意図的に置いた外れ値" : "この点は正常クラスタの一員"}
        body={
          ANOMALY_DATA[focusedIndex]?.isPlantedOutlier
            ? "正常クラスタから離れた位置に置いた外れ値——スコアが高く（黒枠＝植えた外れ値）、しきい値内であれば赤で異常判定される。"
            : "正常クラスタの中の点だが、スコア順位で見ると相対的に高い側に来ている——しきい値を厳しくしすぎると«誤報»（正常なのに異常判定）になりうる例。"
        }
        note="黒枠＝意図的に植えた外れ値（正解）、赤い点＝各手法が実際に異常と判定した点。両者が一致するほど、その手法とパラメータがうまく機能している。"
        kind={ANOMALY_DATA[focusedIndex]?.isPlantedOutlier ? "explain" : "supplement"}
      />
    </div>
  );
}

function Stat({ label, value, tone = "slate" }: { label: string; value: string; tone?: "slate" | "emerald" }) {
  const bg = tone === "emerald" ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-900";
  return (
    <div className={`rounded-lg px-2 py-2 ${bg}`}>
      <div className="font-mono text-sm">{value}</div>
      <div className="text-slate-500">{label}</div>
    </div>
  );
}
