"use client";

import { useEffect, useMemo, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout, frameAt, StepPlayer, useFramePlayer } from "@/components/viz";
import { useStPetersburgStepperStore } from "@/lib/store/utility-theory";
import { buildStPetersburgFrames } from "./frames";
import { num } from "./format";

const MAX_N = 10;

const FORMULA = `E[X]=\\sum_{n=1}^{${term("n", "N")}}\\underbrace{\\frac{1}{2^n}}_{\\text{確率}}\\cdot\\underbrace{2^n}_{\\text{払戻額}}=${term(
  "ev",
  "?",
)},\\qquad E[u(X)]=\\sum_{n=1}^{${term("n2", "N")}}\\frac{1}{2^n}\\log_2 2^n=${term("eu", "?")}`;

const COLOR_EV = "#dc2626";
const COLOR_EU = "#2563eb";

/**
 * サンクトペテルブルクのパラドックスの核心的可視化ステッパー(L0)。
 * 「①n回目に初めて表→②払戻額2^n・確率(1/2)^nの項を1つずつ足す→③期待金額の部分和は
 *  発散するが、log2効用の期待値は2に収束する」を1コマずつ見せる
 * (アルゴリズム図鑑スタイル: コマ送り・色ハイライト・近傍コールアウト)。
 * ステッパーは複数あるため専用の空ストアでframeを管理する(lessons.md #76)。
 */
export function StPetersburgStepper() {
  const index = useStPetersburgStepperStore((s) => s.frame.index);
  const count = useStPetersburgStepperStore((s) => s.frame.count);
  const playing = useStPetersburgStepperStore((s) => s.frame.playing);
  const nextFrame = useStPetersburgStepperStore((s) => s.nextFrame);
  const prevFrame = useStPetersburgStepperStore((s) => s.prevFrame);
  const goToFrame = useStPetersburgStepperStore((s) => s.goToFrame);
  const setPlaying = useStPetersburgStepperStore((s) => s.setPlaying);
  const setFrameCount = useStPetersburgStepperStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildStPetersburgFrames(MAX_N), []);

  useEffect(() => setFrameCount(frames.length), [frames.length, setFrameCount]);
  useFramePlayer({
    playing,
    index,
    count,
    onAdvance: nextFrame,
    onStop: () => setPlaying(false),
    intervalMs: 1200,
  });

  const frame = frameAt(frames, index);
  const payload = frame?.payload;
  const currentN = payload?.n ?? MAX_N;

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    const nLabel = payload?.phase === "summary" ? String(MAX_N) : String(currentN);
    m.setValue("n", nLabel);
    m.setValue("n2", nLabel);
    m.setValue("ev", formatNumber(payload?.partialExpectedValue ?? 0, 0));
    m.setValue("eu", formatNumber(payload?.partialExpectedUtility ?? 0, 3));
    m.setHighlight("ev", true, COLOR_EV);
    m.setHighlight("eu", true, COLOR_EU);
  }, [payload, currentN]);

  const terms = useMemo(
    () =>
      Array.from({ length: MAX_N }, (_, i) => {
        const n = i + 1;
        return { n, payoff: 2 ** n, probability: (1 / 2) ** n };
      }),
    [],
  );

  return (
    <div
      id="st-petersburg-stepper"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <p className="text-sm text-slate-600">
        「初めて表が出るまでコインを投げ続け、n回目で表が出たら
        <strong className="font-semibold text-slate-900">2ⁿ円</strong>
        もらえる」くじ。項を1つずつ足しながら、期待金額と期待効用(log₂)の部分和を比べよう。
      </p>

      <div className="overflow-x-auto">
        <table
          className="w-full min-w-[420px] border-collapse text-sm"
          data-testid="st-petersburg-table"
        >
          <thead>
            <tr>
              <th className="border border-slate-200 bg-slate-50 px-3 py-2 text-left font-medium text-slate-500">
                n
              </th>
              <th className="border border-slate-200 bg-slate-50 px-3 py-2 text-right font-medium text-slate-500">
                払戻額 2ⁿ
              </th>
              <th className="border border-slate-200 bg-slate-50 px-3 py-2 text-right font-medium text-slate-500">
                確率 (1/2)ⁿ
              </th>
            </tr>
          </thead>
          <tbody>
            {terms.map((t) => {
              const isActive = payload?.phase === "term" && t.n === currentN;
              const isRevealed =
                payload?.phase === "summary" || (currentN !== null && t.n <= currentN);
              return (
                <tr
                  key={t.n}
                  data-testid={`st-petersburg-row-${t.n}`}
                  className={isActive ? "bg-amber-50" : isRevealed ? "" : "opacity-30"}
                >
                  <td className="border border-slate-200 px-3 py-1 font-mono">{t.n}</td>
                  <td className="border border-slate-200 px-3 py-1 text-right font-mono">
                    {num(t.payoff)}円
                  </td>
                  <td className="border border-slate-200 px-3 py-1 text-right font-mono">
                    {t.probability < 0.001 ? t.probability.toExponential(2) : num(t.probability, 4)}
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
