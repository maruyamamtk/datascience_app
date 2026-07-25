"use client";

import { useEffect, useMemo, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout, frameAt, StepPlayer, useFramePlayer } from "@/components/viz";
import { utilityCara } from "@/lib/stats/utility-theory";
import {
  FOCUS_LOTTERY_OUTCOMES,
  useRiskAttitudeStepperStore,
  useUtilityTheoryStore,
} from "@/lib/store/utility-theory";
import { buildRiskAttitudeFrames } from "./frames";
import { num, riskAttitudeLabel, round2 } from "./format";

const FORMULA = `u(x;\\alpha)=\\frac{1-e^{-${term("alpha", "\\alpha")}x}}{\\alpha},\\qquad \\mathrm{CE}=${term(
  "ce",
  "?",
)},\\qquad \\mathrm{RP}=E[X]-\\mathrm{CE}=${term("rp", "?")}`;

const COLOR_CURVE: Record<string, string> = {
  "risk-averse": "#dc2626",
  "risk-neutral": "#64748b",
  "risk-loving": "#16a34a",
};

const W = 340;
const H = 200;
const PAD = { top: 16, right: 16, bottom: 30, left: 20 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

/**
 * リスク態度3分類(回避的/中立/受容的)を1コマずつ切り替えて効用曲線の形の違いを比較する
 * ステッパー(L1)。固定のくじ(2台稼働: 好況700万円/不況−300万円)に対して、同じ確率で
 * αだけを変えたときに効用曲線の凹凸・確実同値額(CE)・リスクプレミアム(RP)がどう変わるかを
 * 「弦(2点を結ぶ直線)と曲線の位置関係」で見せる(高校数学の「上に凸/下に凸」の図そのもの)。
 * ステッパーは複数あるため専用の空ストアでframeを管理する(lessons.md #76)。
 */
export function RiskAttitudeStepper() {
  const probGood = useUtilityTheoryStore((s) => s.controls.probGood);

  const index = useRiskAttitudeStepperStore((s) => s.frame.index);
  const count = useRiskAttitudeStepperStore((s) => s.frame.count);
  const playing = useRiskAttitudeStepperStore((s) => s.frame.playing);
  const nextFrame = useRiskAttitudeStepperStore((s) => s.nextFrame);
  const prevFrame = useRiskAttitudeStepperStore((s) => s.prevFrame);
  const goToFrame = useRiskAttitudeStepperStore((s) => s.goToFrame);
  const setPlaying = useRiskAttitudeStepperStore((s) => s.setPlaying);
  const setFrameCount = useRiskAttitudeStepperStore((s) => s.setFrameCount);

  const probabilities = useMemo(() => [probGood, 1 - probGood], [probGood]);
  const frames = useMemo(
    () => buildRiskAttitudeFrames(FOCUS_LOTTERY_OUTCOMES, probabilities),
    [probabilities],
  );

  useEffect(() => setFrameCount(frames.length), [frames.length, setFrameCount]);
  useFramePlayer({
    playing,
    index,
    count,
    onAdvance: nextFrame,
    onStop: () => setPlaying(false),
    intervalMs: 2200,
  });

  const frame = frameAt(frames, index);
  const payload = frame?.payload;
  const alpha = payload?.alpha ?? 0;
  const attitude = payload?.attitude ?? "risk-neutral";
  const ex = payload?.expectedValue ?? 0;
  const ce = payload?.certaintyEquivalent ?? ex;
  const rp = payload?.riskPremium ?? 0;

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("alpha", formatNumber(alpha, 3));
    m.setValue("ce", formatNumber(ce, 0));
    m.setValue("rp", formatNumber(rp, 0));
    const color = COLOR_CURVE[attitude] ?? COLOR_CURVE["risk-neutral"];
    m.setHighlight("alpha", true, color);
    m.setHighlight("ce", true, color);
    m.setHighlight("rp", true, color);
  }, [alpha, ce, rp, attitude]);

  // 効用曲線(x1<x2の間だけ描く。CARAは常に単調増加なので端点がy方向の最小/最大)。
  const [xBad, xGood] =
    FOCUS_LOTTERY_OUTCOMES[1] < FOCUS_LOTTERY_OUTCOMES[0]
      ? [FOCUS_LOTTERY_OUTCOMES[1], FOCUS_LOTTERY_OUTCOMES[0]]
      : [FOCUS_LOTTERY_OUTCOMES[0], FOCUS_LOTTERY_OUTCOMES[1]];

  const curve = useMemo(() => {
    const points: { x: number; y: number }[] = [];
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const x = xBad + ((xGood - xBad) * i) / steps;
      points.push({ x, y: utilityCara(x, alpha) });
    }
    return points;
  }, [alpha, xBad, xGood]);

  const yBad = utilityCara(xBad, alpha);
  const yGood = utilityCara(xGood, alpha);
  const yMin = Math.min(yBad, yGood);
  const yMax = Math.max(yBad, yGood);
  const ySpan = Math.max(1e-9, yMax - yMin);

  const sx = (x: number) => round2(PAD.left + ((x - xBad) / (xGood - xBad)) * CW);
  const sy = (y: number) => round2(PAD.top + CH - ((y - yMin) / ySpan) * CH);

  const curvePoints = curve.map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ");
  // 弦(2点(xBad,u(xBad))-(xGood,u(xGood))を結ぶ直線)上で x=E[X] のときの高さ = E[u(X)] そのもの。
  const chordYAtEx = yBad + ((yGood - yBad) * (ex - xBad)) / (xGood - xBad);
  const euHeight = chordYAtEx;
  const curveYAtCe = utilityCara(ce, alpha);

  return (
    <div
      id="risk-attitude-stepper"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <p className="text-sm text-slate-600">
        同じくじ(2台稼働: 好況{num(FOCUS_LOTTERY_OUTCOMES[0])}万円/不況
        {num(FOCUS_LOTTERY_OUTCOMES[1])}万円)に対して、
        <strong className="font-semibold text-slate-900">リスク回避的→中立→受容的</strong>
        と効用関数の形を切り替え、確実同値額(CE)が期待値のどちら側にズレるかを見よう。
      </p>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {(["risk-averse", "risk-neutral", "risk-loving"] as const).map((a) => (
          <span
            key={a}
            data-testid={`risk-attitude-badge-${a}`}
            className={`rounded-full px-3 py-1 font-medium ${
              attitude === a ? "text-white" : "bg-slate-100 text-slate-500"
            }`}
            style={attitude === a ? { backgroundColor: COLOR_CURVE[a] } : undefined}
          >
            {riskAttitudeLabel(a)}
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mx-auto h-auto w-full max-w-md"
        role="img"
        aria-label="効用曲線とCE・リスクプレミアムの図"
        data-testid="risk-attitude-svg"
      >
        <line
          x1={PAD.left}
          y1={PAD.top + CH}
          x2={W - PAD.right}
          y2={PAD.top + CH}
          stroke="#cbd5e1"
        />

        {/* 弦(2点を結ぶ直線) */}
        <line
          x1={sx(xBad)}
          y1={sy(yBad)}
          x2={sx(xGood)}
          y2={sy(yGood)}
          stroke="#cbd5e1"
          strokeDasharray="3 3"
          data-testid="risk-attitude-chord"
        />

        {/* 効用曲線 */}
        <polyline
          points={curvePoints}
          fill="none"
          stroke={COLOR_CURVE[attitude] ?? COLOR_CURVE["risk-neutral"]}
          strokeWidth={2.5}
          data-testid="risk-attitude-curve"
        />

        {/* E[X]→弦の高さ(E[u(X)])への縦破線、CE→曲線への縦破線 */}
        <line
          x1={sx(ex)}
          y1={sy(euHeight)}
          x2={sx(ex)}
          y2={PAD.top + CH}
          stroke="#94a3b8"
          strokeDasharray="2 2"
        />
        <line
          x1={sx(ce)}
          y1={sy(curveYAtCe)}
          x2={sx(ce)}
          y2={PAD.top + CH}
          stroke="#94a3b8"
          strokeDasharray="2 2"
        />
        {/* E[u(X)]の高さを結ぶ横破線(弦上の点とCEでの曲線上の点は同じ高さになる) */}
        <line
          x1={sx(ex)}
          y1={sy(euHeight)}
          x2={sx(ce)}
          y2={sy(curveYAtCe)}
          stroke="#94a3b8"
          strokeDasharray="2 2"
        />

        <circle
          cx={sx(ex)}
          cy={sy(euHeight)}
          r={4}
          fill="#f59e0b"
          data-testid="risk-attitude-ex-marker"
        />
        <circle
          cx={sx(ce)}
          cy={sy(curveYAtCe)}
          r={4}
          fill={COLOR_CURVE[attitude] ?? COLOR_CURVE["risk-neutral"]}
          data-testid="risk-attitude-ce-marker"
        />

        <text
          x={sx(ex)}
          y={PAD.top + CH + 14}
          textAnchor="middle"
          className="fill-amber-600 text-[9px] font-bold"
        >
          E[X]={num(ex)}
        </text>
        <text
          x={sx(ce)}
          y={PAD.top + CH + 26}
          textAnchor="middle"
          className="text-[9px] font-bold"
          fill={COLOR_CURVE[attitude] ?? COLOR_CURVE["risk-neutral"]}
        >
          CE={num(ce)}
        </text>
      </svg>

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
        好況になる確率pは下のラボと共有している。現在 p(好況)={num(probGood * 100, 0)}%。
      </p>
    </div>
  );
}
