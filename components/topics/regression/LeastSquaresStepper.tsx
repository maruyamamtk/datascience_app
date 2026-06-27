"use client";

import { useEffect, useMemo } from "react";
import { formatNumber } from "@/components/math/tex";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { useRegressionStore } from "@/lib/store/regression";
import { buildRssFrames } from "./frames";

// データ座標の固定軸（RegressionLab と揃える）。
const X_MIN = 0;
const X_MAX = 10;
const Y_MIN = 0;
const Y_MAX = 14;

// 散布図とRSS放物線の2枚を縦に並べる。
const W = 380;
const SC_H = 170; // 散布図
const PA_H = 150; // RSS放物線
const SPAD = { top: 12, right: 14, bottom: 24, left: 30 };

const COLOR_LINE = "#2563eb";
const COLOR_RESIDUAL = "#f59e0b";
const COLOR_RSS = "#7c3aed";
const COLOR_MIN = "#16a34a";

/**
 * 最小二乗コマ送り（描画層）。データ点（ラボと共有）を固定し、直線の傾きを 1 段ずつ回すと
 * 残差平方和 RSS が放物線を描いて最小（=最小二乗解）へ向かう様子を、上＝散布図（回る直線＋残差）、
 * 下＝RSS 放物線の点を 1 つずつ開示するコマ送りで見せる（StepPlayer・色ハイライト・近傍コールアウト）。
 * フレーム位置は useRegressionStore の frame が single source of truth（ラボと同じストアを共有）。
 */
