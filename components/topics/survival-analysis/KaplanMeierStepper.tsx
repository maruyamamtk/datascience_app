"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { useSurvivalStore } from "@/lib/store/survival-analysis";
import { buildKaplanMeierFrames, DEMO } from "./frames";

/**
 * カプラン–マイヤー構成の «リスク集合→イベント→積・極限» を1コマずつ見せるステッパー（描画層）。
 * 6個体のタイムラインと、これまでに作った階段曲線を段階的に描く（アルゴリズム図鑑スタイル）。
 * フレーム位置は共有ストアの frame。
 */

const W = 320;
const H = 120;
const PAD = 24;
const MAXT = 9;
const round2 = (v: number) => Math.round(v * 100) / 100;

export function KaplanMeierStepper() {
  const index = useSurvivalStore((s) => s.frame.index);
  const count = useSurvivalStore((s) => s.frame.count);
  const playing = useSurvivalStore((s) => s.frame.playing);
  const nextFrame = useSurvivalStore((s) => s.nextFrame);
  const prevFrame = useSurvivalStore((s) => s.prevFrame);
  const goToFrame = useSurvivalStore((s) => s.goToFrame);
  const setPlaying = useSurvivalStore((s) => s.setPlaying);
  const setFrameCount = useSurvivalStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildKaplanMeierFrames(), []);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 2400 });

  const frame = frameAt(frames, index);
  const p = frame?.payload;
  const stepIndex = p?.stepIndex ?? -1;
  const currentTime = p?.time ?? null;

  const sx = (t: number) => round2(PAD + (t / MAXT) * (W - 2 * PAD));

  // これまでのステップから S 曲線パス（stepIndex まで）。
  const shownSteps = frames.slice(1, stepIndex + 2).map((f) => f.payload!);
  const svy = (s: number) => round2(H - PAD - s * (H - 2 * PAD));
  let curvePath = `M ${sx(0)} ${svy(1)}`;
  let prev = 1;
  for (const st of shownSteps) {
    if (st.time == null) continue;
    curvePath += ` L ${sx(st.time)} ${svy(prev)} L ${sx(st.time)} ${svy(st.survival)}`;
    prev = st.survival;
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">カプラン–マイヤーの組み立て（6個体・× は打ち切り）</p>

      {/* 個体タイムライン */}
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${DEMO.length * 16 + 20}`} className="mx-auto w-full max-w-sm" role="img" aria-label="個体のタイムライン">
          {DEMO.map((o, i) => {
            const y = 10 + i * 16;
            const active = currentTime != null && o.time === currentTime;
            const atRisk = currentTime != null && o.time >= currentTime;
            return (
              <g key={i}>
                <line x1={sx(0)} y1={y} x2={sx(o.time)} y2={y} className={atRisk ? "stroke-slate-400" : "stroke-slate-200"} strokeWidth={1.5} />
                {o.event ? (
                  <circle cx={sx(o.time)} cy={y} r={3.5} className={active ? "fill-violet-600" : "fill-slate-500"} />
                ) : (
                  <text x={sx(o.time)} y={y + 3} textAnchor="middle" className="fill-slate-400 text-[9px]">×</text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* KM 曲線（段階的） */}
      {stepIndex >= 0 ? (
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-sm" role="img" aria-label="組み立て中の生存曲線">
            <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} className="stroke-slate-300" />
            <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} className="stroke-slate-300" />
            <line x1={PAD} y1={svy(0.5)} x2={W - PAD} y2={svy(0.5)} className="stroke-slate-200" strokeDasharray="3 3" />
            <path d={curvePath} fill="none" className="stroke-blue-500" strokeWidth={2} />
          </svg>
        </div>
      ) : null}

      {p && stepIndex >= 0 ? (
        <p className="text-center font-mono text-sm text-slate-700">
          リスク {p.atRisk} 人・死亡 {p.events} → (1−{p.events}/{p.atRisk}) を掛けて S={p.survival.toFixed(3)}
        </p>
      ) : null}

      {frame?.callout ? <Callout {...frame.callout} /> : null}

      <StepPlayer count={count} index={index} playing={playing} onPrev={prevFrame} onNext={nextFrame} onSeek={goToFrame} onTogglePlay={() => setPlaying(!playing)} />

      <p className="text-xs leading-relaxed text-slate-500">
        ▶ 再生でイベント時刻ごとに «(1−死亡/リスク)» を掛けて生存曲線が段差を作ります。打ち切り（×）は段差を作らず、後続のリスク集合を減らすだけです。
      </p>
    </div>
  );
}
