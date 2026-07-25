"use client";

import { useEffect, useMemo, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout, frameAt, StepPlayer, useFramePlayer } from "@/components/viz";
import { useProbabilisticForecastingStore } from "@/lib/store/probabilistic-forecasting";
import { STEPPER_SAMPLES } from "@/lib/stats/probabilistic-forecasting";
import { buildBrierScoreFrames } from "./frames";
import { num } from "./format";

const FORMULA = `BS=\\frac{1}{n}\\sum_{i=1}^{n}(\\hat p_i-y_i)^2,\\qquad \\underbrace{(${term(
  "brs_p",
  "?",
)}-${term("brs_y", "?")})^2}_{\\text{今回の項}}=${term("brs_se", "?")},\\qquad \\overline{BS}=${term("brs_bs", "?")}`;

const COLOR_GOOD = "#16a34a";
const COLOR_BAD = "#dc2626";

/**
 * ブライアスコアの核心的可視化ステッパー(L0)。「①予測p̂と実際yを1件ずつ確認→
 * ②二乗誤差(p̂-y)²を計算→③累積和と途中経過のブライアスコアが更新される」様子を
 * 1コマずつ見せる(アルゴリズム図鑑スタイル: コマ送り・色ハイライト・近傍コールアウト)。
 * ステッパーはトピック内に1つだけなので、メインストアのframeをそのまま使う
 * (tasks/lessons.md #76の判断の目安: 2つ目を追加する時点で専用ストアに切り替える)。
 */
export function BrierScoreStepper() {
  const index = useProbabilisticForecastingStore((s) => s.frame.index);
  const count = useProbabilisticForecastingStore((s) => s.frame.count);
  const playing = useProbabilisticForecastingStore((s) => s.frame.playing);
  const nextFrame = useProbabilisticForecastingStore((s) => s.nextFrame);
  const prevFrame = useProbabilisticForecastingStore((s) => s.prevFrame);
  const goToFrame = useProbabilisticForecastingStore((s) => s.goToFrame);
  const setPlaying = useProbabilisticForecastingStore((s) => s.setPlaying);
  const setFrameCount = useProbabilisticForecastingStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildBrierScoreFrames(), []);

  useEffect(() => setFrameCount(frames.length), [frames.length, setFrameCount]);
  useFramePlayer({
    playing,
    index,
    count,
    onAdvance: nextFrame,
    onStop: () => setPlaying(false),
    intervalMs: 1400,
  });

  const frame = frameAt(frames, index);
  const payload = frame?.payload;
  const activeRow = payload?.rowIndex ?? null;

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("brs_p", formatNumber(payload?.predicted ?? 0, 2));
    m.setValue("brs_y", String(payload?.outcome ?? 0));
    m.setValue("brs_se", formatNumber(payload?.squaredError ?? 0, 3));
    m.setValue("brs_bs", formatNumber(payload?.runningScore ?? 0, 3));
    const good = (payload?.squaredError ?? 1) < 0.15;
    const color = good ? COLOR_GOOD : COLOR_BAD;
    m.setHighlight("brs_p", true, "#2563eb");
    m.setHighlight("brs_y", true, "#2563eb");
    m.setHighlight("brs_se", true, color);
    m.setHighlight("brs_bs", true, "#7c3aed");
  }, [payload]);

  return (
    <div
      id="brier-score-stepper"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <p className="text-sm text-slate-600">
        10件の予測を1件ずつ確認しながら、
        <strong className="font-semibold text-slate-900">二乗誤差 (p̂−y)²</strong>
        が積み上がっていく様子を見よう。自信満々(p̂が0か1に近い)で外すと二乗誤差が大きく跳ね上がる。
      </p>

      <div className="overflow-x-auto">
        <table
          className="w-full min-w-[480px] border-collapse text-sm"
          data-testid="brier-stepper-table"
        >
          <thead>
            <tr>
              <th className="border border-slate-200 bg-slate-50 px-3 py-2 text-left font-medium text-slate-500">
                #
              </th>
              <th className="border border-slate-200 bg-slate-50 px-3 py-2 text-right font-medium text-slate-500">
                予測 p̂
              </th>
              <th className="border border-slate-200 bg-slate-50 px-3 py-2 text-right font-medium text-slate-500">
                実際 y
              </th>
              <th className="border border-slate-200 bg-slate-50 px-3 py-2 text-right font-medium text-slate-500">
                二乗誤差
              </th>
              <th className="border border-slate-200 bg-slate-50 px-3 py-2 text-right font-medium text-slate-500">
                累積和
              </th>
            </tr>
          </thead>
          <tbody>
            {STEPPER_SAMPLES.map((s, i) => {
              const row = frames.find((f) => f.payload?.rowIndex === i)?.payload;
              const isActive = activeRow === i;
              const isRevealed =
                payload?.phase === "summary" || (activeRow !== null && i <= activeRow);
              const se = row?.squaredError ?? (s.predicted - s.outcome) ** 2;
              return (
                <tr
                  key={i}
                  data-testid={`brier-stepper-row-${i}`}
                  className={isActive ? "bg-amber-50" : isRevealed ? "" : "opacity-30"}
                >
                  <td className="border border-slate-200 px-3 py-1 font-mono">{i + 1}</td>
                  <td className="border border-slate-200 px-3 py-1 text-right font-mono">
                    {num(s.predicted, 2)}
                  </td>
                  <td className="border border-slate-200 px-3 py-1 text-right font-mono">
                    {s.outcome}
                  </td>
                  <td
                    className="border border-slate-200 px-3 py-1 text-right font-mono"
                    style={
                      isRevealed
                        ? { color: se < 0.15 ? COLOR_GOOD : COLOR_BAD, fontWeight: 600 }
                        : undefined
                    }
                  >
                    {isRevealed ? num(se, 3) : "?"}
                  </td>
                  <td className="border border-slate-200 px-3 py-1 text-right font-mono">
                    {isRevealed ? num(row?.cumulativeSum ?? 0, 3) : "?"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} display={false} />
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
