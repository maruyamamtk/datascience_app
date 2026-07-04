"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { useContingencyStore } from "@/lib/store/contingency-tables";
import { buildIndependenceFrames, COL_LABELS, ROW_LABELS } from "./frames";

/**
 * カイ二乗独立性検定の «観測→周辺和→期待→セル寄与→判定» を1コマずつ見せるステッパー（描画層）。
 * 段階に応じて期待度数・セル寄与を重ね、寄与の大きいセルを濃く塗る（アルゴリズム図鑑スタイル）。
 * フレーム位置は共有ストアの frame。
 */
export function IndependenceStepper() {
  const index = useContingencyStore((s) => s.frame.index);
  const count = useContingencyStore((s) => s.frame.count);
  const playing = useContingencyStore((s) => s.frame.playing);
  const nextFrame = useContingencyStore((s) => s.nextFrame);
  const prevFrame = useContingencyStore((s) => s.prevFrame);
  const goToFrame = useContingencyStore((s) => s.goToFrame);
  const setPlaying = useContingencyStore((s) => s.setPlaying);
  const setFrameCount = useContingencyStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildIndependenceFrames(), []);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 1800 });

  const frame = frameAt(frames, index);
  const p = frame?.payload;
  const table = p?.table ?? [];
  const stage = p?.stage ?? "observed";
  const showMarginals = stage !== "observed";
  const expected = p?.expected;
  const contributions = p?.contributions;
  const maxContrib = contributions ? Math.max(1, ...contributions.flat()) : 1;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">カイ二乗独立性検定の手順</p>

      <div className="overflow-x-auto">
        <table className="mx-auto border-collapse text-center text-sm" data-testid="indep-table">
          <thead>
            <tr>
              <th className="px-2 py-1"></th>
              {COL_LABELS.map((c) => (
                <th key={c} className="px-3 py-1 text-xs text-slate-500">{c}</th>
              ))}
              {showMarginals ? <th className="px-3 py-1 text-xs text-amber-600">行和</th> : null}
            </tr>
          </thead>
          <tbody>
            {table.map((row, i) => (
              <tr key={i}>
                <th className="px-2 py-1 text-xs text-slate-500">{ROW_LABELS[i]}</th>
                {row.map((o, j) => {
                  const contrib = contributions?.[i][j] ?? 0;
                  const bg =
                    contributions && stage !== "expected"
                      ? `rgba(124,58,237,${0.1 + (contrib / maxContrib) * 0.6})`
                      : "transparent";
                  return (
                    <td key={j} className="border border-slate-200 px-3 py-1.5" style={{ background: bg }}>
                      <div className="font-mono font-semibold text-slate-800">{o}</div>
                      {expected ? <div className="text-[9px] text-slate-500">E {expected[i][j].toFixed(1)}</div> : null}
                      {contributions && stage !== "expected" ? (
                        <div className="text-[9px] font-semibold text-violet-700">+{contrib.toFixed(2)}</div>
                      ) : null}
                    </td>
                  );
                })}
                {showMarginals ? <td className="px-3 py-1 font-mono text-xs text-amber-600">{p?.rowSums[i]}</td> : null}
              </tr>
            ))}
            {showMarginals ? (
              <tr>
                <th className="px-2 py-1 text-xs text-amber-600">列和</th>
                {p?.colSums.map((cs, j) => (
                  <td key={j} className="px-3 py-1 font-mono text-xs text-amber-600">{cs}</td>
                ))}
                <td className="px-3 py-1 font-mono text-xs text-slate-500">N={p?.total}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {stage === "decision" || stage === "contributions" ? (
        <p className="text-center font-mono text-sm text-slate-700">
          χ²={p?.chi2.toFixed(2)}・df={p?.df}
          {stage === "decision" ? ` ・p=${p?.pValue.toFixed(4)}` : ""}
          {stage === "decision" && (p?.pValue ?? 1) < 0.05 ? " ← 独立を棄却" : ""}
        </p>
      ) : null}

      {frame?.callout ? <Callout {...frame.callout} /> : null}

      <StepPlayer count={count} index={index} playing={playing} onPrev={prevFrame} onNext={nextFrame} onSeek={goToFrame} onTogglePlay={() => setPlaying(!playing)} />

      <p className="text-xs leading-relaxed text-slate-500">
        ▶ 再生で «観測→周辺和→期待度数→セル寄与→判定» と進みます。④で濃いセルが独立からのズレの主因です。
      </p>
    </div>
  );
}
