"use client";

import { useEffect, useMemo, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { term } from "@/components/math/tex";
import { Callout, frameAt, StepPlayer, useFramePlayer } from "@/components/viz";
import type { GroupEstimate } from "@/lib/stats/hierarchical-bayes";
import { MU, SIGMA2, TAU2_MAX, TAU2_MIN, useHierarchicalBayesStore } from "@/lib/store/hierarchical-bayes";
import { buildShrinkageFrames } from "./frames";
import { num, round2 } from "./format";

const FORMULA = `\\hat\\theta_j=${term("Bj", "?")}\\times${term("mu", "?")}+${term(
  "oneMinusBj",
  "?",
)}\\times${term("ybarj", "?")}=${term("thetaHat", "?")}`;

const COLOR_NO_POOLING = "#94a3b8";
const COLOR_COMPLETE_POOLING = "#0f172a";
const COLOR_PARTIAL_POOLING = "#2563eb";
const COLOR_CURRENT = "#f97316";

const W = 360;
const ROW_H = 30;
const PAD = { top: 10, right: 20, bottom: 24, left: 62 };

/**
 * 縮小推定(shrinkage)ラボ(Level0の中核可視化, 描画層/Control層)。
 * 6クラスのテスト平均点(生徒数=サンプルサイズが異なる)について、
 * プールなし(灰)・完全プール(黒破線)・階層ベイズ/部分プーリング(青)の3推定値を
 * 1本の数直線上に並べて表示する。τ²(グループ間分散)スライダーで縮小の強さを操作でき、
 * StepPlayerでサンプルサイズが小さい順にグループを1つずつ確認できる
 * (操作→グラフ→数式が同じstoreを購読して強連動する)。
 */
export function ShrinkageLab() {
  const tau2 = useHierarchicalBayesStore((s) => s.controls.tau2);
  const estimates = useHierarchicalBayesStore((s) => s.derived.estimates);
  const setControl = useHierarchicalBayesStore((s) => s.setControl);

  const index = useHierarchicalBayesStore((s) => s.frame.index);
  const count = useHierarchicalBayesStore((s) => s.frame.count);
  const playing = useHierarchicalBayesStore((s) => s.frame.playing);
  const nextFrame = useHierarchicalBayesStore((s) => s.nextFrame);
  const prevFrame = useHierarchicalBayesStore((s) => s.prevFrame);
  const goToFrame = useHierarchicalBayesStore((s) => s.goToFrame);
  const setPlaying = useHierarchicalBayesStore((s) => s.setPlaying);

  useFramePlayer({
    playing,
    index,
    count,
    onAdvance: nextFrame,
    onStop: () => setPlaying(false),
    intervalMs: 1800,
  });

  const frames = useMemo(() => buildShrinkageFrames(estimates), [estimates]);
  const frame = frameAt(frames, index);
  const current: GroupEstimate = frame?.payload ?? estimates[0];

  const H = PAD.top + estimates.length * ROW_H + PAD.bottom;
  const CW = W - PAD.left - PAD.right;
  const allValues = estimates.flatMap((e) => [e.noPooling, e.completePooling, e.partialPooling]);
  const xMin = Math.min(...allValues) - 3;
  const xMax = Math.max(...allValues) + 3;
  const toCx = (v: number) => round2(PAD.left + ((v - xMin) / (xMax - xMin)) * CW);
  const rowY = (i: number) => PAD.top + i * ROW_H + ROW_H / 2;

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("Bj", num(current.weight, 2));
    m.setValue("mu", num(current.completePooling, 1));
    m.setValue("oneMinusBj", num(1 - current.weight, 2));
    m.setValue("ybarj", num(current.noPooling, 1));
    m.setValue("thetaHat", num(current.partialPooling, 1));
    m.setHighlight("thetaHat", true, COLOR_PARTIAL_POOLING);
    m.setHighlight("Bj", true, COLOR_CURRENT);
    m.setHighlight("oneMinusBj", true, COLOR_CURRENT);
  }, [current]);

  return (
    <div id="shrinkage-lab" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        6クラスのテスト平均点。生徒数(サンプルサイズ)はA組{estimates[0]?.group.n}人〜
        {estimates[estimates.length - 1]?.group.label}
        {estimates[estimates.length - 1]?.group.n}人までクラスごとに違う。
        灰の点＝プールなし(自クラスの平均そのまま)、黒の破線＝完全プール(全クラス共通の平均)、
        青の点＝階層ベイズ(部分プーリング)。τ²を動かすと縮小の強さが変わる。
      </p>

      <label className="flex flex-col gap-1 text-sm text-slate-700">
        グループ間分散 τ² = {num(tau2, 0)}（τ = {num(Math.sqrt(tau2), 1)}）
        <input
          type="range"
          min={TAU2_MIN}
          max={TAU2_MAX}
          step={1}
          value={tau2}
          onChange={(e) => setControl("tau2", Number(e.target.value))}
          aria-label="グループ間分散tau2"
          data-testid="tau2-slider"
          className="accent-blue-600"
        />
        <span className="text-xs text-slate-400">
          小さいτ²＝完全プールに近づく／大きいτ²＝プールなしに近づく（群内分散 σ²≈{num(SIGMA2, 1)}、全体平均 μ≈{num(MU, 1)}）
        </span>
      </label>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mx-auto h-auto w-full max-w-lg"
        role="img"
        aria-label="プールなし・完全プール・階層ベイズ推定値の比較"
        data-testid="shrinkage-svg"
      >
        <line x1={toCx(current.completePooling)} y1={PAD.top} x2={toCx(current.completePooling)} y2={H - PAD.bottom} stroke={COLOR_COMPLETE_POOLING} strokeDasharray="3 2" data-testid="complete-pooling-line" />
        {estimates.map((e, i) => {
          const y = rowY(i);
          const isCurrent = e.group.id === current.group.id;
          return (
            <g key={e.group.id} data-testid={`shrinkage-row-${i}`}>
              {isCurrent ? (
                <rect x={0} y={y - ROW_H / 2} width={W} height={ROW_H} fill="#fff7ed" data-testid="shrinkage-row-highlight" />
              ) : null}
              <text x={4} y={y + 3} className={`text-[9px] ${isCurrent ? "fill-orange-700 font-bold" : "fill-slate-500"}`}>
                {e.group.label} n={e.group.n}
              </text>
              <line x1={toCx(e.noPooling)} y1={y} x2={toCx(e.partialPooling)} y2={y} stroke="#cbd5e1" strokeWidth={1.5} />
              <circle cx={toCx(e.noPooling)} cy={y} r={4} fill={COLOR_NO_POOLING} data-testid={`no-pooling-dot-${i}`} />
              <circle
                cx={toCx(e.partialPooling)}
                cy={y}
                r={isCurrent ? 6 : 4.5}
                fill={COLOR_PARTIAL_POOLING}
                stroke={isCurrent ? COLOR_CURRENT : "none"}
                strokeWidth={2}
                data-testid={`partial-pooling-dot-${i}`}
              />
            </g>
          );
        })}
        {[xMin, (xMin + xMax) / 2, xMax].map((t) => (
          <text key={t} x={toCx(t)} y={H - PAD.bottom + 14} textAnchor="middle" className="fill-slate-400 text-[9px]">
            {Math.round(t)}
          </text>
        ))}
      </svg>
      <div className="flex flex-wrap justify-center gap-4 text-[11px]">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: COLOR_NO_POOLING }} />プールなし(自グループ平均)</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: COLOR_PARTIAL_POOLING }} />階層ベイズ(部分プーリング)</span>
        <span className="flex items-center gap-1"><span className="h-2 w-3 border-t-2 border-dashed" style={{ borderColor: COLOR_COMPLETE_POOLING }} />完全プール(μ)</span>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} display={false} />
      </div>

      {frame?.callout ? <Callout {...frame.callout} /> : null}

      <StepPlayer
        count={count}
        index={index}
        playing={playing}
        onPrev={prevFrame}
        onNext={nextFrame}
        onSeek={goToFrame}
        onTogglePlay={() => setPlaying(!playing)}
        labels={estimates.map((e) => `${e.group.label}(n=${e.group.n})`)}
      />
    </div>
  );
}
