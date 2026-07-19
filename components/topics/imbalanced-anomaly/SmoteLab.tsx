"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout, StepPlayer, useFramePlayer } from "@/components/viz";
import type { Point2D } from "@/lib/stats/imbalanced-anomaly";
import {
  IMBALANCE_COUNTS,
  IMBALANCE_RATIO,
  MAJORITY_POINTS,
  MINORITY_POINTS,
  NUM_SYNTHETIC_MAX,
  NUM_SYNTHETIC_MIN,
  SMOTE_K_MAX,
  SMOTE_K_MIN,
  useImbalancedAnomalyStore,
} from "@/lib/store/imbalanced-anomaly";
import { px, py, round2, SCATTER_H, SCATTER_W } from "./scatter-layout";

const pairTex = (p: Point2D) => `(${formatNumber(p.x1, 2)},\\ ${formatNumber(p.x2, 2)})`;

const FORMULA = `x_{\\text{new}}=${term("xi", "(?,?)")}+${term("gap", "?")}\\big(${term("xzi", "(?,?)")}-${term(
  "xi2",
  "(?,?)",
)}\\big)=${term("xnew", "(?,?)")}`;

/**
 * SMOTE/ADASYN 合成ラボ（Level0）: k・合成数・SMOTE⇄ADASYN切替を操作すると、
 * 少数派クラス内の線分上に合成サンプルが1点ずつ増えていく様子と、その1点の生成過程
 * （種点→近傍→線分上のgap→合成点）が数式と強連動する。
 */
