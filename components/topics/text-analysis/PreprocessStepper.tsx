"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { EN_CORPUS, EN_STOP_WORDS, stem, tokenize } from "@/lib/stats/text-analysis";
import { usePreprocessFrameStore, useTextAnalysisStore } from "@/lib/store/text-analysis";
import { buildPreprocessFrames } from "./preprocessFrames";

/**
 * 前処理ステッパー（描画層）。英語の短い例文を①トークン化 ②ストップワード除去
 * ③ステミング、の順にコマ送りで見せる（アルゴリズム図鑑スタイル）。
 * 例文選択（enSentenceIndex）は tf-idf ラボ（同じ文書を使う）とメインストアを共有し、
 * コマ位置は本ステッパー専用の空フレームストアに分離する（tasks/lessons.md #76）。
 */
export function PreprocessStepper() {
  const enSentenceIndex = useTextAnalysisStore((s) => s.controls.enSentenceIndex);
  const enSentence = useTextAnalysisStore((s) => s.derived.enSentence);
  const setControl = useTextAnalysisStore((s) => s.setControl);

  const index = usePreprocessFrameStore((s) => s.frame.index);
  const count = usePreprocessFrameStore((s) => s.frame.count);
  const playing = usePreprocessFrameStore((s) => s.frame.playing);
  const nextFrame = usePreprocessFrameStore((s) => s.nextFrame);
  const prevFrame = usePreprocessFrameStore((s) => s.prevFrame);
  const goToFrame = usePreprocessFrameStore((s) => s.goToFrame);
  const setPlaying = usePreprocessFrameStore((s) => s.setPlaying);
  const setFrameCount = usePreprocessFrameStore((s) => s.setFrameCount);

  const tokens = useMemo(() => tokenize(enSentence), [enSentence]);
  const stopSet = useMemo(() => new Set(EN_STOP_WORDS), []);
  const survivors = useMemo(() => tokens.filter((t) => !stopSet.has(t)), [tokens, stopSet]);

  const frames = useMemo(() => buildPreprocessFrames(enSentence), [enSentence]);
  useEffect(() => {
    setFrameCount(frames.length);
    goToFrame(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frames.length]);

  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 1600 });

  const frame = frameAt(frames, index);
  const phase = frame?.payload?.phase ?? "tokenize";

  return (
    <div id="ta-preprocess" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="ta-preprocess-sentence" className="text-xs font-semibold text-slate-700">
          例文
        </label>
        <select
          id="ta-preprocess-sentence"
          value={enSentenceIndex}
          onChange={(e) => setControl("enSentenceIndex", Number(e.target.value))}
          className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
        >
          {EN_CORPUS.map((s, i) => (
            <option key={s} value={i}>
              D{i + 1}
            </option>
          ))}
        </select>
        <span className="min-w-0 flex-1 break-words text-xs text-slate-500">{enSentence}</span>
      </div>

      <div className="overflow-x-auto">
        <div className="flex min-w-max flex-wrap justify-center gap-2 rounded-xl bg-slate-50 px-4 py-4">
          {tokens.map((token, i) => {
            const isStop = stopSet.has(token);
            const stemmed = stem(token);
            // 各例文内でトークンは重複しないため単純な indexOf で対応する survivors 上の位置を求められる。
            const survIdx = survivors.indexOf(token);
            const activeTokenize = phase === "tokenize";
            const activeStopword = phase === "stopword" && frame?.payload?.tokenIndex === i;
            const activeStem = phase === "stem" && frame?.payload?.tokenIndex === survIdx && !isStop;
            const showStemResult = phase === "stem" && !isStop && (frame?.payload?.tokenIndex ?? -1) >= survIdx;

            let cls = "border-slate-300 bg-white text-slate-500";
            if (activeTokenize) cls = "border-blue-500 bg-blue-50 text-blue-800";
            else if (activeStopword) cls = isStop ? "border-red-500 bg-red-50 text-red-700" : "border-emerald-500 bg-emerald-50 text-emerald-800";
            else if (isStop) cls = "border-slate-200 bg-slate-100 text-slate-300 line-through";
            else if (activeStem) cls = "border-purple-500 bg-purple-50 text-purple-800";
            else if (showStemResult) cls = "border-slate-300 bg-white text-slate-700";

            return (
              <span key={i} className={`rounded-lg border px-2 py-1 font-mono text-sm ${cls}`}>
                {showStemResult ? stemmed : token}
              </span>
            );
          })}
        </div>
      </div>

      {frame ? (
        <p className="text-center font-mono text-xs text-slate-500">ステップ {index + 1}/{count}</p>
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
    </div>
  );
}