export function LeastSquaresStepper() {
  const points = useRegressionStore((s) => s.controls.points);
  const olsSlope = useRegressionStore((s) => s.derived.olsSlope);
  const index = useRegressionStore((s) => s.frame.index);
  const count = useRegressionStore((s) => s.frame.count);
  const playing = useRegressionStore((s) => s.frame.playing);
  const nextFrame = useRegressionStore((s) => s.nextFrame);
  const prevFrame = useRegressionStore((s) => s.prevFrame);
  const goToFrame = useRegressionStore((s) => s.goToFrame);
  const setPlaying = useRegressionStore((s) => s.setPlaying);
  const setFrameCount = useRegressionStore((s) => s.setFrameCount);

  // OLS 傾きを中心に ±1.2 を 13 段（k=0 で OLS 傾きちょうど＝放物線の底）。
  const slopes = useMemo(() => {
    const base = Number.isFinite(olsSlope) ? olsSlope : 1;
    return Array.from({ length: 13 }, (_, k) => Number((base + (k - 6) * 0.2).toFixed(4)));
  }, [olsSlope]);

  const frames = useMemo(() => buildRssFrames(slopes, points), [slopes, points]);

  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({
    playing,
    index,
    count,
    onAdvance: nextFrame,
    onStop: () => setPlaying(false),
    intervalMs: 550,
  });

  const frame = frameAt(frames, index);
  const cur = frame?.payload;
  const revealed = cur?.revealed ?? [];

  // 散布図の座標変換。
  const scW = W - SPAD.left - SPAD.right;
  const scH = SC_H - SPAD.top - SPAD.bottom;
  const toScX = (x: number) => SPAD.left + ((x - X_MIN) / (X_MAX - X_MIN)) * scW;
  const toScY = (y: number) => SPAD.top + (1 - (y - Y_MIN) / (Y_MAX - Y_MIN)) * scH;
  const lineY = (x: number) => (cur ? cur.slope * x + cur.intercept : 0);

  // RSS 放物線の座標変換（全フレームの最大 RSS で y 軸を固定）。
  const maxRss = useMemo(
    () => frames.reduce((m, f) => Math.max(m, f.payload?.rss ?? 0), 1),
    [frames],
  );
  const sMin = slopes[0];
  const sMax = slopes[slopes.length - 1];
  const paW = W - SPAD.left - SPAD.right;
  const paH = PA_H - SPAD.top - SPAD.bottom;
  const toPaX = (s: number) => SPAD.left + ((s - sMin) / (sMax - sMin || 1)) * paW;
  const toPaY = (r: number) => SPAD.top + (1 - r / maxRss) * paH;

  const rssLine = revealed
    .map((pt, i) => `${i === 0 ? "M" : "L"}${toPaX(pt.slope).toFixed(2)} ${toPaY(pt.rss).toFixed(2)}`)
    .join(" ");

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        直線を回すと残差平方和 RSS が放物線を描いて最小（最小二乗解）へ向かう
      </p>

      {/* 上: 散布図 + 回る直線 + 残差 */}
      <svg
        viewBox={`0 0 ${W} ${SC_H}`}
        className="h-auto w-full"
        role="img"
        aria-label="回る回帰直線と残差"
        data-testid="ls-scatter"
      >
        <line x1={toScX(X_MIN)} y1={toScY(Y_MIN)} x2={toScX(X_MAX)} y2={toScY(Y_MIN)} stroke="#cbd5e1" />
        <line x1={toScX(X_MIN)} y1={toScY(Y_MIN)} x2={toScX(X_MIN)} y2={toScY(Y_MAX)} stroke="#cbd5e1" />
        {points.map((p, i) => (
          <line
            key={`r${i}`}
            x1={toScX(p.x)}
            y1={toScY(p.y)}
            x2={toScX(p.x)}
            y2={toScY(lineY(p.x))}
            stroke={COLOR_RESIDUAL}
            strokeWidth={1.3}
            strokeDasharray="3 2"
          />
        ))}
        <line
          x1={toScX(X_MIN)}
          y1={toScY(lineY(X_MIN))}
          x2={toScX(X_MAX)}
          y2={toScY(lineY(X_MAX))}
          stroke={cur?.isMin ? COLOR_MIN : COLOR_LINE}
          strokeWidth={2}
        />
        {points.map((p, i) => (
          <circle key={`p${i}`} cx={toScX(p.x)} cy={toScY(p.y)} r={4} fill="#fff" stroke="#1e293b" strokeWidth={1.5} />
        ))}
      </svg>

      {/* 下: RSS 放物線 */}
      <svg
        viewBox={`0 0 ${W} ${PA_H}`}
        className="h-auto w-full"
        role="img"
        aria-label="傾きに対する残差平方和 RSS の放物線"
        data-testid="rss-parabola"
      >
        <line x1={toPaX(sMin)} y1={toPaY(0)} x2={toPaX(sMax)} y2={toPaY(0)} stroke="#cbd5e1" />
        <text x={SPAD.left} y={PA_H - 6} textAnchor="start" className="fill-slate-400 text-[9px]">
          傾き {formatNumber(sMin)}
        </text>
        <text x={W - SPAD.right} y={PA_H - 6} textAnchor="end" className="fill-slate-400 text-[9px]">
          {formatNumber(sMax)}
        </text>
        <text x={SPAD.left - 4} y={toPaY(maxRss) + 8} textAnchor="end" className="fill-slate-400 text-[9px]">
          RSS
        </text>
        {/* OLS 傾きの基準線 */}
        {Number.isFinite(olsSlope) ? (
          <line
            x1={toPaX(olsSlope)}
            y1={SPAD.top}
            x2={toPaX(olsSlope)}
            y2={toPaY(0)}
            stroke={COLOR_MIN}
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        ) : null}
        {revealed.length > 1 ? <path d={rssLine} fill="none" stroke={COLOR_RSS} strokeWidth={2} /> : null}
        {revealed.map((pt, i) => {
          const latest = i === revealed.length - 1;
          const isMin = cur?.isMin && latest;
          return (
            <circle
              key={i}
              cx={toPaX(pt.slope)}
              cy={toPaY(pt.rss)}
              r={latest ? 5 : 3}
              fill={latest ? (isMin ? COLOR_MIN : COLOR_RSS) : "#fff"}
              stroke={isMin ? COLOR_MIN : COLOR_RSS}
              strokeWidth={2}
            />
          );
        })}
      </svg>

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
        ヒント: ▶ 再生で直線が回り、下の RSS 放物線が描かれます。底（緑の破線＝最小二乗解の傾き）で RSS
        最小。上のラボで点を動かすと放物線の形も変わります。
      </p>
    </div>
  );
}