export function SmoteLab() {
  const controls = useImbalancedAnomalyStore((s) => s.controls);
  const d = useImbalancedAnomalyStore((s) => s.derived);
  const patchControls = useImbalancedAnomalyStore((s) => s.patchControls);

  const index = useImbalancedAnomalyStore((s) => s.frame.index);
  const count = useImbalancedAnomalyStore((s) => s.frame.count);
  const playing = useImbalancedAnomalyStore((s) => s.frame.playing);
  const nextFrame = useImbalancedAnomalyStore((s) => s.nextFrame);
  const prevFrame = useImbalancedAnomalyStore((s) => s.prevFrame);
  const goToFrame = useImbalancedAnomalyStore((s) => s.goToFrame);
  const setPlaying = useImbalancedAnomalyStore((s) => s.setPlaying);
  const setFrameCount = useImbalancedAnomalyStore((s) => s.setFrameCount);

  useEffect(() => {
    setFrameCount(d.smoteSteps.length);
  }, [d.smoteSteps.length, setFrameCount]);

  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 700 });

  const currentStep = d.smoteSteps[index];

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m || !currentStep) return;
    m.setValue("xi", pairTex(currentStep.seed));
    m.setValue("xi2", pairTex(currentStep.seed));
    m.setValue("xzi", pairTex(currentStep.neighbor));
    m.setValue("gap", formatNumber(currentStep.gap, 2));
    m.setValue("xnew", pairTex(currentStep.synthetic));
    m.setHighlight("xi", true, "#2563eb");
    m.setHighlight("xi2", true, "#2563eb");
    m.setHighlight("xzi", true, "#0891b2");
    m.setHighlight("gap", true, "#7c3aed");
    m.setHighlight("xnew", true, "#059669");
  }, [currentStep]);

  const revealed = d.smoteSteps;
  const newMinorityCount = IMBALANCE_COUNTS.minority + revealed.length;
  const newRatio = IMBALANCE_COUNTS.majority / newMinorityCount;

  return (
    <div id="smote-lab" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        多数派クラス（灰、{IMBALANCE_COUNTS.majority}点）に対し少数派クラス（オレンジ、{IMBALANCE_COUNTS.minority}
        点）が少ない不均衡データ。少数派クラス«内»の近傍点を線分で結び、その線分上に合成サンプル（緑）を1点ずつ生成する——これがSMOTE（一様に巡回）／ADASYN（学習しづらい境界の点ほど多く）の仕組み。
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          <span>
            近傍数 k = <span className="font-mono">{controls.smoteK}</span>
          </span>
          <input
            type="range"
            min={SMOTE_K_MIN}
            max={SMOTE_K_MAX}
            step={1}
            value={controls.smoteK}
            onChange={(e) => patchControls({ smoteK: Number(e.target.value) })}
            aria-label="SMOTE近傍数k"
            className="accent-emerald-700"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          <span>
            合成サンプル数 = <span className="font-mono">{controls.numSynthetic}</span>
          </span>
          <input
            type="range"
            min={NUM_SYNTHETIC_MIN}
            max={NUM_SYNTHETIC_MAX}
            step={1}
            value={controls.numSynthetic}
            onChange={(e) => patchControls({ numSynthetic: Number(e.target.value) })}
            aria-label="合成サンプル数"
            className="accent-emerald-700"
          />
        </label>
      </div>

      <div className="flex gap-2" role="group" aria-label="SMOTE / ADASYN 切替">
        <button
          type="button"
          onClick={() => patchControls({ adaptive: false })}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
            !controls.adaptive ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          SMOTE（一様に巡回）
        </button>
        <button
          type="button"
          onClick={() => patchControls({ adaptive: true })}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
            controls.adaptive ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          ADASYN（困難度で重み付け）
        </button>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${SCATTER_W} ${SCATTER_H}`} className="mx-auto h-auto w-full max-w-sm touch-none select-none" role="img" aria-label="SMOTE/ADASYNによる合成サンプル生成">
          {MAJORITY_POINTS.map((p, i) => (
            <circle key={`maj${i}`} cx={px(p.x1)} cy={py(p.x2)} r={3} fill="#cbd5e1" stroke="#94a3b8" strokeWidth={0.6} />
          ))}
          {MINORITY_POINTS.map((p, i) => (
            <circle key={`min${i}`} cx={px(p.x1)} cy={py(p.x2)} r={4.2} fill="#fbbf24" stroke="#b45309" strokeWidth={0.8} />
          ))}
          {revealed.map((s, i) => (
            <rect
              key={`syn${i}`}
              x={round2(px(s.synthetic.x1) - 3.4)}
              y={round2(py(s.synthetic.x2) - 3.4)}
              width={6.8}
              height={6.8}
              fill="#10b981"
              stroke="#065f46"
              strokeWidth={0.8}
              transform={`rotate(45 ${px(s.synthetic.x1)} ${py(s.synthetic.x2)})`}
              opacity={0.9}
            />
          ))}
          {currentStep ? (
            <>
              <line x1={px(currentStep.seed.x1)} y1={py(currentStep.seed.x2)} x2={px(currentStep.neighbor.x1)} y2={py(currentStep.neighbor.x2)} stroke="#0f172a" strokeWidth={1.2} strokeDasharray="3 2" opacity={0.7} />
              <circle cx={px(currentStep.seed.x1)} cy={py(currentStep.seed.x2)} r={6.5} fill="none" stroke="#2563eb" strokeWidth={2} />
              <circle cx={px(currentStep.neighbor.x1)} cy={py(currentStep.neighbor.x2)} r={6.5} fill="none" stroke="#0891b2" strokeWidth={2} />
              <circle cx={px(currentStep.synthetic.x1)} cy={py(currentStep.synthetic.x2)} r={7} fill="none" stroke="#059669" strokeWidth={2.4} />
            </>
          ) : null}
          <rect x={22} y={22} width={256} height={256} fill="none" className="stroke-slate-300" />
        </svg>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
        {!currentStep ? <p className="mt-1 text-xs text-slate-400">合成サンプル数を1以上にすると、生成過程がここに表示される。</p> : null}
      </div>

      <StepPlayer count={count} index={index} playing={playing} onPrev={prevFrame} onNext={nextFrame} onSeek={goToFrame} onTogglePlay={() => setPlaying(!playing)} />

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <Stat label="少数派点数（元→現在）" value={`${IMBALANCE_COUNTS.minority} → ${newMinorityCount}`} />
        <Stat label="不均衡比（元→現在）" value={`${formatNumber(IMBALANCE_RATIO, 1)} → ${formatNumber(newRatio, 1)}`} />
        <Stat label="種点" value={currentStep ? (currentStep.seedIndex < 5 ? "核（多数派から遠い）" : "境界（多数派に近い）") : "—"} />
      </div>

      <Callout
        title={controls.adaptive ? "ADASYN: 境界の点ほど多く選ばれる" : "SMOTE: 全ての少数派点を均等に巡回"}
        body={
          controls.adaptive
            ? "多数派に囲まれ«学習しづらい»境界の少数派点（種点の内訳が«境界»に偏る）ほど、局所的な困難度に比例して多く合成される——決定境界に近い領域を重点的に埋める。"
            : "少数派点を0,1,2,...と順番に巡回しながら1点ずつ合成する——«学習しやすさ»は考慮せず、すべての少数派点を均等に扱う。"
        }
        note="合成点（緑）はいずれも«種»と«少数派内近傍»を結ぶ線分の上にしか現れない——SMOTE/ADASYNが«まったく新しい場所»にはサンプルを作らないことがわかる。"
        kind="explain"
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-2">
      <div className="font-mono text-sm text-slate-900">{value}</div>
      <div className="text-slate-500">{label}</div>
    </div>
  );
}
