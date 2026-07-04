"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { ITEMS } from "@/lib/store/qualitative-data-analysis";
import { useQualStore } from "@/lib/store/qualitative-data-analysis";
import { buildQuant1Frames, DEMO_ROWS, PRED_CATS } from "./frames";

/**
 * 数量化I類の «生データ→ダミー符号化→カテゴリ数量→予測» を1コマずつ見せるステッパー（描画層）。
 * 段階に応じてダミー列・推定スコアバー・予測の分解を出す（アルゴリズム図鑑スタイル）。
 * フレーム位置は共有ストアの frame。
 */
export function Quant1Stepper() {
  const index = useQualStore((s) => s.frame.index);
  const count = useQualStore((s) => s.frame.count);
  const playing = useQualStore((s) => s.frame.playing);
  const nextFrame = useQualStore((s) => s.nextFrame);
  const prevFrame = useQualStore((s) => s.prevFrame);
  const goToFrame = useQualStore((s) => s.goToFrame);
  const setPlaying = useQualStore((s) => s.setPlaying);
  const setFrameCount = useQualStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildQuant1Frames(), []);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 2600 });

  const frame = frameAt(frames, index);
  const p = frame?.payload;
  const stage = p?.stage ?? "raw";
  const showDummy = stage === "dummy";
  const showScores = stage === "scores" || stage === "predict";

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">数量化I類の手順（天気×曜日 → 売上）</p>

      {/* データ表 */}
      <div className="overflow-x-auto">
        <table className="mx-auto border-collapse text-center text-xs" data-testid="quant-table">
          <thead>
            <tr className="text-[10px] text-slate-500">
              <th className="px-2 py-1">天気</th>
              <th className="px-2 py-1">曜日</th>
              {showDummy ? (
                <>
                  <th className="px-1 py-1 text-blue-600">曇?</th>
                  <th className="px-1 py-1 text-blue-600">雨?</th>
                  <th className="px-1 py-1 text-blue-600">週末?</th>
                </>
              ) : null}
              <th className="px-2 py-1">売上</th>
            </tr>
          </thead>
          <tbody>
            {DEMO_ROWS.map((r, i) => (
              <tr key={i}>
                <td className="border border-slate-200 px-2 py-1">{ITEMS[0].categories[r.cats[0]]}</td>
                <td className="border border-slate-200 px-2 py-1">{ITEMS[1].categories[r.cats[1]]}</td>
                {showDummy ? (
                  <>
                    <td className="border border-slate-200 px-1 py-1 font-mono text-blue-600">{r.cats[0] === 1 ? 1 : 0}</td>
                    <td className="border border-slate-200 px-1 py-1 font-mono text-blue-600">{r.cats[0] === 2 ? 1 : 0}</td>
                    <td className="border border-slate-200 px-1 py-1 font-mono text-blue-600">{r.cats[1] === 1 ? 1 : 0}</td>
                  </>
                ) : null}
                <td className="border border-slate-200 px-2 py-1 font-mono font-semibold text-slate-800">{r.y}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* スコアバー */}
      {showScores && p ? (
        <div className="space-y-1 rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-[10px] text-slate-500">推定カテゴリ数量（定数 {p.constant.toFixed(1)}・R²={p.rSquared.toFixed(2)}）</p>
          {ITEMS.map((it, item) => (
            <div key={it.name} className="flex flex-wrap items-center gap-2 text-xs">
              <span className="w-10 text-slate-500">{it.name}</span>
              {it.categories.map((cat, c) => {
                const v = p.scores[item][c];
                const sel = stage === "predict" && PRED_CATS[item] === c;
                return (
                  <span key={cat} className={`rounded px-2 py-0.5 font-mono ${sel ? "bg-violet-200 text-violet-800" : v >= 0 ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>
                    {cat} {v >= 0 ? "+" : ""}{v.toFixed(1)}
                  </span>
                );
              })}
            </div>
          ))}
          {stage === "predict" ? (
            <p className="pt-1 text-center font-mono text-sm text-violet-700">
              晴×週末：{p.constant.toFixed(1)} + {p.scores[0][0].toFixed(1)} + {p.scores[1][1].toFixed(1)} = {p.predValue.toFixed(1)} 万円
            </p>
          ) : null}
        </div>
      ) : null}

      {frame?.callout ? <Callout {...frame.callout} /> : null}

      <StepPlayer count={count} index={index} playing={playing} onPrev={prevFrame} onNext={nextFrame} onSeek={goToFrame} onTogglePlay={() => setPlaying(!playing)} />

      <p className="text-xs leading-relaxed text-slate-500">
        ▶ 再生で «生データ→ダミー符号化→カテゴリ数量の推定→予測» と進みます。②で質的変数が0/1の数値に変わり、③で各カテゴリの «効き» がスコアになります。
      </p>
    </div>
  );
}
