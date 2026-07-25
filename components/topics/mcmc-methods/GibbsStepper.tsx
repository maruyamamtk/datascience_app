"use client";

import { useEffect, useMemo, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout, frameAt, StepPlayer, useFramePlayer } from "@/components/viz";
import { gibbsConditionalSd } from "@/lib/stats/mcmc-methods";
import { useGibbsStepperStore, useMcmcMethodsStore } from "@/lib/store/mcmc-methods";
import { buildGibbsFrames } from "./gibbs-frames";
import { num, round2 } from "./format";

const COLOR_TRAIL = "#cbd5e1";
const COLOR_X_UPDATE = "#7c3aed"; // purple(横移動)
const COLOR_Y_UPDATE = "#0d9488"; // teal(縦移動)
const COLOR_CURRENT = "#0f172a";

const W = 300;
const H = 300;
const RANGE = 3.4; // 表示するx,yの範囲 [-RANGE, RANGE]
const PAD = 20;
const PLOT = W - 2 * PAD;

function px(v: number): number {
  return round2(PAD + ((v + RANGE) / (2 * RANGE)) * PLOT);
}
function py(v: number): number {
  return round2(PAD + ((RANGE - v) / (2 * RANGE)) * PLOT);
}

const START = { x: 0, y: 0 };

function texForUpdated(updated: "x" | "y" | null): string {
  if (updated === "x") {
    return `X\\mid Y=${term("condVal", "?")}\\ \\sim\\ \\mathcal N\\!\\big(\\rho\\,Y,\\ 1-\\rho^2\\big)=\\mathcal N(${term(
      "condMean",
      "?",
    )},\\ ${term("condVar", "?")})\\quad\\Rightarrow\\quad x=${term("drawn", "?")}`;
  }
  if (updated === "y") {
    return `Y\\mid X=${term("condVal", "?")}\\ \\sim\\ \\mathcal N\\!\\big(\\rho\\,X,\\ 1-\\rho^2\\big)=\\mathcal N(${term(
      "condMean",
      "?",
    )},\\ ${term("condVar", "?")})\\quad\\Rightarrow\\quad y=${term("drawn", "?")}`;
  }
  return `(X,Y)\\ \\sim\\ \\mathcal N_2\\!\\left(\\mathbf 0,\\ \\begin{pmatrix}1&${term(
    "rho0",
    "?",
  )}\\\\${term("rho1", "?")}&1\\end{pmatrix}\\right)`;
}

/**
 * ギブスサンプリングステッパー(Level1の中核可視化, 描画層/Control層)。
 * 2変量正規分布(相関ρ)を目標に、yを固定してxを更新(横移動, 紫)→xを固定してyを更新(縦移動, 緑)
 * を繰り返す様子をコマ送りで見せる。Metropolis-Hastingsと異なり、条件付き分布から直接
 * サンプリングするため常に受理される(棄却が存在しない)ことを対比として示す。
 */
