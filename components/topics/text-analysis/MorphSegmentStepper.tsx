"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { JA_SENTENCES } from "@/lib/stats/text-analysis";
import { useMorphFrameStore, useTextAnalysisStore } from "@/lib/store/text-analysis";
import { buildMorphFrames } from "./morphFrames";

/**
 * 分かち書き（形態素解析の入口）ステッパー（描画層）。日本語の短い例文を前方最長一致法で
 * 左から走査し、各位置で辞書に前方一致する候補のうち最長のものを貪欲に選ぶ様子を
 * 1トークンずつコマ送りで見せる（アルゴリズム図鑑スタイル: 色ハイライト＋近傍コールアウト）。
 * 例文選択（jaSentenceIndex）はメインストア共有、コマ位置は本ステッパー専用の空フレームストア
 * （tasks/lessons.md #76: 1トピックに複数StepPlayerを置くときはstepperごとにストアを分ける）。
 */
export function MorphSegmentStepper() {
  const jaSentenceIndex = useTextAnalysisStore((s) => s.controls.jaSentenceIndex);
  const jaSentence = useTextAnalysisStore((s) => s.derived.jaSentence);
  const setControl = useTextAnalysisStore((s) => s.setControl);

  const index = useMorphFrameStore((s) => s.frame.index);
  const count = useMorphFrameStore((s) => s.frame.count);
  const playing = useMorphFrameStore((s) => s.frame.playing);
  const nextFrame = useMorphFrameStore((s) => s.nextFrame);
  const prevFrame = useMorphFrameStore((s) => s.prevFrame);
  const goToFrame = useMorphFrameStore((s) => s.goToFrame);
  const setPlaying = useMorphFrameStore((s) => s.setPlaying);
  const setFrameCount = useMorphFrameStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildMorphFrames(jaSentence), [jaSentence]);
  useEffect(() => {
    setFrameCount(frames.length);
    goToFrame(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frames.length]);

  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 1800 });

  const frame = frameAt(frames, index);
  const position = frame?.payload?.position ?? 0;
  const chosen = frame?.payload?.chosen ?? "";
  const chosenEnd = position + chosen.length;

  return (
    <div id="ta-morph" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="ta-morph-sentence" className="text-xs font-semibold text-slate-700">
          例文
        </label>
        <select
          id="ta-morph-sentence"
          value={jaSentenceIndex}
          onChange={(e) => setControl("jaSentenceIndex", Number(e.target.value))}
          className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
        >
          {JA_SENTENCES.map((s, i) => (
            <option key={s} value={i}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <p className="overflow-x-auto whitespace-nowrap rounded-xl bg-slate-50 px-4 py-4 text-center font-mono text-xl tracking-wide">
        {jaSentence.split("").map((ch, i) => {
          const isChosen = i >= position && i < chosenEnd;
          const isDone = i < position;
          return (
            <span
              key={i}
              className={
                isChosen
                  ? "rounded bg-blue-600 px-0.5 text-white"
                  : isDone
                    ? "text-slate-400"
                    : "text-slate-800"
              }
            >
              {ch}
            </span>
          );
        })}
      </p>

      {frame ? (
        <p className="text-center font-mono text-xs text-slate-500">
          ステップ {index + 1}/{count} ／ 確定済みトークン: {frame.payload?.tokensSoFar.join(" / ")}
        </p>
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

      <p className="text-xs leading-relaxed text-slate-500">
        辞書に「データ」「サイエンス」「データサイエンス」のように部分的に重なる語が入っている場合、前方最長一致法は常により長い方（意味のまとまりが大きい方）を優先する——これが分かち書き（形態素解析の入口）の最も単純な実装方針。
      </p>
    </div>
  );
}
