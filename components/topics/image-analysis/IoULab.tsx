"use client";

import { useCallback, useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { DETECTION_CANVAS, useImageAnalysisStore } from "@/lib/store/image-analysis";
import type { Box } from "@/lib/stats/image-analysis";

const FORMULA = `\\text{IoU}=\\dfrac{\\text{Area}(A\\cap B)}{\\text{Area}(A\\cup B)}=\\dfrac{${term("ia_inter", "?")}}{${term(
  "ia_union",
  "?",
)}}=${term("ia_iou", "?")}`;

const W = 300;
const H = 300;
const SCALE = W / DETECTION_CANVAS.width;

const COLOR_A = "#2563eb";
const COLOR_B = "#dc2626";
const COLOR_INTER = "#7c3aed";

const round2 = (v: number): number => Math.round(v * 100) / 100;

/**
 * IoU（Intersection over Union）の実時間操作ラボ（L1 Interact）。
 * 2つのバウンディングボックスをドラッグすると、共通部分（紫の網掛け）とIoUの値が数式と
 * 連動して実時間更新される（tasks/lessons.md のSVGドラッグパターンに準拠: pointer events +
 * setPointerCapture、クライアント座標→データ座標の逆変換）。
 */
export function IoULab() {
  const boxA = useImageAnalysisStore((s) => s.derived.boxA);
  const boxB = useImageAnalysisStore((s) => s.derived.boxB);
  const intersection = useImageAnalysisStore((s) => s.derived.intersection);
  const union = useImageAnalysisStore((s) => s.derived.union);
  const iouValue = useImageAnalysisStore((s) => s.derived.iouValue);
  const setControl = useImageAnalysisStore((s) => s.setControl);

  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ box: "boxA" | "boxB"; offsetX: number; offsetY: number } | null>(null);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("ia_inter", formatNumber(intersection, 1));
    m.setValue("ia_union", formatNumber(union, 1));
    m.setValue("ia_iou", formatNumber(iouValue, 3));
    m.setHighlight("ia_iou", true, COLOR_INTER);
  }, [intersection, union, iouValue]);

  const toData = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * DETECTION_CANVAS.width;
    const y = ((clientY - rect.top) / rect.height) * DETECTION_CANVAS.height;
    return { x, y };
  }, []);

  const startDrag = (which: "boxA" | "boxB") => (e: React.PointerEvent<SVGRectElement>) => {
    const d = toData(e.clientX, e.clientY);
    const box = which === "boxA" ? boxA : boxB;
    if (!d) return;
    dragRef.current = { box: which, offsetX: d.x - box.x, offsetY: d.y - box.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      const d = toData(e.clientX, e.clientY);
      if (!d) return;
      const box = drag.box === "boxA" ? boxA : boxB;
      const nextX = Math.max(0, Math.min(DETECTION_CANVAS.width - box.w, d.x - drag.offsetX));
      const nextY = Math.max(0, Math.min(DETECTION_CANVAS.height - box.h, d.y - drag.offsetY));
      const next: Box = { ...box, x: round2(nextX), y: round2(nextY) };
      setControl(drag.box, next);
    },
    [boxA, boxB, setControl, toData],
  );

  const endDrag = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // capture が無い場合は無視。
    }
  }, []);

  const rectFor = (b: Box) => ({ x: b.x * SCALE, y: b.y * SCALE, width: b.w * SCALE, height: b.h * SCALE });
  const ra = rectFor(boxA);
  const rb = rectFor(boxB);
  const ix = Math.max(boxA.x, boxB.x) * SCALE;
  const iy = Math.max(boxA.y, boxB.y) * SCALE;
  const iw = Math.max(0, Math.min(boxA.x + boxA.w, boxB.x + boxB.w) - Math.max(boxA.x, boxB.x)) * SCALE;
  const ih = Math.max(0, Math.min(boxA.y + boxA.h, boxB.y + boxB.h) - Math.max(boxA.y, boxB.y)) * SCALE;

  return (
    <div id="ia-iou-lab" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        <span style={{ color: COLOR_A }} className="font-semibold">
          ボックスA
        </span>
        ・
        <span style={{ color: COLOR_B }} className="font-semibold">
          ボックスB
        </span>
        をドラッグして動かすと、共通部分（紫の網掛け）とIoUが実時間で再計算される。
      </p>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="mx-auto h-auto w-full max-w-[300px] touch-none select-none rounded-xl bg-slate-50"
        role="img"
        aria-label="2つのバウンディングボックスとIoU"
        data-testid="ia-iou-plot"
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        {iw > 0 && ih > 0 ? <rect x={ix} y={iy} width={iw} height={ih} fill={COLOR_INTER} fillOpacity={0.35} /> : null}
        <rect {...ra} fill="none" stroke={COLOR_A} strokeWidth={2.5} />
        <rect {...rb} fill="none" stroke={COLOR_B} strokeWidth={2.5} strokeDasharray="6 3" />
        {/* ドラッグハンドル（透明の広い当たり判定） */}
        <rect {...ra} fill="transparent" className="cursor-grab" onPointerDown={startDrag("boxA")} />
        <rect {...rb} fill="transparent" className="cursor-grab" onPointerDown={startDrag("boxB")} />
      </svg>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Metric label="共通部分" value={formatNumber(intersection, 1)} color={COLOR_INTER} />
        <Metric label="和集合" value={formatNumber(union, 1)} color="#475569" />
        <Metric label="IoU" value={formatNumber(iouValue, 3)} color={COLOR_INTER} />
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} display={false} />
      </div>

      <Callout
        title="IoUは«重なり具合»を0〜1の1つの数値にする"
        body="共通部分の面積を和集合の面積で割ることで、ボックスの大きさに関わらず«どれだけ重なっているか»を0（重なりなし）〜1（完全一致）の比率で表せる。物体検出では、予測ボックスと正解ボックスのIoUがしきい値（例0.5）以上なら«正しく検出できた»とみなす。"
        note="ボックスを完全に離すとIoU=0、ぴったり重ねるとIoU=1になることを確かめてみよう。"
      />
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="font-mono text-base font-semibold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
