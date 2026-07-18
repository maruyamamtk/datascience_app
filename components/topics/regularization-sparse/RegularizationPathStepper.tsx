"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { STEP_LOG_LAMBDA_MAX, STEP_LOG_LAMBDA_MIN, useRegularizationSparseStore } from "@/lib/store/regularization-sparse";
import { buildRegularizationPathFrames, STEP_P, STEP_TRUE_BETA } from "./frames";

const round2 = (v: number) => Math.round(v * 100) / 100;
const W = 340;
const H = 220;
const PADL = 28;
const PADR = 10;
const PADT = 14;
const PADB = 26;
const Y_ABS = 5.5;

const lx = (logLambda: number) =>
  round2(PADL + ((logLambda - STEP_LOG_LAMBDA_MIN) / (STEP_LOG_LAMBDA_MAX - STEP_LOG_LAMBDA_MIN)) * (W - PADL - PADR));
const ly = (v: number) => {
  const c = Math.max(-Y_ABS, Math.min(Y_ABS, v));
  return round2(PADT + ((Y_ABS - c) / (2 * Y_ABS)) * (H - PADT - PADB));
};

/**
 * 「正則化パス」ステッパー（描画層）。λ を小さい方から大きい方へ動かしながら Lasso を解き直し、
 * 9本の係数パス（x¹…x⁹）を1ステップずつ描き足す。«ちょうど0になった»係数は赤丸で強調される。
 * フレーム位置は共有ストア。
 */
export function RegularizationPathStepper() {
  const index = useRegularizationSparseStore((s) => s.frame.index);
  const count = useRegularizationSparseStore((s) => s.frame.count);
  const playing = useRegularizationSparseStore((s) => s.frame.playing);
  const nextFrame = useRegularizationSparseStore((s) => s.nextFrame);
  const prevFrame = useRegularizationSparseStore((s) => s.prevFrame);
  const goToFrame = useRegularizationSparseStore((s) => s.goToFrame);
  const setPlaying = useRegularizationSparseStore((s) => s.setPlaying);
  const setFrameCount = useRegularizationSparseStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildRegularizationPathFrames(), []);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 900 });

  const frame = frameAt(frames, index);
  const p = frame?.payload;

  const pathPoints = (j: number, revealed: number) =>
    p!.lambdas
      .slice(0, revealed)
      .map((lam, s) => `${lx(Math.log10(lam))},${ly(p!.betas[s][j])}`)
      .join(" ");

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        正則化パス：候補変数8個（うち本当に効くのは変数1・3・6の3個だけ）で λ を増やしながら Lasso を解き直す
      </p>

      {p ? (
        <>
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-lg" role="img" aria-label="正則化パス（λに対する係数の推移）">
              <line x1={PADL} y1={ly(0)} x2={W - PADR} y2={ly(0)} className="stroke-slate-200" />
              {[STEP_LOG_LAMBDA_MIN, (STEP_LOG_LAMBDA_MIN + STEP_LOG_LAMBDA_MAX) / 2, STEP_LOG_LAMBDA_MAX].map((v) => (
                <text key={`xt${v}`} x={lx(v)} y={H - 8} textAnchor="middle" className="fill-slate-400 text-[8px]">
                  log₁₀λ={v.toFixed(1)}
                </text>
              ))}
              {Array.from({ length: STEP_P }, (_, j) => {
                const curVal = p.betas[p.revealed - 1][j];
                const isZeroNow = Math.abs(curVal) <= 1e-6;
                const changed = p.zeroedNow.includes(j + 1) || p.revivedNow.includes(j + 1);
                const isTrueSignal = STEP_TRUE_BETA[j] !== 0;
                return (
                  <polyline
                    key={`path${j}`}
                    points={pathPoints(j, p.revealed)}
                    fill="none"
                    stroke={isZeroNow ? "#cbd5e1" : isTrueSignal ? "#059669" : "#2563eb"}
                    strokeWidth={changed ? 2.6 : isTrueSignal ? 1.6 : 1}
                    opacity={changed ? 1 : 0.6}
                  />
                );
              })}
              {/* 現在の λ の縦線 */}
              <line
                x1={lx(Math.log10(p.lambdas[p.revealed - 1]))}
                y1={PADT}
                x2={lx(Math.log10(p.lambdas[p.revealed - 1]))}
                y2={H - PADB}
                className="stroke-amber-400"
                strokeDasharray="3 3"
              />
              {/* ちょうど0になった係数を赤丸で強調 */}
              {p.zeroedNow.map((deg) => (
                <circle
                  key={`z${deg}`}
                  cx={lx(Math.log10(p.lambdas[p.revealed - 1]))}
                  cy={ly(0)}
                  r={4}
                  className="fill-none stroke-red-500"
                  strokeWidth={2}
                />
              ))}
            </svg>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <Stat value={`${p.nonzeroCount}/${STEP_P}`} label="非ゼロ係数" tone="amber" />
            <Stat value={p.lambdas[p.revealed - 1].toFixed(4)} label="現在の λ" tone="blue" />
          </div>
        </>
      ) : null}

      {frame?.callout ? <Callout {...frame.callout} /> : null}

      <StepPlayer count={count} index={index} playing={playing} onPrev={prevFrame} onNext={nextFrame} onSeek={goToFrame} onTogglePlay={() => setPlaying(!playing)} />

      <p className="text-xs leading-relaxed text-slate-500">
        ▶ 再生で λ が対数的に増えていきます。緑=真に効く3変数、青=それ以外の生きている係数、灰色=«ちょうど0» になった係数。
        線が0の高さに落ちて灰色に変わる瞬間が<span className="font-semibold">変数選択</span>——Lasso（L1）だけが持つ性質。
        真に無関係な変数（真の係数0）が先に脱落し、緑の3本が最後まで残ることを確かめよう。
      </p>
    </div>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone: "amber" | "blue" }) {
  const bg = { amber: "bg-amber-50 text-amber-700", blue: "bg-blue-50 text-blue-700" }[tone];
  return (
    <div className={`rounded-lg px-2 py-2 ${bg}`}>
      <div className="font-mono text-sm">{value}</div>
      <div className="text-slate-500">{label}</div>
    </div>
  );
}
