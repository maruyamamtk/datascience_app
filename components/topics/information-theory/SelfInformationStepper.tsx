"use client";

import { useEffect, useMemo, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout, frameAt, StepPlayer, useFramePlayer } from "@/components/viz";
import { selfInformation } from "@/lib/stats/information-theory";
import { useInformationTheoryStore } from "@/lib/store/information-theory";
import { buildSelfInformationFrames } from "./frames";

// I(x) = -log2( p ) = 結果 bit
const FORMULA = `I(x)=-\\log_2 ${term("p", "?")}=${term("result", "?")}\\ \\text{bit}`;

const COLOR_P = "#2563eb";
const COLOR_RESULT = "#7c3aed";

/**
 * SelfInformationStepper(L1): 「確率pの事象が起きたと知ったときの自己情報量I=-log2 p」を、
 * 確実な事象(p=1)から珍しい事象(p=0.01)まで5つの具体例で1コマずつ見せる
 * (アルゴリズム図鑑スタイル: コマ送り・色ハイライト・近傍コールアウト)。
 * このトピック唯一のStepPlayerなので、メインストアのframeを共用する(lessons.md #76)。
 */
export function SelfInformationStepper() {
  const index = useInformationTheoryStore((s) => s.frame.index);
  const count = useInformationTheoryStore((s) => s.frame.count);
  const playing = useInformationTheoryStore((s) => s.frame.playing);
  const nextFrame = useInformationTheoryStore((s) => s.nextFrame);
  const prevFrame = useInformationTheoryStore((s) => s.prevFrame);
  const goToFrame = useInformationTheoryStore((s) => s.goToFrame);
  const setPlaying = useInformationTheoryStore((s) => s.setPlaying);
  const setFrameCount = useInformationTheoryStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildSelfInformationFrames(), []);

  useEffect(() => setFrameCount(frames.length), [frames.length, setFrameCount]);
  useFramePlayer({
    playing,
    index,
    count,
    onAdvance: nextFrame,
    onStop: () => setPlaying(false),
    intervalMs: 1800,
  });

  const frame = frameAt(frames, index);
  const p = frame?.payload?.p ?? 1;
  const label = frame?.payload?.label ?? "";
  const info = selfInformation(p);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("p", formatNumber(p, 3));
    m.setValue("result", formatNumber(info, 3));
    m.setHighlight("p", true, COLOR_P);
    m.setHighlight("result", true, COLOR_RESULT);
  }, [p, info]);

  return (
    <div
      id="self-information-stepper"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <p className="text-sm text-slate-600">
        確率pの事象が「実際に起きた」と知ったときの自己情報量I(x)=-log2 pを、確実な事象から
        珍しい事象まで5つの例で1コマずつ確かめる。
      </p>

      <div className="rounded-xl bg-slate-50 px-4 py-3 text-center">
        <p className="text-sm font-semibold text-slate-800" data-testid="self-info-label">
          {label}(p={formatNumber(p, 3)})
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} display={false} />
      </div>

      <div className="text-center text-xs text-slate-500">
        現在の自己情報量:{" "}
        <span className="font-mono text-base font-semibold text-violet-700" data-testid="self-info-value">
          {formatNumber(info, 3)} bit
        </span>
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
        labels={frames.map((f) => f.payload?.label ?? "")}
      />
    </div>
  );
}
