"use client";

import { useEffect, useMemo, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout, frameAt, StepPlayer, useFramePlayer } from "@/components/viz";
import { betaPdfCurve } from "@/lib/stats/bayesian-basics";
import { betaPdf } from "@/lib/stats/continuous";
import { histogram } from "@/lib/stats/histogram";
import { useMcmcMethodsStore, useMhStepperStore, TARGET_BETA } from "@/lib/store/mcmc-methods";
import { buildMhFrames } from "./mh-frames";
import { num, round2 } from "./format";

const FORMULA = `r=\\min\\!\\left(1,\\ \\dfrac{\\pi(\\theta')}{\\pi(\\theta)}\\right)=\\min\\!\\left(1,\\ \\dfrac{${term(
  "pProp",
  "?",
)}}{${term("pCur", "?")}}\\right)=${term("ratio", "?")}\\qquad u=${term("u", "?")}`;

const COLOR_CURVE = "#94a3b8";
const COLOR_CURRENT = "#2563eb"; // blue
const COLOR_ACCEPT = "#16a34a"; // green
const COLOR_REJECT = "#dc2626"; // red
const COLOR_HIST = "#93c5fd";

const W = 340;
const H = 210;
const PAD = { top: 10, right: 14, bottom: 34, left: 30 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

const HIST_BINS = 12;

// フレーム未確定時のフォールバック(参照を固定してuseMemoの依存を安定させる)。
const FALLBACK_VISITED: readonly number[] = [0.5];

function sx(x: number): number {
  return round2(PAD.left + x * CW);
}

function pathFor(curve: { x: number; y: number }[], maxY: number): string {
  return curve
    .map(({ x, y }) => `${sx(x)},${round2(PAD.top + CH - (Math.min(y, maxY) / maxY) * CH)}`)
    .join(" ");
}

/** 数式に表示するπ(θ)の値。ストアが実際に使うのと同じ正規化済み密度を厳密に計算する。 */
function targetY(theta: number): number {
  return betaPdf(theta, TARGET_BETA.alpha, TARGET_BETA.beta);
}

/**
 * Metropolis-Hastingsステッパー(Level0の中核可視化, 描画層/Control層)。
 * 目標分布(灰色曲線, Beta(6,6)の密度)の上を、現在地(青)→提案(黄, 破線矢印)→
 * 受理(緑)/棄却(赤)というランダムウォークがコマ送りで進む様子を見せる。
 * これまでに訪れた状態のヒストグラム(水色バー)も同時に育ち、目標分布へ近づいていく様子を示す。
 */
export function MHStepper() {
  const proposalSd = useMcmcMethodsStore((s) => s.controls.proposalSd);
  const setControl = useMcmcMethodsStore((s) => s.setControl);
  const mhShortChain = useMcmcMethodsStore((s) => s.derived.mhShortChain);

  const index = useMhStepperStore((s) => s.frame.index);
  const count = useMhStepperStore((s) => s.frame.count);
  const playing = useMhStepperStore((s) => s.frame.playing);
  const nextFrame = useMhStepperStore((s) => s.nextFrame);
  const prevFrame = useMhStepperStore((s) => s.prevFrame);
  const goToFrame = useMhStepperStore((s) => s.goToFrame);
  const setPlaying = useMhStepperStore((s) => s.setPlaying);
  const setFrameCount = useMhStepperStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildMhFrames(0.5, mhShortChain), [mhShortChain]);

  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({
    playing,
    index,
    count,
    onAdvance: nextFrame,
    onStop: () => setPlaying(false),
    intervalMs: 1100,
  });

  const frame = frameAt(frames, index);
  const payload = frame?.payload;
  const step = payload?.step ?? null;
  const visited = payload?.visited ?? FALLBACK_VISITED;

  const curve = useMemo(() => betaPdfCurve(TARGET_BETA), []);
  // 訪れた状態が1点だけ(初期フレーム)では「分布」として見せる意味がないため、
  // 実際に1ステップ以上進んだ後だけヒストグラムを描く。
  const showHist = visited.length > 1;
  const bins = useMemo(
    () => histogram(visited, { min: 0, max: 1, bins: HIST_BINS }),
    [visited],
  );
  const binWidth = 1 / HIST_BINS;
  const histDensity = showHist ? bins.map((b) => b.count / (visited.length * binWidth)) : bins.map(() => 0);
  const maxY = Math.max(2, ...curve.map((p) => p.y), ...histDensity);

  const current = step ? step.current : 0.5;
  const proposed = step?.proposed;
  const resultColor = step ? (step.accepted ? COLOR_ACCEPT : COLOR_REJECT) : COLOR_CURRENT;

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    if (!step) {
      m.setValue("pProp", "\\text{—}");
      m.setValue("pCur", "\\text{—}");
      m.setValue("ratio", "\\text{—}");
      m.setValue("u", "\\text{—}");
      return;
    }
    m.setValue("pCur", formatNumber(targetY(step.current), 3));
    m.setValue("pProp", formatNumber(targetY(step.proposed), 3));
    m.setValue("ratio", formatNumber(step.acceptRatio, 3));
    m.setValue("u", formatNumber(step.u, 3));
    m.setHighlight("ratio", true, resultColor);
    m.setHighlight("u", true, resultColor);
  }, [step, resultColor]);

  return (
    <div id="mh-stepper" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        灰色の曲線は目標分布 Beta(6,6) の密度（K-1で解析的に求めた事後分布と同じもの）。
        提案分布の幅 σ を動かすと、1回の提案でどれだけ遠くへ跳ぶかが変わる。
      </p>

      <label className="flex flex-col gap-1 text-sm text-slate-700">
        提案分布の標準偏差 σ = {num(proposalSd, 2)}
        <input
          type="range"
          min={0.02}
          max={2}
          step={0.02}
          value={proposalSd}
          onChange={(e) => setControl("proposalSd", Number(e.target.value))}
          aria-label="提案分布の標準偏差"
          data-testid="mh-proposal-sd-slider"
          className="accent-blue-600"
        />
      </label>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mx-auto h-auto w-full max-w-md"
        role="img"
        aria-label="Metropolis-Hastingsのランダムウォーク"
        data-testid="mh-svg"
      >
        <line x1={PAD.left} y1={PAD.top + CH} x2={W - PAD.right} y2={PAD.top + CH} stroke="#cbd5e1" />
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + CH} stroke="#cbd5e1" />

        {bins.map((b, i) => {
          const barH = (Math.min(histDensity[i], maxY) / maxY) * CH;
          return (
            <rect
              key={i}
              x={sx(b.x0) + 1}
              y={round2(PAD.top + CH - barH)}
              width={round2(CW / HIST_BINS - 2)}
              height={round2(barH)}
              fill={COLOR_HIST}
              opacity={0.6}
              data-testid={`mh-hist-bin-${i}`}
            />
          );
        })}

        <polyline points={pathFor(curve, maxY)} fill="none" stroke={COLOR_CURVE} strokeWidth={2} data-testid="mh-target-curve" />

        {proposed !== undefined ? (
          <line
            x1={sx(current)}
            y1={PAD.top + CH}
            x2={sx(proposed)}
            y2={PAD.top + CH}
            stroke={step?.accepted ? COLOR_ACCEPT : COLOR_REJECT}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            markerEnd="url(#mh-arrow)"
            data-testid="mh-proposal-arrow"
          />
        ) : null}

        <defs>
          <marker id="mh-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={resultColor} />
          </marker>
        </defs>

        <circle
          cx={sx(current)}
          cy={PAD.top + CH}
          r={6}
          fill={COLOR_CURRENT}
          stroke="white"
          strokeWidth={1.5}
          data-testid="mh-current-marker"
        />
        {proposed !== undefined ? (
          <circle
            cx={sx(proposed)}
            cy={PAD.top + CH}
            r={6}
            fill={resultColor}
            stroke="white"
            strokeWidth={1.5}
            data-testid="mh-proposed-marker"
          />
        ) : null}

        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <text key={t} x={sx(t)} y={PAD.top + CH + 14} textAnchor="middle" className="fill-slate-500 text-[9px]">
            {t}
          </text>
        ))}
        <text x={W / 2} y={H - 4} textAnchor="middle" className="fill-slate-400 text-[9px]">
          θ（目標分布 Beta(6,6) の核となる確率）
        </text>
      </svg>

      <div className="flex flex-wrap justify-center gap-4 text-[11px]">
        <span className="flex items-center gap-1"><span className="h-2 w-4 rounded-full" style={{ background: COLOR_CURVE }} />目標分布</span>
        <span className="flex items-center gap-1"><span className="h-2 w-4 rounded-full" style={{ background: COLOR_CURRENT }} />現在地</span>
        <span className="flex items-center gap-1"><span className="h-2 w-4 rounded-full" style={{ background: COLOR_ACCEPT }} />受理</span>
        <span className="flex items-center gap-1"><span className="h-2 w-4 rounded-full" style={{ background: COLOR_REJECT }} />棄却</span>
        <span className="flex items-center gap-1"><span className="h-2 w-4 rounded-full" style={{ background: COLOR_HIST }} />訪れた状態の分布</span>
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
        labels={["開始", ...mhShortChain.map((s) => `${s.index}ステップ目`)]}
      />
    </div>
  );
}
