"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { logLikelihoodTheta } from "@/lib/stats/bayesian-applications";
import { DEFAULT_ITEMS, useBayesianApplicationsStore } from "@/lib/store/bayesian-applications";
import { num, round2 } from "./format";

const FORMULA = `\\ln L(\\theta)=\\sum_{i=1}^{${term("n", "?")}}\\bigl[u_i\\ln P_i(\\theta)+(1-u_i)\\ln(1-P_i(\\theta))\\bigr]\\ \\Rightarrow\\ \\hat\\theta_{\\mathrm{MLE}}=${term(
  "thetaHat",
  "?",
)}`;

const THETA_MIN = -4;
const THETA_MAX = 4;
const COLOR_LIK = "#7c3aed";
const COLOR_MLE = "#0f172a";

const W = 340;
const H = 150;
const PAD = { top: 10, right: 14, bottom: 22, left: 26 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

function toCx(theta: number): number {
  return round2(PAD.left + ((theta - THETA_MIN) / (THETA_MAX - THETA_MIN)) * CW);
}

type ResponseValue = 0 | 1 | undefined;

/**
 * IRT尤度ラボ(Level2, 描画層/Control層)。5項目それぞれについて「正解/不正解/未回答」を
 * トグルすると、回答パターンから求まる尤度曲線(θを横軸に正規化した相対尤度)と
 * 最尤推定値θ_MLE(ピーク位置)がリアルタイムに更新される。回答数が増えるほど曲線が尖っていく様子
 * (K-1のベータ事後分布が痩せていく話と同じ「データが増えるほど不確実性が減る」構造)を確認する。
 */
export function IrtLikelihoodLab() {
  const itemResponses = useBayesianApplicationsStore((s) => s.controls.itemResponses);
  const likelihood = useBayesianApplicationsStore((s) => s.derived.likelihood);
  const mleThetaEstimate = useBayesianApplicationsStore((s) => s.derived.mleThetaEstimate);
  const answered = useBayesianApplicationsStore((s) => s.derived.answered);
  const correct = useBayesianApplicationsStore((s) => s.derived.correct);
  const setControl = useBayesianApplicationsStore((s) => s.setControl);

  const setResponse = (index: number, value: ResponseValue) => {
    const next = [...itemResponses];
    next[index] = next[index] === value ? undefined : value;
    setControl("itemResponses", next);
  };

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("n", String(answered));
    m.setValue("thetaHat", answered > 0 ? formatNumber(mleThetaEstimate, 2) : "\\text{—}");
    m.setHighlight("thetaHat", answered > 0, COLOR_MLE);
  }, [answered, mleThetaEstimate]);

  const logLikAtMle =
    answered > 0 ? logLikelihoodTheta(mleThetaEstimate, DEFAULT_ITEMS, itemResponses) : null;

  return (
    <div id="irt-likelihood-lab" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        5問(困難度が易しい→難しい順)それぞれについて「正解/不正解」をタップすると、
        その回答パターンから求まる尤度曲線が更新される。ピークの位置が最尤推定値θ(MLE)。
      </p>

      <div className="flex flex-wrap justify-center gap-2">
        {DEFAULT_ITEMS.map((item, i) => {
          const value = itemResponses[i];
          return (
            <div key={item.id} className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 p-2" data-testid={`item-toggle-${i}`}>
              <span className="text-[10px] text-slate-500">{item.label}</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setResponse(i, 1)}
                  aria-pressed={value === 1}
                  data-testid={`item-correct-${i}`}
                  className={`rounded px-2 py-1 text-xs font-semibold ${
                    value === 1 ? "bg-green-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-green-50"
                  }`}
                >
                  正解
                </button>
                <button
                  type="button"
                  onClick={() => setResponse(i, 0)}
                  aria-pressed={value === 0}
                  data-testid={`item-incorrect-${i}`}
                  className={`rounded px-2 py-1 text-xs font-semibold ${
                    value === 0 ? "bg-red-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-red-50"
                  }`}
                >
                  不正解
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center text-sm text-slate-600" data-testid="irt-summary">
        回答数 {answered}/{DEFAULT_ITEMS.length}・正答数 {correct}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-md" role="img" aria-label="回答パターンから求めた尤度曲線" data-testid="likelihood-svg">
        <line x1={PAD.left} y1={PAD.top + CH} x2={W - PAD.right} y2={PAD.top + CH} stroke="#cbd5e1" />
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + CH} stroke="#cbd5e1" />
        <polyline
          points={likelihood.map((p) => `${toCx(p.theta)},${round2(PAD.top + CH - p.lik * CH)}`).join(" ")}
          fill="none"
          stroke={COLOR_LIK}
          strokeWidth={2.5}
          data-testid="likelihood-curve"
        />
        {answered > 0 ? (
          <line
            x1={toCx(mleThetaEstimate)}
            y1={PAD.top}
            x2={toCx(mleThetaEstimate)}
            y2={PAD.top + CH}
            stroke={COLOR_MLE}
            strokeDasharray="3 2"
            data-testid="mle-marker"
          />
        ) : null}
        {[THETA_MIN, 0, THETA_MAX].map((t) => (
          <text key={t} x={toCx(t)} y={PAD.top + CH + 14} textAnchor="middle" className="fill-slate-500 text-[9px]">
            {t}
          </text>
        ))}
      </svg>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} display={false} />
      </div>
      {logLikAtMle !== null ? (
        <p className="text-center text-xs text-slate-400">ln L(θ(MLE)) = {num(logLikAtMle, 3)}</p>
      ) : null}

      <Callout
        title="回答が増えるほど尤度曲線は尖る"
        body="1問だけ答えた状態では、その正誤と整合するθの範囲が広く尤度曲線はなだらか。問題を増やすほど«どのθが一番説明力が高いか»が絞り込まれ、曲線が尖ってθ(MLE)の推定が安定する——K-1で見た«観測が増えるほど事後分布が痩せる»のと同じ現象。"
        note="難しい問題(bが大きい)に正解すると能力の高い側に、易しい問題を落とすと能力の低い側にθ(MLE)が動く。"
        kind="explain"
      />
    </div>
  );
}
