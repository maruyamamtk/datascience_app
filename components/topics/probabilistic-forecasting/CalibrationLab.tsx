"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { useProbabilisticForecastingStore } from "@/lib/store/probabilistic-forecasting";
import { num, pct, round2 } from "./format";

const FORMULA = `BS=\\underbrace{${term("cal_rel", "?")}}_{\\text{信頼度エラー}}-\\underbrace{${term(
  "cal_res",
  "?",
)}}_{\\text{Refinement}}+\\underbrace{${term("cal_unc", "?")}}_{\\text{不確実性}}=${term("cal_bs", "?")}`;

const W = 300;
const H = 300;
const PAD = { top: 16, right: 16, bottom: 34, left: 38 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

const sx = (v: number) => round2(PAD.left + v * CW);
const sy = (v: number) => round2(PAD.top + CH - v * CH);

/**
 * 信頼度曲線(Reliability Diagram)のインタラクティブなラボ(L1〜L2)。
 * 確信度スケールk(過信⇄自信不足)を動かすと、①信頼度曲線が対角線からどうズレるか、
 * ②Sharpness(予測確率のヒストグラム、自信の度合い)がどう変わるか、③ブライアスコアの
 * 3分解(信頼度エラー・Refinement・不確実性)の各項がリアルタイムに再計算される様子を
 * 「操作→図→数式」で強連動させる(CLAUDE.md §2)。
 */
export function CalibrationLab() {
  const confidenceScale = useProbabilisticForecastingStore((s) => s.controls.confidenceScale);
  const bins = useProbabilisticForecastingStore((s) => s.derived.bins);
  const decomposition = useProbabilisticForecastingStore((s) => s.derived.decomposition);
  const brierScoreValue = useProbabilisticForecastingStore((s) => s.derived.brierScore);
  const sharpnessValue = useProbabilisticForecastingStore((s) => s.derived.sharpnessValue);
  const setControl = useProbabilisticForecastingStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("cal_rel", formatNumber(decomposition.reliability, 4));
    m.setValue("cal_res", formatNumber(decomposition.resolution, 4));
    m.setValue("cal_unc", formatNumber(decomposition.uncertainty, 4));
    m.setValue("cal_bs", formatNumber(decomposition.brierScore, 4));
    m.setHighlight("cal_rel", true, "#dc2626");
    m.setHighlight("cal_res", true, "#16a34a");
    m.setHighlight("cal_unc", true, "#64748b");
    m.setHighlight("cal_bs", true, "#7c3aed");
  }, [decomposition]);

  const activeBins = bins.filter((b) => b.count > 0);
  const maxCount = Math.max(1, ...bins.map((b) => b.count));

  const label =
    confidenceScale > 1.1
      ? "過信(overconfidence): 実際より極端な確率を言いがち"
      : confidenceScale < 0.9
        ? "自信不足(underconfidence): 実際より控えめな確率しか言わない"
        : "ほぼ較正されている(歪みなし)";

  return (
    <div
      id="calibration-lab"
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <p className="text-sm text-slate-600">
        確信度スケール k を動かして、同じ200件の予測を
        <strong className="font-semibold text-slate-900">「過信」</strong>や
        <strong className="font-semibold text-slate-900">「自信不足」</strong>
        に歪めると、信頼度曲線・Sharpness・ブライアスコアの分解がどう変わるか確かめよう。
      </p>

      <label className="flex flex-col gap-1 text-sm text-slate-700">
        確信度スケール k = {num(confidenceScale, 2)}（{label}）
        <input
          type="range"
          min={0.3}
          max={2.5}
          step={0.1}
          value={confidenceScale}
          onChange={(e) => setControl("confidenceScale", Number(e.target.value))}
          aria-label="確信度スケールk"
          data-testid="calibration-confidence-slider"
          className="accent-blue-600"
        />
      </label>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500">
            信頼度曲線(横軸: 予測確率p̂ / 縦軸: 実際の発生率)
          </p>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="mx-auto h-auto w-full max-w-xs"
            role="img"
            aria-label="信頼度曲線(Reliability Diagram)"
            data-testid="reliability-diagram-svg"
          >
            {/* 対角線(完全に較正されている場合の理想線) */}
            <line
              x1={sx(0)}
              y1={sy(0)}
              x2={sx(1)}
              y2={sy(1)}
              stroke="#cbd5e1"
              strokeDasharray="4 4"
              data-testid="reliability-diagonal"
            />
            {/* 軸 */}
            <line x1={sx(0)} y1={sy(0)} x2={sx(1)} y2={sy(0)} stroke="#94a3b8" />
            <line x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(1)} stroke="#94a3b8" />
            <text x={sx(0)} y={sy(0) + 14} className="fill-slate-500 text-[9px]">
              0
            </text>
            <text x={sx(1) - 8} y={sy(0) + 14} className="fill-slate-500 text-[9px]">
              1
            </text>
            <text x={sx(0) - 12} y={sy(1) + 4} className="fill-slate-500 text-[9px]">
              1
            </text>
            <text x={sx(0) - 12} y={sy(0) + 4} className="fill-slate-500 text-[9px]">
              0
            </text>

            {/* 実測の信頼度曲線 */}
            <polyline
              points={activeBins
                .map((b) => `${sx(b.forecastValue)},${sy(b.observedFreq ?? 0)}`)
                .join(" ")}
              fill="none"
              stroke="#2563eb"
              strokeWidth={2}
              data-testid="reliability-curve"
            />
            {activeBins.map((b) => (
              <circle
                key={b.binIndex}
                cx={sx(b.forecastValue)}
                cy={sy(b.observedFreq ?? 0)}
                r={round2(2 + Math.sqrt(b.count))}
                fill="#2563eb"
                data-testid={`reliability-point-${b.binIndex}`}
              />
            ))}
          </svg>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500">
            Sharpness(予測確率のヒストグラム、自信の度合い)
          </p>
          <div className="space-y-1" data-testid="sharpness-histogram">
            {bins.map((b) => (
              <div key={b.binIndex} className="flex items-center gap-2 text-xs text-slate-600">
                <span className="w-8 shrink-0 text-right font-mono">{num(b.forecastValue, 1)}</span>
                <div className="h-3 flex-1 rounded bg-slate-100">
                  <div
                    className="h-3 rounded bg-indigo-500"
                    style={{ width: `${round2((b.count / maxCount) * 100)}%` }}
                    data-testid={`sharpness-bar-${b.binIndex}`}
                  />
                </div>
                <span className="w-8 shrink-0 font-mono">{b.count}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Sharpness(分散) = <span className="font-mono">{num(sharpnessValue, 4)}</span>
            。0.5付近に集中するほど低く(曖昧)、0/1付近に散らばるほど高い(自信満々)。
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} display={false} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 sm:grid-cols-4">
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="font-semibold text-slate-500">ブライアスコア</p>
          <p className="font-mono text-sm text-slate-900">{num(brierScoreValue, 4)}</p>
        </div>
        <div className="rounded-lg bg-red-50 p-2">
          <p className="font-semibold text-red-600">信頼度エラー</p>
          <p className="font-mono text-sm text-red-800">{num(decomposition.reliability, 4)}</p>
        </div>
        <div className="rounded-lg bg-green-50 p-2">
          <p className="font-semibold text-green-600">Refinement</p>
          <p className="font-mono text-sm text-green-800">{num(decomposition.resolution, 4)}</p>
        </div>
        <div className="rounded-lg bg-slate-100 p-2">
          <p className="font-semibold text-slate-500">不確実性</p>
          <p className="font-mono text-sm text-slate-800">{num(decomposition.uncertainty, 4)}</p>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        現在、全体の発生率(基準率) ō = {pct(decomposition.baseRate)}
        。kを1から離すほど信頼度エラー(赤)が増え、ブライアスコアが悪化する——同じ「当たり外れ」でも、較正が崩れるほど確率予測としての質は落ちる。
      </p>
    </div>
  );
}
