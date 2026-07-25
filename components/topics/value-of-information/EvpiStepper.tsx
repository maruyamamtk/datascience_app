"use client";

import { useEffect, useMemo, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout, frameAt, StepPlayer, useFramePlayer } from "@/components/viz";
import { PRIMARY_PAYOFF_MATRIX } from "@/lib/stats/decision-analysis";
import { useValueOfInformationStore } from "@/lib/store/value-of-information";
import { buildEvpiFrames } from "./frames";
import { num, pct } from "./format";

const FORMULA = `\\mathrm{EVPI}=\\underbrace{${term("perfect", "?")}}_{\\text{完全情報}}-\\underbrace{${term(
  "prior",
  "?",
)}}_{\\text{事前情報のみ}}=${term("gap", "?")}`;

const COLOR_PRIOR = "#94a3b8";
const COLOR_STATE = "#f59e0b";
const COLOR_GAP = "#2563eb";

/**
 * EVPIの核心的可視化ステッパー(L0)。「①事前情報のみでの意思決定 → ②状態ごとに"完全情報なら
 * こう選ぶ"を1つずつ確定 → ③その差=EVPI」という手順を1コマずつ見せる
 * (アルゴリズム図鑑スタイル: コマ送り・色ハイライト・近傍コールアウト)。
 * ステッパーは1トピックに1つだけなのでメインストアのframeをそのまま共用する(lessons.md #76)。
 */
export function EvpiStepper() {
  const probGood = useValueOfInformationStore((s) => s.controls.probGood);
  const actions = useValueOfInformationStore((s) => s.derived.actions);
  const states = useValueOfInformationStore((s) => s.derived.states);
  const esv = useValueOfInformationStore((s) => s.derived.esv);
  const perfectInfoEsvValue = useValueOfInformationStore((s) => s.derived.perfectInfoEsv);
  const perfectInfoBestAction = useValueOfInformationStore((s) => s.derived.perfectInfoBestAction);
  const evpiValue = useValueOfInformationStore((s) => s.derived.evpi);

  const index = useValueOfInformationStore((s) => s.frame.index);
  const count = useValueOfInformationStore((s) => s.frame.count);
  const playing = useValueOfInformationStore((s) => s.frame.playing);
  const nextFrame = useValueOfInformationStore((s) => s.nextFrame);
  const prevFrame = useValueOfInformationStore((s) => s.prevFrame);
  const goToFrame = useValueOfInformationStore((s) => s.goToFrame);
  const setPlaying = useValueOfInformationStore((s) => s.setPlaying);
  const setFrameCount = useValueOfInformationStore((s) => s.setFrameCount);

  const probabilities = useMemo(() => [probGood, 1 - probGood], [probGood]);

  const frames = useMemo(
    () =>
      buildEvpiFrames(
        PRIMARY_PAYOFF_MATRIX,
        probabilities,
        esv.bestIndex,
        esv.scores[esv.bestIndex],
        perfectInfoBestAction,
        perfectInfoEsvValue,
        evpiValue,
      ),
    [probabilities, esv, perfectInfoBestAction, perfectInfoEsvValue, evpiValue],
  );

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
  const payload = frame?.payload;
  const phase = payload?.phase ?? "prior";
  const currentState = payload?.stateIndex ?? null;
  const revealedStates = payload?.revealedStates ?? [];

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("prior", formatNumber(esv.scores[esv.bestIndex], 0));
    m.setHighlight("prior", true, COLOR_PRIOR);
    if (phase === "final") {
      m.setValue("perfect", formatNumber(perfectInfoEsvValue, 0));
      m.setValue("gap", formatNumber(evpiValue, 0));
      m.setHighlight("perfect", true, COLOR_STATE);
      m.setHighlight("gap", true, COLOR_GAP);
    } else {
      m.setValue("perfect", "?");
      m.setValue("gap", "?");
      m.setHighlight("perfect", false);
      m.setHighlight("gap", false);
    }
  }, [phase, esv, perfectInfoEsvValue, evpiValue]);

  return (
    <div id="evpi-stepper" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        工場稼働台数(行動)×景気(状態)の利得行列(決定分析(P-1)と同じ例)で、
        <strong className="font-semibold text-slate-900">「事前情報のみ」</strong>と
        <strong className="font-semibold text-slate-900">「完全情報(状態を確実に知れる)」</strong>
        での意思決定の違いを1コマずつ見る。
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-sm" data-testid="evpi-table">
          <thead>
            <tr>
              <th className="border border-slate-200 bg-slate-50 px-3 py-2 text-left font-medium text-slate-500">
                行動 \ 状態
              </th>
              {states.map((s, j) => (
                <th
                  key={s}
                  data-testid={`evpi-col-header-${j}`}
                  className={`border border-slate-200 px-3 py-2 text-center font-medium ${
                    currentState === j ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-500"
                  }`}
                >
                  {s}(p={pct(probabilities[j])})
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {actions.map((a, i) => {
              const isPriorBest = phase === "prior" && i === esv.bestIndex;
              return (
                <tr key={a} data-testid={`evpi-row-${i}`}>
                  <th
                    className={`border border-slate-200 px-3 py-2 text-left font-medium ${
                      isPriorBest ? "bg-slate-100 text-slate-900" : "text-slate-700"
                    }`}
                  >
                    {a}
                    {isPriorBest ? (
                      <span className="ml-1 text-xs font-bold text-slate-600">← 事前情報での選択</span>
                    ) : null}
                  </th>
                  {states.map((s, j) => {
                    const isStateWinner =
                      revealedStates.includes(j) && perfectInfoBestAction[j] === i;
                    return (
                      <td
                        key={s}
                        data-testid={`evpi-cell-${i}-${j}`}
                        className={`border border-slate-200 px-3 py-2 text-center ${
                          isStateWinner ? "bg-amber-50 font-bold text-amber-700" : ""
                        } ${currentState === j ? "bg-amber-50/40" : ""}`}
                      >
                        {num(PRIMARY_PAYOFF_MATRIX.payoffs[i][j])}
                        {isStateWinner ? " ★" : ""}
                      </td>
                    );
                  })}
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

      <p className="text-xs text-slate-500">
        好況になる確率pは下のラボと共有している(下のラボでpを変えると、このステッパーも連動して変わる)。現在
        p(好況)={pct(probGood)}。
      </p>
    </div>
  );
}
