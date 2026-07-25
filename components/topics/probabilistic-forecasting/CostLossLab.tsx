"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { useProbabilisticForecastingStore } from "@/lib/store/probabilistic-forecasting";
import { num, round2 } from "./format";

const FORMULA = `p^*=\\frac{${term("cl_c", "?")}}{${term("cl_l", "?")}}=${term(
  "cl_r",
  "?",
)},\\qquad V=\\frac{\\text{気候値}-\\text{予測}}{\\text{気候値}-\\text{完全}}=${term("cl_v", "?")}`;

/**
 * コスト/ロスモデルのラボ(L2)。対策コストC・ロスLをスライダーで動かすと、最適閾値
 * p*=C/Lが変化し、①「常に対策」「一度も対策しない(気候値の最良)」「確率予測をp*で
 * 使う」「完全な予測」の4つの期待コストがどう並ぶか、②予測の価値スコアVがどう
 * 動くかを操作→図→数式で強連動させる([情報の価値](value-of-information)のEVPIと
 * 同じ「予測なし〜完全情報」の間に実際の予測を位置づける発想)。
 */
export function CostLossLab() {
  const costC = useProbabilisticForecastingStore((s) => s.controls.costC);
  const lossL = useProbabilisticForecastingStore((s) => s.controls.lossL);
  const costLoss = useProbabilisticForecastingStore((s) => s.derived.costLoss);
  const setControl = useProbabilisticForecastingStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("cl_c", formatNumber(costC, 1));
    m.setValue("cl_l", formatNumber(lossL, 1));
    m.setValue("cl_r", formatNumber(costLoss.ratio, 3));
    m.setValue("cl_v", formatNumber(costLoss.valueScore, 3));
    m.setHighlight("cl_c", true, "#f59e0b");
    m.setHighlight("cl_l", true, "#dc2626");
    m.setHighlight("cl_r", true, "#2563eb");
    const vColor =
      costLoss.valueScore >= 0.5 ? "#16a34a" : costLoss.valueScore >= 0 ? "#f59e0b" : "#dc2626";
    m.setHighlight("cl_v", true, vColor);
  }, [costC, lossL, costLoss]);

  const bars = [
    { key: "always", label: "常に対策", value: costLoss.alwaysProtectCost, color: "#94a3b8" },
    {
      key: "climatology",
      label: "気候値の最良(予測なし)",
      value: costLoss.climatologyBestCost,
      color: "#64748b",
    },
    { key: "forecast", label: "確率予測を使う", value: costLoss.forecastCost, color: "#2563eb" },
    { key: "perfect", label: "完全な予測", value: costLoss.perfectForecastCost, color: "#16a34a" },
  ];
  const maxCost = Math.max(1e-6, ...bars.map((b) => b.value));

  return (
    <div id="cost-loss-lab" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        対策コスト C とロス L を動かすと、最適閾値
        <strong className="font-semibold text-slate-900"> p*=C/L</strong>
        が変わる。確率予測をこの閾値で使うと、期待コストが「気候値だけの最良」と
        「完全な予測」の間のどこに位置するかを確かめよう。
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          対策コスト C = {num(costC, 1)}
          <input
            type="range"
            min={0.5}
            max={20}
            step={0.5}
            value={costC}
            onChange={(e) => setControl("costC", Number(e.target.value))}
            aria-label="対策コストC"
            data-testid="cost-loss-cost-slider"
            className="accent-amber-600"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          ロス L = {num(lossL, 1)}
          <input
            type="range"
            min={1}
            max={20}
            step={0.5}
            value={lossL}
            onChange={(e) => setControl("lossL", Number(e.target.value))}
            aria-label="ロスL"
            data-testid="cost-loss-loss-slider"
            className="accent-red-600"
          />
        </label>
      </div>

      <div className="space-y-2" data-testid="cost-loss-bars">
        {bars.map((b) => (
          <div key={b.key} className="flex items-center gap-2 text-xs text-slate-600">
            <span className="w-40 shrink-0 text-right font-medium">{b.label}</span>
            <div className="h-4 flex-1 rounded bg-slate-100">
              <div
                className="h-4 rounded"
                style={{ width: `${round2((b.value / maxCost) * 100)}%`, backgroundColor: b.color }}
                data-testid={`cost-loss-bar-${b.key}`}
              />
            </div>
            <span className="w-14 shrink-0 font-mono">{num(b.value, 2)}</span>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} display={false} />
      </div>

      <div data-testid="cost-loss-value-callout">
        <Callout
          kind={costLoss.valueScore >= 0.3 ? "explain" : "supplement"}
          title={`予測の価値スコア V = ${num(costLoss.valueScore, 3)}`}
          body={
            costLoss.valueScore >= 0.99
              ? "ほぼ完全な予測と同じ価値まで達している(気候値の最良コストから、完全な予測のコストまでほぼ全て縮められている)。"
              : costLoss.valueScore <= 0.02
                ? "気候値(予測なし)の最良戦略とほぼ同じ——このコスト/ロス比では確率予測がまだ価値を生んでいない。"
                : `気候値の最良コストと完全な予測のコストの間を ${num(costLoss.valueScore * 100, 0)}% だけ縮められている。`
          }
          note="V=(気候値の最良コスト−予測を使ったコスト)/(気候値の最良コスト−完全な予測のコスト)。0=気候値と同程度、1=完全な予測と同程度。上のCalibrationLabで確信度スケールkを1から離す(較正を崩す)と、Vが下がることも確かめられる。"
        />
      </div>
    </div>
  );
}
