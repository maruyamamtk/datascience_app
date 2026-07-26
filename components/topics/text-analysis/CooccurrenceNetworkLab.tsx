"use client";

import { useMemo, useState } from "react";
import { Callout } from "@/components/viz";
import { useTextAnalysisStore } from "@/lib/store/text-analysis";

const W = 360;
const H = 320;
const CX = W / 2;
const CY = H / 2;
const R = 120;

/**
 * 共起ネットワーク ラボ（描画層）。語彙を円周上に等間隔に並べ、共起回数をエッジの太さで表す
 * 単純な（力学シミュレーションなしの）ネットワーク図。窓幅（windowSize）を広げると新しいエッジが
 * 増える様子、ノードをクリックすると近傍（直接つながる語）だけが浮かび上がる様子を確認できる
 * （アルゴリズム図鑑スタイル: 色ハイライト＋近傍コールアウト——文字通りの«近傍»）。
 */
export function CooccurrenceNetworkLab() {
  const windowSize = useTextAnalysisStore((s) => s.controls.windowSize);
  const setControl = useTextAnalysisStore((s) => s.setControl);
  const vocabulary = useTextAnalysisStore((s) => s.derived.coVocabulary);
  const matrix = useTextAnalysisStore((s) => s.derived.coMatrix);

  const [selected, setSelected] = useState<number | null>(null);

  const positions = useMemo(() => {
    const n = vocabulary.length;
    return vocabulary.map((_, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      return { x: CX + R * Math.cos(angle), y: CY + R * Math.sin(angle) };
    });
  }, [vocabulary]);

  const edges = useMemo(() => {
    const list: { a: number; b: number; weight: number }[] = [];
    for (let i = 0; i < vocabulary.length; i++) {
      for (let j = i + 1; j < vocabulary.length; j++) {
        if (matrix[i][j] > 0) list.push({ a: i, b: j, weight: matrix[i][j] });
      }
    }
    return list;
  }, [vocabulary, matrix]);

  const neighborsOf = (idx: number) =>
    edges.filter((e) => e.a === idx || e.b === idx).map((e) => ({ other: e.a === idx ? e.b : e.a, weight: e.weight }));

  const selectedNeighbors = selected !== null ? neighborsOf(selected) : [];
  const selectedNeighborIdx = new Set(selectedNeighbors.map((n) => n.other));

  return (
    <div id="ta-cooccur" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="ta-window" className="font-mono text-xs font-semibold text-slate-700">
          窓幅 = {windowSize}
        </label>
        <input
          id="ta-window"
          type="range"
          min={1}
          max={3}
          step={1}
          value={windowSize}
          onChange={(e) => setControl("windowSize", Number(e.target.value))}
          className="w-40 accent-blue-600"
        />
        <span className="text-xs text-slate-500">（前後何語以内を«共起»とみなすか）</span>
      </div>

      <p className="text-sm text-slate-600">
        語をクリックすると、その語と直接共起する語（近傍）だけがハイライトされる。線の太さは共起回数。
      </p>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-md" role="img" aria-label="共起ネットワーク">
          {edges.map((e, i) => {
            const isActive = selected !== null && (e.a === selected || e.b === selected);
            const dim = selected !== null && !isActive;
            return (
              <line
                key={i}
                x1={positions[e.a].x}
                y1={positions[e.a].y}
                x2={positions[e.b].x}
                y2={positions[e.b].y}
                stroke={isActive ? "#2563eb" : "#cbd5e1"}
                strokeWidth={Math.min(6, 1 + e.weight)}
                opacity={dim ? 0.15 : 0.8}
              />
            );
          })}
          {vocabulary.map((word, i) => {
            const isSelected = i === selected;
            const isNeighbor = selectedNeighborIdx.has(i);
            const dim = selected !== null && !isSelected && !isNeighbor;
            const fill = isSelected ? "#2563eb" : isNeighbor ? "#7c3aed" : "#64748b";
            return (
              <g
                key={word}
                className="cursor-pointer"
                opacity={dim ? 0.3 : 1}
                onClick={() => setSelected(isSelected ? null : i)}
              >
                <circle cx={positions[i].x} cy={positions[i].y} r={isSelected ? 16 : 12} fill={fill} />
                <text
                  x={positions[i].x}
                  y={positions[i].y - (isSelected ? 20 : 16)}
                  textAnchor="middle"
                  className="fill-slate-700 text-[9px] font-mono"
                >
                  {word}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {selected !== null ? (
        <Callout
          title={`「${vocabulary[selected]}」の近傍（窓幅${windowSize}以内で共起する語）`}
          body={
            selectedNeighbors.length > 0
              ? selectedNeighbors
                  .sort((a, b) => b.weight - a.weight)
                  .map((n) => `${vocabulary[n.other]}(×${n.weight})`)
                  .join("、")
              : "この窓幅では共起する語がない。窓幅を広げると増えることがある。"
          }
          note="共起ネットワークは «一緒に使われる語» を直接つなぐグラフ。単語埋め込み（次のラボ）は、この共起の情報を «ベクトル» という形でも表現する——同じ分布仮説（周囲の語が近ければ意味も近い）に基づいている。"
        />
      ) : (
        <p className="text-xs text-slate-500">語をクリックすると詳細が表示される。</p>
      )}
    </div>
  );
}
