"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, isHighlighted, useFramePlayer } from "@/components/viz";
import { useSplitFinderStepperStore } from "@/lib/store/decision-trees-ensembles";
import { buildSplitSearchFrames } from "./frames";

const round2 = (v: number) => Math.round(v * 100) / 100;
const W = 300;
const H = 220;
const PAD = 22;
const px = (v: number) => round2(PAD + v * (W - 2 * PAD));
const py = (v: number) => round2(PAD + (1 - v) * (H - 2 * PAD));

const LABEL_FILL = { 0: "#2563eb", 1: "#d97706" } as const;

/**
 * 「分岐探索」ステッパー（Level1）。根ノードの分割候補（特徴量×閾値）を1つずつコマ送りで調べ、
 * 情報利得が更新されるたびに線をハイライトする——CART の «全候補を試して最良を選ぶ» という
 * 貪欲アルゴリズムの中身を、数式の裏側で何が起きているか目で追えるようにする。
 */
export function SplitFinderStepper() {
  const index = useSplitFinderStepperStore((s) => s.frame.index);
  const count = useSplitFinderStepperStore((s) => s.frame.count);
  const playing = useSplitFinderStepperStore((s) => s.frame.playing);
  const nextFrame = useSplitFinderStepperStore((s) => s.nextFrame);
  const prevFrame = useSplitFinderStepperStore((s) => s.prevFrame);
  const goToFrame = useSplitFinderStepperStore((s) => s.goToFrame);
  const setPlaying = useSplitFinderStepperStore((s) => s.setPlaying);
  const setFrameCount = useSplitFinderStepperStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildSplitSearchFrames("gini"), []);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 700 });

  const frame = frameAt(frames, index);
  const p = frame?.payload;
  const current = p?.candidates[p.revealed - 1];
  const best = p ? p.candidates[p.bestIndex] : undefined;
  const isBest = isHighlighted(frame, "best");

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        分岐探索：{p?.points.length ?? 0}点の根ノードで、特徴量×閾値のすべての組み合わせを試し情報利得が最大の分割を探す
      </p>

      {p && current ? (
        <>
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-sm" role="img" aria-label="分割候補の探索">
              <rect x={PAD} y={PAD} width={W - 2 * PAD} height={H - 2 * PAD} fill="none" className="stroke-slate-300" />
              {current.feature === 0 ? (
                <line
                  x1={px(current.threshold)}
                  y1={py(1)}
                  x2={px(current.threshold)}
                  y2={py(0)}
                  stroke={isBest ? "#d97706" : "#94a3b8"}
                  strokeWidth={isBest ? 2.4 : 1.4}
                  strokeDasharray={isBest ? undefined : "4 3"}
                />
              ) : (
                <line
                  x1={px(0)}
                  y1={py(current.threshold)}
                  x2={px(1)}
                  y2={py(current.threshold)}
                  stroke={isBest ? "#d97706" : "#94a3b8"}
                  strokeWidth={isBest ? 2.4 : 1.4}
                  strokeDasharray={isBest ? undefined : "4 3"}
                />
              )}
              {p.points.map((pt, i) => (
                <circle key={`p${i}`} cx={px(pt.x1)} cy={py(pt.x2)} r={3.2} fill={LABEL_FILL[pt.label]} stroke="#fff" strokeWidth={0.8} />
              ))}
            </svg>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <Stat value={`${current.feature === 0 ? "x₁" : "x₂"} ≤ ${current.threshold.toFixed(3)}`} label="今の候補" tone="blue" />
            <Stat value={current.gain.toFixed(3)} label="今の利得" tone="amber" />
            <Stat value={`${best?.gain.toFixed(3)}`} label="最良の利得" tone="emerald" />
          </div>
        </>
      ) : null}

      {frame?.callout ? <Callout {...frame.callout} /> : null}

      <StepPlayer count={count} index={index} playing={playing} onPrev={prevFrame} onNext={nextFrame} onSeek={goToFrame} onTogglePlay={() => setPlaying(!playing)} />

      <p className="text-xs leading-relaxed text-slate-500">
        ▶ 再生ですべての候補（x₁・x₂それぞれの中点）を1つずつ試します。オレンジの実線＝これまでの最良候補、灰色の破線＝それより悪い候補。
        最後のコマで «この分割が根ノードに選ばれる» ことを確認しよう。
      </p>
    </div>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone: "amber" | "blue" | "emerald" }) {
  const bg = { amber: "bg-amber-50 text-amber-700", blue: "bg-blue-50 text-blue-700", emerald: "bg-emerald-50 text-emerald-700" }[tone];
  return (
    <div className={`rounded-lg px-2 py-2 ${bg}`}>
      <div className="font-mono text-sm">{value}</div>
      <div className="text-slate-500">{label}</div>
    </div>
  );
}
