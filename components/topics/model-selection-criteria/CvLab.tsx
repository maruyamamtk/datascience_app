"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { FOLD_CHOICES, useModelSelectionCriteriaStore } from "@/lib/store/model-selection-criteria";
import { num, round2 } from "./format";

const FORMULA = `\\mathrm{CV\\text{-}MSE}(k)=\\dfrac{1}{n}\\sum_{i=1}^{n}\\big(y_i-\\hat y_{-\\mathrm{fold}(i)}(x_i)\\big)^2,\\qquad \\mathrm{CV\\text{-}MSE}(${term(
  "cv_k",
  "?",
)})=${term("cv_val", "?")}`;

const W = 300;
const H = 160;
const PAD = { top: 14, right: 14, bottom: 22, left: 34 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

/**
 * CvLab(Level2): 情報量規準(AIC/BIC/Cp)とは全く別ルートである
 * k分割交差検証(実際に「学習に使っていないデータ」への予測誤差を測る)で
 * モデルサイズを比較する。分割数を切り替えても、最良のモデルサイズが
 * 概ね同じ(このデータではBIC・Cpと同じk)であることを確認する。
 */
export function CvLab() {
  const selectedK = useModelSelectionCriteriaStore((s) => s.controls.selectedK);
  const foldCount = useModelSelectionCriteriaStore((s) => s.controls.foldCount);
  const d = useModelSelectionCriteriaStore((s) => s.derived);
  const setControl = useModelSelectionCriteriaStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);

  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("cv_k", String(selectedK));
    m.setValue("cv_val", formatNumber(d.cvMse[selectedK] ?? Number.NaN, 3));
    m.setHighlight("cv_val", selectedK === d.cvBestK, "#0d9488");
  }, [selectedK, d.cvMse, d.cvBestK]);

  const maxMse = Math.max(...d.cvMse);
  const cx = (k: number) => round2(PAD.left + (k / (d.cvMse.length - 1)) * CW);
  const cy = (v: number) => round2(PAD.top + CH - (v / maxMse) * CH);
  const path = d.cvMse.map((v, k) => `${cx(k)},${cy(v)}`).join(" ");

  return (
    <div id="model-selection-criteria-cv-lab" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        情報量規準は「同じデータで当てはめてから罰則を引く」計算だが、交差検証は
        「学習に使わなかったデータでどれだけ正確に予測できるか」を直接測る、全く別ルートの評価法。
        分割数を切り替えて、最良のモデルサイズが安定しているか確認しよう。
      </p>

      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="分割数を選択">
        {FOLD_CHOICES.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setControl("foldCount", f)}
            aria-pressed={foldCount === f}
            data-testid={`fold-select-${f}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              foldCount === f
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f}分割
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-sm" role="img" aria-label="モデルサイズごとの交差検証MSE">
          <line x1={PAD.left} y1={PAD.top + CH} x2={W - PAD.right} y2={PAD.top + CH} stroke="#cbd5e1" />
          <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + CH} stroke="#cbd5e1" />
          <polyline points={path} fill="none" stroke="#0d9488" strokeWidth={2} data-testid="cv-curve" />
          {d.cvMse.map((v, k) => (
            <circle
              key={k}
              cx={cx(k)}
              cy={cy(v)}
              r={k === d.cvBestK ? 5 : k === selectedK ? 4 : 2.5}
              fill="#0d9488"
              stroke={k === selectedK ? "#0f172a" : "#fff"}
              strokeWidth={1.5}
              onClick={() => setControl("selectedK", k)}
              className="cursor-pointer"
              data-testid={`cv-point-${k}`}
            />
          ))}
          {d.cvMse.map((_, k) => (
            <text key={`l-${k}`} x={cx(k)} y={PAD.top + CH + 14} textAnchor="middle" className="fill-slate-500 text-[9px]">
              {k}
            </text>
          ))}
          <text x={2} y={PAD.top + 8} className="fill-slate-400 text-[9px]">
            MSE↑
          </text>
        </svg>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} display={false} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <Stat label="交差検証が選ぶk" value={`k=${d.cvBestK}`} color="#0d9488" />
        <Stat label="BICが選ぶk" value={`k=${d.bicBest.k}`} color="#7c3aed" />
        <Stat label="AICが選ぶk" value={`k=${d.aicBest.k}`} color="#2563eb" />
      </div>

      <Callout
        title={
          d.cvBestK === d.bicBest.k
            ? "この分割数では、交差検証が選ぶモデルサイズはBIC・Cpと一致する"
            : "この分割数では、交差検証が選ぶモデルサイズはBIC・Cpと異なる"
        }
        body={`現在(${foldCount}分割)のCV-MSE最小はk=${d.cvBestK}(値=${num(d.cvMse[d.cvBestK], 3)})。情報量規準とは全く別の計算(実際にデータを分けて予測させる)で求めたのに、近い答えにたどり着くことが多い。`}
        note="分割数を変えるとCV-MSEの値自体は少し変わるが、«どのモデルサイズが良いか»という結論はおおむね安定していることを確認しよう(データが少ないほど分割数による揺れは大きくなる)。"
        kind="supplement"
      />
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-2">
      <div className="font-mono text-sm font-semibold" style={{ color }}>
        {value}
      </div>
      <div className="text-slate-500">{label}</div>
    </div>
  );
}
