"use client";

import { useCallback, useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import {
  CLASS_TRAIN,
  GRID_RESOLUTION,
  NB_BOUNDARY,
  NB_ELLIPSES_1SD,
  NB_ELLIPSES_2SD,
  NB_TEST_ACC,
  useNaiveBayesKnnStore,
} from "@/lib/store/naive-bayes-knn";

const round2 = (v: number) => Math.round(v * 100) / 100;

// [0,1]×[0,1] の判別平面を描くSVGレイアウト（decision-trees-ensembles と同じレイアウト規約）。
const W = 300;
const H = 300;
const PAD = 22;
const SCALE = W - 2 * PAD;
const px = (v: number) => round2(PAD + v * SCALE);
const py = (v: number) => round2(PAD + (1 - v) * SCALE);
const pr = (v: number) => round2(v * SCALE);

const LABEL_FILL = { 0: "#2563eb", 1: "#d97706" } as const;
const LABEL_BG = { 0: "#dbeafe", 1: "#fef3c7" } as const;
const LABEL_STROKE = { 0: "#1d4ed8", 1: "#b45309" } as const;

function formulaFor(): string {
  return `\\hat y(x)=\\operatorname*{arg\\,max}_k\\ \\pi_k\\,p(x_1\\mid k)\\,p(x_2\\mid k)=${term(
    "yhat",
    "?",
  )}\\qquad P(\\hat y\\mid x)=${term("post", "?")}`;
}

/**
 * ナイーブベイズ ラボ（Level0）: 各クラスのガウス分布（信頼楕円）と決定境界を判別平面に重ね、
 * «新しい点» をドラッグ/クリックすると事前確率×尤度×尤度から事後確率が実時間で再計算され、
 * 数式の項（ŷ・事後確率）と強連動する。
 */
export function NaiveBayesLab() {
  const d = useNaiveBayesKnnStore((s) => s.derived);
  const patchControls = useNaiveBayesKnnStore((s) => s.patchControls);

  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef(false);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("yhat", String(d.nb.label));
    m.setValue("post", formatNumber(d.nb.posterior[d.nb.label] * 100, 1) + "\\%");
    m.setHighlight("yhat", true, LABEL_FILL[d.nb.label]);
    m.setHighlight("post", true, LABEL_FILL[d.nb.label]);
  }, [d.nb]);

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
  const maxPosterior = d.nb.posterior[d.nb.label];

  return (
    <div id="naive-bayes-lab" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        {CLASS_TRAIN.length}点の訓練データから、クラスごとに正規分布（信頼楕円: 実線=1σ・破線=2σ）を推定した。図をクリック/ドラッグして «新しい点»
        （黒い菱形）を動かすと、その点が2つの釣鐘型分布のどちらに «乗っている» かで事後確率が決まり、色分けされた背景（決定境界）とラベルが実時間で更新される。
      </p>

      <div className="overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="mx-auto h-auto w-full max-w-sm touch-none select-none"
          role="img"
          aria-label="ナイーブベイズの決定境界と信頼楕円"
          data-testid="naive-bayes-plot"
          onPointerDown={startDrag}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
        >
          {NB_BOUNDARY.map((cell, i) => (
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

          {([0, 1] as const).map((label) => (
            <g key={`ellipse${label}`}>
              <ellipse
                cx={px(NB_ELLIPSES_2SD[label].cx)}
                cy={py(NB_ELLIPSES_2SD[label].cy)}
                rx={pr(NB_ELLIPSES_2SD[label].rx)}
                ry={pr(NB_ELLIPSES_2SD[label].ry)}
                fill="none"
                stroke={LABEL_STROKE[label]}
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.6}
              />
              <ellipse
                cx={px(NB_ELLIPSES_1SD[label].cx)}
                cy={py(NB_ELLIPSES_1SD[label].cy)}
                rx={pr(NB_ELLIPSES_1SD[label].rx)}
                ry={pr(NB_ELLIPSES_1SD[label].ry)}
                fill="none"
                stroke={LABEL_STROKE[label]}
                strokeWidth={1.6}
              />
            </g>
          ))}

          {CLASS_TRAIN.map((p, i) => (
            <circle key={`p${i}`} cx={px(p.x1)} cy={py(p.x2)} r={3} fill={LABEL_FILL[p.label]} stroke="#fff" strokeWidth={0.8} />
          ))}

          {/* 新しい点（クエリ）: 菱形で他の点と区別、ドラッグ可能。 */}
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

      <p className="text-center text-xs text-slate-500">
        新しい点: (x₁, x₂) = ({formatNumber(d.queryX1, 2)}, {formatNumber(d.queryX2, 2)})
      </p>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={formulaFor()} />
      </div>

      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <Stat value={formatNumber(d.nb.prior[0], 2)} label="事前確率 π₀" tone="blue" />
        <Stat value={formatNumber(d.nb.prior[1], 2)} label="事前確率 π₁" tone="amber" />
        <Stat value={`クラス${d.nb.label}`} label="予測ラベル" tone={d.nb.label === 0 ? "blue" : "amber"} />
        <Stat value={formatNumber(NB_TEST_ACC * 100, 1) + "%"} label="テスト正解率" tone="emerald" />
      </div>

      <Callout
        title={`予測: クラス${d.nb.label}（事後確率${formatNumber(maxPosterior * 100, 1)}%）`}
        body={
          maxPosterior > 0.9
            ? "2つの釣鐘型分布のうち、片方に大きく «乗っている»——事後確率がほぼ1に近く、自信を持って分類できている。"
            : maxPosterior > 0.65
              ? "どちらかの分布に寄っているが、もう片方の裾にもわずかにかかっている——境界付近ほど事後確率は五分五分に近づく。"
              : "2つの分布のちょうど境目付近——事後確率が五分五分に近く、«際どい» 分類になっている。点を動かして境界を確かめよう。"
        }
        note="決定境界（背景の色分け）は、2クラスの事後確率がちょうど入れ替わる位置。分散が等しくない2つのガウス分布どうしの境界は、直線ではなく曲線になる。"
        kind="explain"
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