export function GibbsStepper() {
  const gibbsRho = useMcmcMethodsStore((s) => s.controls.gibbsRho);
  const setControl = useMcmcMethodsStore((s) => s.setControl);
  const gibbsSteps = useMcmcMethodsStore((s) => s.derived.gibbsSteps);

  const index = useGibbsStepperStore((s) => s.frame.index);
  const count = useGibbsStepperStore((s) => s.frame.count);
  const playing = useGibbsStepperStore((s) => s.frame.playing);
  const nextFrame = useGibbsStepperStore((s) => s.nextFrame);
  const prevFrame = useGibbsStepperStore((s) => s.prevFrame);
  const goToFrame = useGibbsStepperStore((s) => s.goToFrame);
  const setPlaying = useGibbsStepperStore((s) => s.setPlaying);
  const setFrameCount = useGibbsStepperStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildGibbsFrames(START, gibbsSteps, gibbsRho), [gibbsSteps, gibbsRho]);

  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({
    playing,
    index,
    count,
    onAdvance: nextFrame,
    onStop: () => setPlaying(false),
    intervalMs: 700,
  });

  const frame = frameAt(frames, index);
  const payload = frame?.payload;
  const step = payload?.step ?? null;
  const trail = payload?.trail ?? [START];
  const current = trail[trail.length - 1];
  const before = step?.before ?? START;
  const updateColor = step?.updated === "x" ? COLOR_X_UPDATE : step?.updated === "y" ? COLOR_Y_UPDATE : COLOR_CURRENT;

  const tex = useMemo(() => texForUpdated(step?.updated ?? null), [step?.updated]);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    const condSd = gibbsConditionalSd(gibbsRho);
    if (!step) {
      m.setValue("rho0", formatNumber(gibbsRho, 2));
      m.setValue("rho1", formatNumber(gibbsRho, 2));
      return;
    }
    const condVal = step.updated === "x" ? step.before.y : step.before.x;
    const drawn = step.updated === "x" ? step.after.x : step.after.y;
    m.setValue("condVal", formatNumber(condVal, 3));
    m.setValue("condMean", formatNumber(gibbsRho * condVal, 3));
    m.setValue("condVar", formatNumber(condSd * condSd, 3));
    m.setValue("drawn", formatNumber(drawn, 3));
    m.setHighlight("drawn", true, updateColor);
  }, [step, gibbsRho, updateColor]);

  return (
    <div id="gibbs-stepper" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        目標は相関 ρ のある2変量正規分布。もう一方の値を固定した条件付き分布は正規分布として解析的に求まるため、
        Metropolis-Hastingsのような受理確率の計算をせず毎回そのままサンプリングできる。
      </p>

      <label className="flex flex-col gap-1 text-sm text-slate-700">
        相関係数 ρ = {num(gibbsRho, 2)}
        <input
          type="range"
          min={-0.95}
          max={0.95}
          step={0.05}
          value={gibbsRho}
          onChange={(e) => setControl("gibbsRho", Number(e.target.value))}
          aria-label="目標分布の相関係数"
          data-testid="gibbs-rho-slider"
          className="accent-teal-600"
        />
      </label>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mx-auto h-auto w-full max-w-xs"
        role="img"
        aria-label="ギブスサンプリングの軌跡"
        data-testid="gibbs-svg"
      >
        <line x1={PAD} y1={py(0)} x2={W - PAD} y2={py(0)} stroke="#e2e8f0" />
        <line x1={px(0)} y1={PAD} x2={px(0)} y2={H - PAD} stroke="#e2e8f0" />
        <rect x={PAD} y={PAD} width={PLOT} height={PLOT} fill="none" stroke="#cbd5e1" />

        {trail.slice(0, -1).map((p, i) => (
          <circle key={i} cx={px(p.x)} cy={py(p.y)} r={2.5} fill={COLOR_TRAIL} data-testid={`gibbs-trail-${i}`} />
        ))}

        {step ? (
          <line
            x1={px(before.x)}
            y1={py(before.y)}
            x2={px(current.x)}
            y2={py(current.y)}
            stroke={updateColor}
            strokeWidth={2}
            data-testid="gibbs-move-line"
          />
        ) : null}

        <circle
          cx={px(current.x)}
          cy={py(current.y)}
          r={7}
          fill={updateColor}
          stroke="white"
          strokeWidth={1.5}
          data-testid="gibbs-current-marker"
        />

        <text x={W / 2} y={H - 4} textAnchor="middle" className="fill-slate-400 text-[9px]">
          x
        </text>
        <text x={10} y={H / 2} textAnchor="middle" className="fill-slate-400 text-[9px]">
          y
        </text>
      </svg>

      <div className="flex flex-wrap justify-center gap-4 text-[11px]">
        <span className="flex items-center gap-1"><span className="h-2 w-4 rounded-full" style={{ background: COLOR_TRAIL }} />軌跡</span>
        <span className="flex items-center gap-1"><span className="h-2 w-4 rounded-full" style={{ background: COLOR_X_UPDATE }} />x更新(横移動)</span>
        <span className="flex items-center gap-1"><span className="h-2 w-4 rounded-full" style={{ background: COLOR_Y_UPDATE }} />y更新(縦移動)</span>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={tex} display={true} />
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
        labels={["開始", ...gibbsSteps.map((s) => `スイープ${s.sweep} ${s.updated === "x" ? "x更新" : "y更新"}`)]}
      />
    </div>
  );
}
