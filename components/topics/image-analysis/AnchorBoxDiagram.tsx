"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { ANCHOR_CENTER, ANCHOR_COLORS, ANCHOR_RATIOS, ANCHOR_SCALES, DETECTION_CANVAS, useImageAnalysisStore } from "@/lib/store/image-analysis";

const FORMULA = `w=\\text{scale}\\sqrt{\\text{ratio}}=${term("ia_scale", "?")}\\sqrt{${term("ia_ratio", "?")}}=${term(
  "ia_w",
  "?",
)}\\qquad h=\\dfrac{\\text{scale}}{\\sqrt{\\text{ratio}}}=${term("ia_h", "?")}`;

const W = 300;
const H = 300;
const SCALE = W / DETECTION_CANVAS.width;

/**
 * アンカーボックスの実時間操作図（L2 Interact）。
 * 1点（画像中心の想定）から、複数のスケール（面積の目安）×縦横比の組み合わせで
 * あらかじめ用意しておく「アンカー」ボックス群を並べ、「次へ」で1つずつ着目すると
 * w=scale·√ratio, h=scale/√ratio という連立方程式の解が数式と連動する。
 */
export function AnchorBoxDiagram() {
  const anchorBoxes = useImageAnalysisStore((s) => s.derived.anchorBoxes);
  const anchorHighlightIndex = useImageAnalysisStore((s) => s.derived.anchorHighlightIndex);
  const activeAnchor = useImageAnalysisStore((s) => s.derived.activeAnchor);
  const activeAnchorScale = useImageAnalysisStore((s) => s.derived.activeAnchorScale);
  const activeAnchorRatio = useImageAnalysisStore((s) => s.derived.activeAnchorRatio);
  const setControl = useImageAnalysisStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("ia_scale", String(activeAnchorScale));
    m.setValue("ia_ratio", formatNumber(activeAnchorRatio, 2));
    m.setValue("ia_w", formatNumber(activeAnchor.w, 2));
    m.setValue("ia_h", formatNumber(activeAnchor.h, 2));
    m.setHighlight("ia_w", true, "#7c3aed");
    m.setHighlight("ia_h", true, "#7c3aed");
  }, [activeAnchor, activeAnchorScale, activeAnchorRatio]);

  const cx = ANCHOR_CENTER.x * SCALE;
  const cy = ANCHOR_CENTER.y * SCALE;

  return (
    <div id="ia-anchor-diagram" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        画像上の1点（×印）を中心に、スケール（面積の目安）×縦横比の組み合わせだけ«あらかじめ»ボックスを用意しておく——
        これがアンカーボックス。「次へ」で1つずつ着目すると、そのボックスの幅・高さがどう計算されるかが連動する。
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mx-auto h-auto w-full max-w-[300px] rounded-xl bg-slate-50"
        role="img"
        aria-label="中心点から生成した複数のアンカーボックス"
        data-testid="ia-anchor-plot"
      >
        <line x1={cx - 6} y1={cy} x2={cx + 6} y2={cy} stroke="#0f172a" strokeWidth={2} />
        <line x1={cx} y1={cy - 6} x2={cx} y2={cy + 6} stroke="#0f172a" strokeWidth={2} />
        {anchorBoxes.map((b, i) => {
          const scaleIdx = Math.floor(i / ANCHOR_RATIOS.length);
          const isActive = i === anchorHighlightIndex;
          return (
            <rect
              key={i}
              x={b.x * SCALE}
              y={b.y * SCALE}
              width={b.w * SCALE}
              height={b.h * SCALE}
              fill="none"
              stroke={ANCHOR_COLORS[scaleIdx % ANCHOR_COLORS.length]}
              strokeWidth={isActive ? 3.5 : 1.5}
              strokeOpacity={isActive ? 1 : 0.45}
            />
          );
        })}
      </svg>

      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setControl("anchorHighlightIndex", Math.max(0, anchorHighlightIndex - 1))}
          disabled={anchorHighlightIndex <= 0}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ◀ 前のアンカーへ
        </button>
        <span className="font-mono text-xs text-slate-500">
          アンカー {anchorHighlightIndex + 1} / {anchorBoxes.length}（スケール{activeAnchorScale}・比{formatNumber(activeAnchorRatio, 2)}）
        </span>
        <button
          type="button"
          onClick={() => setControl("anchorHighlightIndex", Math.min(anchorBoxes.length - 1, anchorHighlightIndex + 1))}
          disabled={anchorHighlightIndex >= anchorBoxes.length - 1}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          次のアンカーへ ▶
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} display={false} />
      </div>

      <Callout
        title={`スケール ${ANCHOR_SCALES.join("・")}（${ANCHOR_COLORS.length}色）× 縦横比 ${ANCHOR_RATIOS.join("・")}`}
        body={`各アンカーは面積の目安（scale²）と縦横比（ratio=w/h）の2つの手がかりだけから、w·h=scale²かつw/h=ratioという連立方程式を解いて幅・高さを決める——w=scale√ratio, h=scale/√ratio。`}
        note="物体検出モデルはこのアンカー群を«候補»として各アンカーごとに物体らしさを予測し、正解に近いアンカーを微調整する（アンカーベースの検出手法の考え方）——学習の詳細はL3以降で扱う。"
      />
    </div>
  );
}
