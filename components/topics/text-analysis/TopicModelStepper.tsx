"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { EN_CORPUS } from "@/lib/stats/text-analysis";
import { useTextAnalysisStore, useTopicModelFrameStore } from "@/lib/store/text-analysis";
import { buildTopicModelFrames } from "./topicModelFrames";

const TOPIC_COLOR = ["#2563eb", "#9333ea"];
const TOPIC_BG = ["bg-blue-50 border-blue-300 text-blue-800", "bg-purple-50 border-purple-300 text-purple-800"];

/**
 * トピックモデル（簡易 k=2 クラスタリング）ステッパー（描画層）。5文書の tf-idf ベクトルを
 * 2クラスタへ«割り当て→中心更新»を繰り返す様子を1反復ずつコマ送りで見せ、最終的に
 * 各クラスタで tf-idf 合計が高い語を「そのトピックらしい語」として表示する。
 */
export function TopicModelStepper() {
  const steps = useTextAnalysisStore((s) => s.derived.topicSteps);
  const topicTopWords = useTextAnalysisStore((s) => s.derived.topicTopWords);

  const index = useTopicModelFrameStore((s) => s.frame.index);
  const count = useTopicModelFrameStore((s) => s.frame.count);
  const playing = useTopicModelFrameStore((s) => s.frame.playing);
  const nextFrame = useTopicModelFrameStore((s) => s.nextFrame);
  const prevFrame = useTopicModelFrameStore((s) => s.prevFrame);
  const goToFrame = useTopicModelFrameStore((s) => s.goToFrame);
  const setPlaying = useTopicModelFrameStore((s) => s.setPlaying);
  const setFrameCount = useTopicModelFrameStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildTopicModelFrames(steps), [steps]);
  useEffect(() => {
    setFrameCount(frames.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frames.length]);

  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 2000 });

  const frame = frameAt(frames, index);
  const assignment = frame?.payload?.assignment ?? [];
  const changed = frame?.payload?.changedFromPrev ?? [];
  const isLast = index === count - 1;

  return (
    <div id="ta-topicmodel" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        5つの文書（D1〜D5）の tf-idf ベクトルを、内容が近い2つの «トピック»（クラスタ）に振り分ける。本格的なLDAのようなギブスサンプリングは行わず、コサイン類似度ベースの単純な反復クラスタリングで直感を掴む。
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {EN_CORPUS.map((sentence, i) => {
          const cluster = assignment[i] ?? 0;
          const didChange = changed[i];
          return (
            <div
              key={sentence}
              className={`rounded-lg border px-3 py-2 text-xs transition ${TOPIC_BG[cluster]} ${didChange ? "ring-2 ring-offset-1 ring-amber-400" : ""}`}
            >
              <span className="font-mono font-semibold">D{i + 1}</span>
              <span className="ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: TOPIC_COLOR[cluster], color: "white" }}>
                トピック{cluster === 0 ? "A" : "B"}
              </span>
              <p className="mt-1 leading-snug text-slate-600">{sentence}</p>
            </div>
          );
        })}
      </div>

      {frame ? (
        <p className="text-center font-mono text-xs text-slate-500">反復 {index + 1}/{count}</p>
      ) : null}

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

      {isLast ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {topicTopWords.map((words, k) => (
            <div key={k} className={`rounded-lg border px-3 py-2 text-sm ${TOPIC_BG[k]}`}>
              <span className="font-semibold">トピック{k === 0 ? "A" : "B"}らしい語:</span>{" "}
              <span className="font-mono">{words.join(", ") || "（なし）"}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
