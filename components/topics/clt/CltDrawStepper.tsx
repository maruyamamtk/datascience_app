"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Callout, Highlight, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { drawSample } from "@/lib/stats/clt";
import { getDistribution } from "@/lib/stats/distributions";
import { mulberry32 } from "@/lib/stats/random";
import { useCltStore } from "@/lib/store/clt";
import { buildDrawFrames } from "./frames";

// コマ送りは「小さな具体例」で原理を見せる（CLAUDE.md §2）。n が大きくても見やすさ優先で上限を設ける。
const STEP_N_MAX = 12;
const COLOR_LATEST = "#2563eb";
const COLOR_DONE = "#94a3b8";

/**
 * 「1 標本を 1 観測ずつ引く」コマ送り（描画層）。元分布から n 個（見やすさのため最大 12 個）の
 * 観測を 1 つずつ提示し、暫定の標本平均が動く様子を見せる。標本平均 1 つがヒストグラムの 1 本に
 * なる、という橋渡しを担う。フレーム位置は useCltStore の frame 状態を single source of truth に。
 */
export function CltDrawStepper() {
  const distKind = useCltStore((s) => s.controls.distKind);
  const n = useCltStore((s) => s.controls.n);
  const index = useCltStore((s) => s.frame.index);
  const count = useCltStore((s) => s.frame.count);
  const playing = useCltStore((s) => s.frame.playing);
  const nextFrame = useCltStore((s) => s.nextFrame);
  const prevFrame = useCltStore((s) => s.prevFrame);
  const goToFrame = useCltStore((s) => s.goToFrame);
  const setPlaying = useCltStore((s) => s.setPlaying);
  const setFrameCount = useCltStore((s) => s.setFrameCount);

  const stepN = Math.min(n, STEP_N_MAX);
  const rngRef = useRef(mulberry32((Date.now() & 0xffffffff) >>> 0));
  const [observations, setObservations] = useState<number[]>([]);

  const drawNew = useCallback(() => {
    const obs = drawSample(distKind, stepN, rngRef.current);
    setObservations(obs);
    setFrameCount(obs.length);
    goToFrame(0);
    setPlaying(false);
  }, [distKind, stepN, setFrameCount, goToFrame, setPlaying]);

  // 分布・n が変わったら新しい標本を引き直す（初回マウント含む）。
  useEffect(() => {
    drawNew();
  }, [drawNew]);

  useFramePlayer({
    playing,
    index,
    count,
    onAdvance: nextFrame,
    onStop: () => setPlaying(false),
  });

  const frames = buildDrawFrames(observations);
  const frame = frameAt(frames, index);
  const revealedCount = frame?.payload?.step ?? 0;
  const partialMean = frame?.payload?.partialMean ?? 0;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-700">
          1 標本を 1 観測ずつ引く（{getDistribution(distKind).label} / n={stepN}）
        </p>
        <button
          type="button"
          onClick={drawNew}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
        >
          新しい標本を引く
        </button>
      </div>

      {/* 観測の並び: 引いた順に開示し、いま引いた観測を強調 */}
      <div className="flex flex-wrap gap-2" data-testid="clt-observations">
        {observations.map((v, i) => {
          const revealed = i < revealedCount;
          const isLatest = i === revealedCount - 1;
          return (
            <Highlight key={i} active={isLatest} color={COLOR_LATEST} as="span">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-lg border text-sm font-semibold"
                style={{
                  borderColor: revealed ? (isLatest ? COLOR_LATEST : COLOR_DONE) : "#e2e8f0",
                  color: revealed ? "#0f172a" : "#cbd5e1",
                  backgroundColor: revealed ? "#fff" : "#f8fafc",
                }}
              >
                {revealed ? v.toFixed(1) : "?"}
              </span>
            </Highlight>
          );
        })}
      </div>

      {/* 暫定の標本平均（フレームと連動してハイライト） */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        ここまでの標本平均
        <Highlight active color={COLOR_LATEST} as="span" className="px-2 py-0.5">
          <span className="font-mono font-semibold text-slate-900">
            X̄ = {partialMean.toFixed(2)}
          </span>
        </Highlight>
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
      />
    </div>
  );
}
