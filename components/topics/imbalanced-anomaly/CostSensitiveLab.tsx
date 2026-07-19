"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { COST_MAX, COST_MIN, IMBALANCED_DATA, PROJECTION_SCORES, useImbalancedAnomalyStore } from "@/lib/store/imbalanced-anomaly";
import { px, round2 } from "./scatter-layout";

const FORMULA = `p^*=\\dfrac{${term("cfp", "?")}}{${term("cfp2", "?")}+${term("cfn", "?")}}=${term("threshold", "?")}`;

const LINE_W = 300;
const LINE_H = 130;
const BASELINE_Y = 78;

/** 少数派配列内 index (0始まり) から決定的なY方向ジッタ（点の重なりを避けるだけの表示用オフセット）。 */
function jitter(i: number): number {
  return ((i * 7) % 11) * 3.2 - 16;
}

/**
 * コスト考慮型学習ラボ（Level1）: 偽陽性/偽陰性のコストを操作すると、最適しきい値
 * p*=C_FP/(C_FP+C_FN) が数式と共に動き、しきい値0.5との混同行列・期待コストの差が連動する。
 */
export function CostSensitiveLab() {
  const controls = useImbalancedAnomalyStore((s) => s.controls);
  const d = useImbalancedAnomalyStore((s) => s.derived);
  const patchControls = useImbalancedAnomalyStore((s) => s.patchControls);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("cfp", String(controls.costFP));
    m.setValue("cfp2", String(controls.costFP));
    m.setValue("cfn", String(controls.costFN));
    m.setValue("threshold", formatNumber(d.optimalThreshold, 2));
    m.setHighlight("cfp", true, "#dc2626");
    m.setHighlight("cfp2", true, "#dc2626");
    m.setHighlight("cfn", true, "#2563eb");
    m.setHighlight("threshold", true, "#059669");
  }, [controls.costFP, controls.costFN, d.optimalThreshold]);

  return (
    <div id="cost-sensitive-lab" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        各点の«陽性らしさスコア»（多数派重心→少数派重心方向への射影, 0〜1）を数直線上に並べた。既定のしきい値0.5（灰の破線）ではなく、見逃し（偽陰性）と誤報（偽陽性）のコストに応じた最適しきい値
        p*（緑の実線）で判定すると期待コストが下がる。
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          <span>
            偽陽性コスト C_FP = <span className="font-mono">{controls.costFP}</span>
          </span>
          <input
            type="range"
            min={COST_MIN}
            max={COST_MAX}
            step={1}
            value={controls.costFP}
            onChange={(e) => patchControls({ costFP: Number(e.target.value) })}
            aria-label="偽陽性コスト"
            className="accent-red-600"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          <span>
            偽陰性コスト C_FN = <span className="font-mono">{controls.costFN}</span>
          </span>
          <input
            type="range"
            min={COST_MIN}
            max={COST_MAX}
            step={1}
            value={controls.costFN}
            onChange={(e) => patchControls({ costFN: Number(e.target.value) })}
            aria-label="偽陰性コスト"
            className="accent-blue-600"
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${LINE_W} ${LINE_H}`} className="mx-auto h-auto w-full max-w-sm" role="img" aria-label="陽性らしさスコアの数直線としきい値">
          <line x1={22} y1={BASELINE_Y} x2={278} y2={BASELINE_Y} stroke="#cbd5e1" strokeWidth={1.5} />
          {IMBALANCED_DATA.map((pt, i) => (
            <circle
              key={i}
              cx={px(PROJECTION_SCORES[i])}
              cy={round2(BASELINE_Y + jitter(i))}
              r={pt.label === 1 ? 3.6 : 2.6}
              fill={pt.label === 1 ? "#d97706" : "#94a3b8"}
              opacity={0.85}
            />
          ))}
          <line x1={px(0.5)} y1={20} x2={px(0.5)} y2={BASELINE_Y + 30} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="3 2" />
          <text x={px(0.5)} y={14} textAnchor="middle" className="fill-slate-400 text-[9px]">
            0.5
          </text>
          <line x1={px(d.optimalThreshold)} y1={16} x2={px(d.optimalThreshold)} y2={BASELINE_Y + 30} stroke="#059669" strokeWidth={2} />
          <text x={px(d.optimalThreshold)} y={110} textAnchor="middle" className="fill-emerald-700 text-[10px] font-semibold">
            p*={formatNumber(d.optimalThreshold, 2)}
          </text>
        </svg>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} display={false} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        <Stat label="しきい値0.5: 見逃し(FN)" value={String(d.confusionAtHalf.fn)} />
        <Stat label="しきい値0.5: 誤報(FP)" value={String(d.confusionAtHalf.fp)} />
        <Stat label="最適p*: 見逃し(FN)" value={String(d.confusionAtOptimal.fn)} tone="emerald" />
        <Stat label="最適p*: 誤報(FP)" value={String(d.confusionAtOptimal.fp)} tone="emerald" />
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <Stat label="期待コスト（しきい値0.5）" value={formatNumber(d.costAtHalf, 1)} />
        <Stat label="期待コスト（最適p*）" value={formatNumber(d.costAtOptimal, 1)} tone="emerald" />
      </div>

      <Callout
        title={controls.costFN > controls.costFP ? "見逃しの方が高コスト → しきい値を下げる" : controls.costFN < controls.costFP ? "誤報の方が高コスト → しきい値を上げる" : "コストが対称 → しきい値0.5と一致"}
        body={
          controls.costFN > controls.costFP
            ? "見逃し（偽陰性）が誤報（偽陽性）より«高くつく»場合、最適しきい値p*は0.5より小さくなる——«疑わしきは陽性»側に判定を倒し、見逃しを減らす代わりに誤報が増えるのを許容する。"
            : controls.costFN < controls.costFP
              ? "誤報（偽陽性）が見逃し（偽陰性）より«高くつく»場合、最適しきい値p*は0.5より大きくなる——確信度が高いときだけ陽性と判定し、誤報を減らす。"
              : "偽陽性・偽陰性のコストが等しければ、最適しきい値は既定の0.5と一致する。"
        }
        note="医療診断（見逃し=重大)やスパム検知（誤報=重大）のように、C_FPとC_FNは実務上ほぼ確実に非対称——«正解率»だけでモデルを評価してはいけない理由がここにある。"
        kind="explain"
      />
    </div>
  );
}

function Stat({ label, value, tone = "slate" }: { label: string; value: string; tone?: "slate" | "emerald" }) {
  const bg = tone === "emerald" ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-900";
  return (
    <div className={`rounded-lg px-2 py-2 text-center ${bg}`}>
      <div className="font-mono text-sm">{value}</div>
      <div className="text-slate-500">{label}</div>
    </div>
  );
}
