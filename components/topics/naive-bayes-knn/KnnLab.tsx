"use client";

import { useCallback, useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { CLASS_TRAIN, GRID_RESOLUTION, K_MAX, K_MIN, NB_TEST_ACC, useNaiveBayesKnnStore } from "@/lib/store/naive-bayes-knn";

const round2 = (v: number) => Math.round(v * 100) / 100;
const W = 300;
const H = 300;
const PAD = 22;
const SCALE = W - 2 * PAD;
const px = (v: number) => round2(PAD + v * SCALE);
const py = (v: number) => round2(PAD + (1 - v) * SCALE);

const LABEL_FILL = { 0: "#2563eb", 1: "#d97706" } as const;
const LABEL_BG = { 0: "#dbeafe", 1: "#fef3c7" } as const;

function formulaFor(): string {
  return `\\hat y(x)=\\operatorname*{arg\\,max}_c\\ \\frac1k\\sum_{i\\in N_k(x)}\\mathbb{1}[y_i=c]\\quad k=${term(
    "k",
    "?",
  )}\\quad P(\\hat y\\mid x)\\approx${term("vote", "?")}`;
}

/**
 * k近傍法 ラボ（Level2）: 「新しい点」（ナイーブベイズラボと同じ座標を共有）から
 * k個の最近傍を線で結び、多数決の様子と決定境界の複雑さがkにどう連動するかを見せる。
 */
export function KnnLab() {
  const d = useNaiveBayesKnnStore((s) => s.derived);
  const setControl = useNaiveBayesKnnStore((s) => s.setControl);
  const patchControls = useNaiveBayesKnnStore((s) => s.patchControls);

  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef(false);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("k", String(d.k));
    m.setValue("vote", formatNumber(d.knn.voteFraction * 100, 0) + "\\%\\ (\\text{クラス1})");
    m.setHighlight("k", true, "#0891b2");
    m.setHighlight("vote", true, LABEL_FILL[d.knn.label]);
  }, [d.k, d.knn]);

  const toData = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const vbX = ((clientX - rect.left) / rect.width) * W;
    const vbY = ((clientY - rect.top) / rect.height) * H;
    const x1 = (vbX - PAD) / SCALE;
    const x2 = 1 - (vbY - PAD) / SCALE;
    return { x1: Math.max(0, Math.min(1, x1)), x2: Math.max(0, Math.min(1, x2)) };
  }, []);

  const startDrag = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      draggingRef.current = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // capture 非対応環境では無視。
      }
      const p = toData(e.clientX, e.clientY);
      if (p) patchControls({ queryX1: round2(p.x1), queryX2: round2(p.x2) });
    },
    [patchControls, toData],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!draggingRef.current) return;
      const p = toData(e.clientX, e.clientY);
      if (p) patchControls({ queryX1: round2(p.x1), queryX2: round2(p.x2) });
    },
    [patchControls, toData],
  );

  const endDrag = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    draggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // capture が無い場合は無視。
    }
  }, []);

  const cellSize = round2(SCALE / GRID_RESOLUTION);
  const neighborIdx = new Set(d.knn.neighbors.map((n) => n.index));
  const gain = d.knnTestAcc - NB_TEST_ACC;

  return (
    <div id="knn-lab" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        同じ«新しい点»（黒い菱形、ナイーブベイズラボと共有）から距離が近い順に k
        個の訓練点を線で結び、そのラベルの多数決で予測する。学習フェーズを持たない«怠惰学習»——新しい点が来るたびに、その場で全訓練点との距離を測るだけ。
      </p>

      <div className="space-y-1">
        <label htmlFor="knn-k" className="font-mono text-xs font-semibold text-slate-700">
          近傍数 k = {d.k}
        </label>
        <input
          id="knn-k"
          type="range"
          min={K_MIN}
          max={K_MAX}
          step={1}
          value={d.k}
          onChange={(e) => setControl("k", Number(e.target.value))}
          className="w-full accent-cyan-600"
        />
      </div>

      <div className="overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="mx-auto h-auto w-full max-w-sm touch-none select-none"
          role="img"
          aria-label="k近傍法の決定境界と近傍"
          data-testid="knn-plot"
          onPointerDown={startDrag}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
        >
          {d.knnBoundary.map((cell, i) => (
            <rect
              key={`cell${i}`}
              x={round2(px(cell.x1) - cellSize / 2)}
              y={round2(py(cell.x2) - cellSize / 2)}
              width={cellSize}
              height={cellSize}
              fill={LABEL_BG[cell.label]}
            />
          ))}
          <rect x={PAD} y={PAD} width={SCALE} height={SCALE} fill="none" className="stroke-slate-300" />

          {d.knn.neighbors.map((n) => (
            <line
              key={`nl${n.index}`}
              x1={px(d.queryX1)}
              y1={py(d.queryX2)}
              x2={px(n.point.x1)}
              y2={py(n.point.x2)}
              stroke="#0f172a"
              strokeWidth={1}
              strokeDasharray="2 2"
              opacity={0.5}
            />
          ))}

          {CLASS_TRAIN.map((p, i) => (
            <circle
              key={`p${i}`}
              cx={px(p.x1)}
              cy={py(p.x2)}
              r={neighborIdx.has(i) ? 4.4 : 3}
              fill={LABEL_FILL[p.label]}
              stroke={neighborIdx.has(i) ? "#0f172a" : "#fff"}
              strokeWidth={neighborIdx.has(i) ? 1.6 : 0.8}
            />
          ))}

          <rect
            x={round2(px(d.queryX1) - 6)}
            y={round2(py(d.queryX2) - 6)}
            width={12}
            height={12}
            fill="#0f172a"
            stroke="#fff"
            strokeWidth={1.5}
            transform={`rotate(45 ${px(d.queryX1)} ${py(d.queryX2)})`}
            className="cursor-grab"
          />

          <text x={PAD} y={H - 4} className="fill-slate-400 text-[9px]">
            x₁ →
          </text>
          <text x={4} y={PAD + 8} className="fill-slate-400 text-[9px]">
            ↑x₂
          </text>
        </svg>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={formulaFor()} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <Stat value={`クラス${d.knn.label}`} label="予測ラベル" tone={d.knn.label === 0 ? "blue" : "amber"} />
        <Stat value={formatNumber(d.knnTestAcc * 100, 1) + "%"} label="k-NNテスト正解率" tone="emerald" />
        <Stat value={formatNumber(NB_TEST_ACC * 100, 1) + "%"} label="（参考）NBテスト正解率" tone="blue" />
      </div>

      <Callout
        title={`k=${d.k}：${d.k <= 2 ? "複雑な境界" : d.k >= 15 ? "滑らかな境界" : "中間的な境界"}`}
        body={
          d.k <= 2
            ? "kが小さいと1〜2点だけで判断するため、個々の点のノイズにそのまま反応し境界がギザギザに複雑になる（低バイアス・高分散）。"
            : d.k >= 15
              ? "kが大きいと多くの点で«平均»するように多数決するため境界が滑らかになる（決定木のバギングと同じ«平均すると分散が下がる»効果）。大きすぎると局所的な構造を無視し始める（高バイアス）。"
              : "kを動かすと境界の複雑さが滑らかに変化する——小さいkは分散が高く、大きいkはバイアスが高い、というトレードオフの途中。"
        }
        note={`k-NN（k=${d.k}）のテスト正解率${formatNumber(d.knnTestAcc * 100, 1)}%は、ナイーブベイズ${formatNumber(NB_TEST_ACC * 100, 1)}%と${
          Math.abs(gain) < 0.02 ? "ほぼ同水準" : gain > 0 ? "上回る" : "下回る"
        }。どちらも«正解»はなく、データの形（分布に従うか・局所的な近さで決まるか）に応じて向き不向きがある。`}
        kind={d.k <= 2 || d.k >= 15 ? "supplement" : "explain"}
      />
    </div>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone: "blue" | "amber" | "emerald" }) {
  const bg = {
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
  }[tone];
  return (
    <div className={`rounded-lg px-2 py-2 ${bg}`}>
      <div className="font-mono text-sm">{value}</div>
      <div className="text-slate-500">{label}</div>
    </div>
  );
}
