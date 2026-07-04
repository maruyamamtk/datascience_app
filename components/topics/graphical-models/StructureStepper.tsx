"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { useGraphStore } from "@/lib/store/graphical-models";
import type { Structure } from "@/lib/stats/graphical";
import { buildStructureFrames } from "./frames";

/**
 * d分離の «連鎖→分岐→合流» を1コマずつ見せるステッパー（描画層）。
 * 構造ごとに DAG を描き、条件づけノードを紫、開/閉の経路を色でハイライト（アルゴリズム図鑑スタイル）。
 * フレーム位置は共有ストアの frame。
 */

const POS = { A: { x: 50, y: 55 }, B: { x: 160, y: 55 }, C: { x: 270, y: 55 } };

function edges(s: Structure): [keyof typeof POS, keyof typeof POS][] {
  if (s === "chain") return [["A", "B"], ["B", "C"]];
  if (s === "fork") return [["B", "A"], ["B", "C"]];
  return [["A", "B"], ["C", "B"]];
}

export function StructureStepper() {
  const index = useGraphStore((s) => s.frame.index);
  const count = useGraphStore((s) => s.frame.count);
  const playing = useGraphStore((s) => s.frame.playing);
  const nextFrame = useGraphStore((s) => s.nextFrame);
  const prevFrame = useGraphStore((s) => s.prevFrame);
  const goToFrame = useGraphStore((s) => s.goToFrame);
  const setPlaying = useGraphStore((s) => s.setPlaying);
  const setFrameCount = useGraphStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildStructureFrames(), []);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 2400 });

  const frame = frameAt(frames, index);
  const p = frame?.payload;
  const structure = p?.structure ?? "chain";
  const conditioned = p?.conditioned ?? false;
  const open = p ? (p.dsep ? false : true) : false; // A,C 間に情報が流れているか

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">d分離：3つの基本構造で «条件づけ» が経路を開閉する</p>

      <div className="overflow-x-auto">
        <svg viewBox="0 0 320 100" className="mx-auto w-full max-w-sm" role="img" aria-label="d分離の基本構造">
          <defs>
            <marker id="ss-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" className="fill-slate-500" />
            </marker>
          </defs>
          {edges(structure).map(([from, to], i) => {
            const f = POS[from];
            const t = POS[to];
            const dx = t.x - f.x;
            const ux = dx / Math.abs(dx);
            return <line key={i} x1={f.x + ux * 18} y1={f.y} x2={t.x - ux * 18} y2={t.y} className="stroke-slate-500" strokeWidth={2} markerEnd="url(#ss-arrow)" />;
          })}
          {/* A-C 間の «経路» 状態を上に弧で表現 */}
          <path d={`M ${POS.A.x} ${POS.A.y - 26} Q 160 ${POS.A.y - 52} ${POS.C.x} ${POS.C.y - 26}`} fill="none" strokeWidth={2.5} strokeDasharray={open ? "0" : "4 4"} className={open ? "stroke-rose-500" : "stroke-emerald-500"} />
          <text x={160} y={POS.A.y - 40} textAnchor="middle" className={`text-[10px] font-semibold ${open ? "fill-rose-600" : "fill-emerald-600"}`}>{open ? "経路：開（従属）" : "経路：閉（独立）"}</text>
          {(["A", "B", "C"] as const).map((k) => {
            const pos = POS[k];
            const isB = k === "B";
            const cond = isB && conditioned;
            return (
              <g key={k}>
                {cond ? (
                  <rect x={pos.x - 16} y={pos.y - 16} width={32} height={32} rx={4} className="fill-violet-100 stroke-violet-500" strokeWidth={2} />
                ) : (
                  <circle cx={pos.x} cy={pos.y} r={16} className="fill-white stroke-slate-400" strokeWidth={2} />
                )}
                <text x={pos.x} y={pos.y + 4} textAnchor="middle" className={`text-sm font-semibold ${cond ? "fill-violet-700" : "fill-slate-700"}`}>{k}</text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="text-center font-mono text-xs text-slate-600">
        周辺 corr(A,C)={p?.marginal.toFixed(2)}・偏相関 corr(A,C|B)={p?.partial.toFixed(2)}
      </p>

      {frame?.callout ? <Callout {...frame.callout} /> : null}

      <StepPlayer count={count} index={index} playing={playing} onPrev={prevFrame} onNext={nextFrame} onSeek={goToFrame} onTogglePlay={() => setPlaying(!playing)} />

      <p className="text-xs leading-relaxed text-slate-500">
        ▶ 再生で «連鎖→条件づけ→分岐→合流→条件づけ» と進みます。⑤で合流点を条件づけると、独立だった A,C の経路が «開く»（緑破線→赤実線）のが d分離の急所です。
      </p>
    </div>
  );
}
