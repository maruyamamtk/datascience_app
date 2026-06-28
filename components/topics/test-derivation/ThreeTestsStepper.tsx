"use client";

import { useEffect, useMemo } from "react";
import { formatNumber } from "@/components/math/tex";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { normalLogLikMu } from "@/lib/stats/test-derivation";
import { useTestDerivStore } from "@/lib/store/test-derivation";
import { buildThreeTestFrames } from "./frames";

const OBS = { xbar: 0.6, mu0: 0, sigma: 1, n: 20 };
const W = 360;
const H = 160;
const PAD = { top: 14, right: 14, bottom: 26, left: 14 };
const MU_MIN = -0.4;
const MU_MAX = 1.1;

/**
 * 3 検定（ワルド/スコア/尤度比）の «対数尤度曲線上での測り方» を 1 つずつ見せるステッパー（描画層）。
 * Wald=MLEからμ0までの水平距離、Score=μ0での傾き、LRT=対数尤度の高さの差。正規では3つとも z²。
 * フレーム位置は useTestDerivStore の frame。
 */
export function ThreeTestsStepper() {
  const index = useTestDerivStore((s) => s.frame.index);
  const count = useTestDerivStore((s) => s.frame.count);
  const playing = useTestDerivStore((s) => s.frame.playing);
  const nextFrame = useTestDerivStore((s) => s.nextFrame);
  const prevFrame = useTestDerivStore((s) => s.prevFrame);
  const goToFrame = useTestDerivStore((s) => s.goToFrame);
  const setPlaying = useTestDerivStore((s) => s.setPlaying);
  const setFrameCount = useTestDerivStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildThreeTestFrames(OBS), []);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({
    playing,
    index,
    count,
    onAdvance: nextFrame,
    onStop: () => setPlaying(false),
    intervalMs: 1400,
  });

  const frame = frameAt(frames, index);
  const kind = frame?.payload?.kind ?? "wald";

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const llAtMu0 = normalLogLikMu(OBS.mu0, OBS.xbar, OBS.sigma, OBS.n);
  const yLo = llAtMu0 * 1.15; // 最小（μ0 側）
  const toX = (mu: number) => PAD.left + ((mu - MU_MIN) / (MU_MAX - MU_MIN)) * plotW;
  const toY = (ll: number) => PAD.top + (1 - (ll - yLo) / (0 - yLo)) * plotH;

  const path = Array.from({ length: 121 }, (_, i) => {
    const mu = MU_MIN + (i / 120) * (MU_MAX - MU_MIN);
    const ll = normalLogLikMu(mu, OBS.xbar, OBS.sigma, OBS.n);
    return `${i === 0 ? "M" : "L"}${toX(mu).toFixed(1)},${toY(ll).toFixed(1)}`;
  }).join(" ");

  const xMle = toX(OBS.xbar);
  const xMu0 = toX(OBS.mu0);
  // スコア（μ0 での傾き）= n/σ²·(x̄−μ0) を描画用にスケール。
  const slope = (OBS.n / OBS.sigma ** 2) * (OBS.xbar - OBS.mu0);

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        対数尤度曲線で 3 検定の «測り方» を見る（観測 x̄={OBS.xbar}, H0: μ=0）
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="3検定の幾何"
        data-testid="three-tests"
      >
        <line x1={PAD.left} y1={toY(0)} x2={W - PAD.right} y2={toY(0)} stroke="#e2e8f0" />
        <path id={`test-${kind}`} d={path} fill="none" stroke="#2563eb" strokeWidth={2.5} />
        {/* MLE と μ0 の縦線 */}
        <line
          x1={xMle}
          y1={toY(0)}
          x2={xMle}
          y2={toY(yLo)}
          stroke="#94a3b8"
          strokeWidth={1}
          strokeDasharray="2 2"
        />
        <line
          x1={xMu0}
          y1={toY(0)}
          x2={xMu0}
          y2={toY(yLo)}
          stroke="#94a3b8"
          strokeWidth={1}
          strokeDasharray="2 2"
        />
        <text x={xMle} y={H - 8} textAnchor="middle" className="fill-slate-500 text-[9px]">
          x̄(MLE)
        </text>
        <text x={xMu0} y={H - 8} textAnchor="middle" className="fill-slate-500 text-[9px]">
          μ0
        </text>

        {/* Wald: MLE から μ0 までの水平距離 */}
        {kind === "wald" && (
          <>
            <line
              x1={xMu0}
              y1={toY(0) - 4}
              x2={xMle}
              y2={toY(0) - 4}
              stroke="#dc2626"
              strokeWidth={3}
            />
            <text
              x={(xMu0 + xMle) / 2}
              y={toY(0) - 8}
              textAnchor="middle"
              className="fill-red-600 text-[10px] font-semibold"
            >
              x̄−μ0 の距離
            </text>
          </>
        )}
        {/* Score: μ0 での接線（傾き） */}
        {kind === "score" && (
          <line
            x1={toX(OBS.mu0 - 0.18)}
            y1={toY(normalLogLikMu(OBS.mu0, OBS.xbar, OBS.sigma, OBS.n) - slope * 0.18)}
            x2={toX(OBS.mu0 + 0.18)}
            y2={toY(normalLogLikMu(OBS.mu0, OBS.xbar, OBS.sigma, OBS.n) + slope * 0.18)}
            stroke="#dc2626"
            strokeWidth={2.5}
          />
        )}
        {/* LRT: MLE と μ0 の対数尤度の高さの差 */}
        {kind === "lrt" && (
          <line
            x1={xMu0}
            y1={toY(0)}
            x2={xMu0}
            y2={toY(llAtMu0)}
            stroke="#dc2626"
            strokeWidth={3}
          />
        )}
        <circle cx={xMle} cy={toY(0)} r={3} fill="#16a34a" />
        <circle cx={xMu0} cy={toY(llAtMu0)} r={3} fill="#dc2626" />
      </svg>

      <p className="text-center font-mono text-sm text-slate-700">
        {frame?.payload?.label}：統計量 = {formatNumber(frame?.payload?.value ?? 0)}（z²=
        {formatNumber((frame?.payload?.z ?? 0) ** 2)}）
      </p>

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

      <p className="text-xs leading-relaxed text-slate-500">
        ▶ ワルド（水平距離）→ スコア（μ0の傾き）→ 尤度比（高さの差）。同じ «H0からの隔たり»
        を3つの角度で測ります。正規では一致。
      </p>
    </div>
  );
}
