"use client";

import { useEffect, useMemo, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout, frameAt, StepPlayer, useFramePlayer } from "@/components/viz";
import { MAJORITY_POINTS, MINORITY_POINTS, useSmoteFormulaStepperStore, IMBALANCED_DATA } from "@/lib/store/imbalanced-anomaly";
import { buildAdasynWeightFrames } from "./adasyn-weight-frames";
import { px, py, SCATTER_H, SCATTER_W } from "./scatter-layout";

const FORMULA1 = `\\dfrac{\\Delta_i}{k}=\\dfrac{${term("majcount", "?")}}{${term("kval", "?")}}=${term("diff", "?")}`;
const FORMULA2 = `g_i=\\dfrac{\\Delta_i}{\\sum_j\\Delta_j}=\\dfrac{${term("diff2", "?")}}{${term("sumdiff", "?")}}=${term(
  "weight",
  "?",
)}`;

/**
 * ADASYN 適応重みステッパー（Level1）: 少数派の点を1つずつ巡り、k近傍中の多数派比率Δ_iから
 * 重みg_iを求める計算を数式ハイライトで追う。SmoteLab（Level0, メインストアのframe）とは
 * 独立した専用の空ストアでframeを持つ（tasks/lessons.md #76）。
 */
export function AdasynWeightStepper() {
  const index = useSmoteFormulaStepperStore((s) => s.frame.index);
  const count = useSmoteFormulaStepperStore((s) => s.frame.count);
  const playing = useSmoteFormulaStepperStore((s) => s.frame.playing);
  const nextFrame = useSmoteFormulaStepperStore((s) => s.nextFrame);
  const prevFrame = useSmoteFormulaStepperStore((s) => s.prevFrame);
  const goToFrame = useSmoteFormulaStepperStore((s) => s.goToFrame);
  const setPlaying = useSmoteFormulaStepperStore((s) => s.setPlaying);
  const setFrameCount = useSmoteFormulaStepperStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildAdasynWeightFrames(MINORITY_POINTS, IMBALANCED_DATA), []);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 1300 });

  const frame = frameAt(frames, index);
  const p = frame?.payload;

  const mathRef1 = useRef<MathFormulaHandle>(null);
  const mathRef2 = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m1 = mathRef1.current;
    const m2 = mathRef2.current;
    if (!m1 || !m2 || !p) return;
    m1.setValue("majcount", String(p.majorityCount));
    m1.setValue("kval", String(p.k));
    m1.setValue("diff", formatNumber(p.difficulty, 2));
    m1.setHighlight("majcount", true, "#b91c1c");
    m1.setHighlight("kval", true, "#0f172a");
    m1.setHighlight("diff", true, "#7c3aed");

    m2.setValue("diff2", formatNumber(p.difficulty, 2));
    m2.setValue("sumdiff", formatNumber(p.totalDifficulty, 2));
    m2.setValue("weight", formatNumber(p.weight, 2));
    m2.setHighlight("diff2", true, "#7c3aed");
    m2.setHighlight("sumdiff", true, "#0f172a");
    m2.setHighlight("weight", true, "#059669");
  }, [p]);

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">ADASYNの適応重み g_i を、少数派点1つずつについて計算する</p>

      {p ? (
        <>
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${SCATTER_W} ${SCATTER_H}`} className="mx-auto w-full max-w-xs" role="img" aria-label="現在の少数派点とk近傍">
              {MAJORITY_POINTS.map((pt, i) => (
                <circle key={`maj${i}`} cx={px(pt.x1)} cy={py(pt.x2)} r={2.6} fill="#e2e8f0" />
              ))}
              {MINORITY_POINTS.map((pt, i) => (
                <circle key={`min${i}`} cx={px(pt.x1)} cy={py(pt.x2)} r={3.2} fill="#fde68a" />
              ))}
              {p.neighbors.map((n, i) => (
                <circle key={`nb${i}`} cx={px(n.point.x1)} cy={py(n.point.x2)} r={6} fill="none" stroke={n.isMajority ? "#b91c1c" : "#2563eb"} strokeWidth={1.8} />
              ))}
              <circle cx={px(p.point.x1)} cy={py(p.point.x2)} r={7.5} fill="#059669" stroke="#fff" strokeWidth={1.5} />
              <rect x={22} y={22} width={256} height={256} fill="none" className="stroke-slate-300" />
            </svg>
          </div>

          <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
            <MathFormula ref={mathRef1} tex={FORMULA1} display={false} />
            <div className="mt-2">
              <MathFormula ref={mathRef2} tex={FORMULA2} display={false} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="多数派近傍数" value={`${p.majorityCount} / ${p.k}`} tone="amber" />
            <Stat label="困難度 Δ_i" value={formatNumber(p.difficulty, 2)} tone="blue" />
            <Stat label="重み g_i" value={formatNumber(p.weight, 2)} tone="emerald" />
          </div>
        </>
      ) : null}

      {frame?.callout ? <Callout {...frame.callout} /> : null}

      <StepPlayer count={count} index={index} playing={playing} onPrev={prevFrame} onNext={nextFrame} onSeek={goToFrame} onTogglePlay={() => setPlaying(!playing)} />

      <p className="text-xs leading-relaxed text-slate-500">
        赤の輪＝多数派近傍、青の輪＝少数派近傍。多数派に囲まれた点ほどΔ_iが大きくなり、正規化した重みg_iも大きくなる——SmoteLab（上の操作）で«ADASYN»を選んだとき境界の点が多く選ばれるのは、この重みで種点をランダムに選んでいるため。
      </p>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "blue" | "amber" | "emerald" }) {
  const bg = { blue: "bg-blue-50 text-blue-700", amber: "bg-amber-50 text-amber-700", emerald: "bg-emerald-50 text-emerald-700" }[tone];
  return (
    <div className={`rounded-lg px-2 py-2 ${bg}`}>
      <div className="font-mono text-sm">{value}</div>
      <div className="text-slate-500">{label}</div>
    </div>
  );
}
