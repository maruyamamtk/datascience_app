"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { useCausalStore } from "@/lib/store/causal-inference-models";
import { buildCausalFrames, type CausalStage, type DemoUnit } from "./frames";

/**
 * 潜在的結果（Rubin 因果モデル）の «神の視点→根本問題→交絡→素朴比較のバイアス→層別調整» を
 * 6個体の固定例で1コマずつ見せるステッパー（描画層）。段階ごとに «見える結果» を切り替え、
 * 交絡・素朴比較・調整をハイライト（アルゴリズム図鑑スタイル）。フレーム位置は共有ストアの frame。
 */

/** 段階ごとに1個体のセルをどう塗る/見せるか。 */
function cellStyle(u: DemoUnit, stage: CausalStage): { y0: string; y1: string; obsSide: 0 | 1 | null } {
  const dim = "text-slate-300";
  const on = "text-slate-800 font-semibold";
  if (stage === "god") return { y0: on, y1: on, obsSide: null };
  // observed 以降は «実際に受けた方» だけ濃く。
  return { y0: u.treated ? dim : on, y1: u.treated ? on : dim, obsSide: u.treated ? 1 : 0 };
}

export function PotentialOutcomesStepper() {
  const index = useCausalStore((s) => s.frame.index);
  const count = useCausalStore((s) => s.frame.count);
  const playing = useCausalStore((s) => s.frame.playing);
  const nextFrame = useCausalStore((s) => s.nextFrame);
  const prevFrame = useCausalStore((s) => s.prevFrame);
  const goToFrame = useCausalStore((s) => s.goToFrame);
  const setPlaying = useCausalStore((s) => s.setPlaying);
  const setFrameCount = useCausalStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildCausalFrames(), []);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 2200 });

  const frame = frameAt(frames, index);
  const p = frame?.payload;
  const stage = p?.stage ?? "god";
  const units = p?.units ?? [];
  const showAssign = stage === "assignment" || stage === "naive" || stage === "adjust";
  const groupByStratum = stage === "adjust";

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">潜在的結果で «相関≠因果» を追う（6個体）</p>

      <div className="overflow-x-auto">
        <table className="mx-auto border-collapse text-center text-xs sm:text-sm" data-testid="po-table">
          <thead>
            <tr className="text-[10px] text-slate-500">
              <th className="px-2 py-1">個体</th>
              <th className="px-2 py-1">状態</th>
              <th className="px-2 py-1">Y(0)<br />処置なし</th>
              <th className="px-2 py-1">Y(1)<br />処置あり</th>
              <th className="px-2 py-1">効果<br />Y(1)−Y(0)</th>
              {showAssign ? <th className="px-2 py-1">割り当て</th> : null}
            </tr>
          </thead>
          <tbody>
            {[...units]
              .sort((a, b) => (groupByStratum ? Number(b.severe) - Number(a.severe) : a.id - b.id))
              .map((u) => {
                const st = cellStyle(u, stage);
                const rowBg = groupByStratum ? (u.severe ? "bg-rose-50" : "bg-sky-50") : "";
                return (
                  <tr key={u.id} className={rowBg}>
                    <td className="px-2 py-1 font-mono text-slate-500">#{u.id}</td>
                    <td className="px-2 py-1">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] ${u.severe ? "bg-rose-100 text-rose-700" : "bg-sky-100 text-sky-700"}`}>
                        {u.severe ? "重症" : "軽症"}
                      </span>
                    </td>
                    <td className={`border border-slate-200 px-3 py-1.5 font-mono ${st.y0}`}>{u.y0}</td>
                    <td className={`border border-slate-200 px-3 py-1.5 font-mono ${st.y1}`}>{u.y1}</td>
                    <td className="px-2 py-1 font-mono font-semibold text-emerald-600">+{u.y1 - u.y0}</td>
                    {showAssign ? (
                      <td className="px-2 py-1">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${u.treated ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"}`}>
                          {u.treated ? "処置群" : "対照群"}
                        </span>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {stage === "naive" || stage === "adjust" ? (
        <p className="text-center font-mono text-sm text-slate-700">
          {stage === "naive"
            ? `素朴比較 ${p?.treatedMean.toFixed(2)} − ${p?.controlMean.toFixed(2)} = ${p?.naive.toFixed(2)}（真の効果 2 と不一致）`
            : `層別調整 ATE = ${p?.adjusted.toFixed(2)} ← 真の効果 2 に一致`}
        </p>
      ) : null}

      {frame?.callout ? <Callout {...frame.callout} /> : null}

      <StepPlayer count={count} index={index} playing={playing} onPrev={prevFrame} onNext={nextFrame} onSeek={goToFrame} onTogglePlay={() => setPlaying(!playing)} />

      <p className="text-xs leading-relaxed text-slate-500">
        ▶ 再生で «神の視点→根本問題→交絡→素朴比較のバイアス→層別調整» と進みます。②で片方の潜在結果が薄くなる（観測できない反事実）のが因果推論の根本問題です。
      </p>
    </div>
  );
}
