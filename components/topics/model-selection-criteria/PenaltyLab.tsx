"use client";

import { useEffect, useRef, useState } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { bicPenaltyExceedsAic, penaltyGap } from "@/lib/stats/model-selection-criteria";
import { round2 } from "./format";

const FORMULA = `\\text{AICの罰則}=2,\\qquad \\text{BICの罰則}=\\log ${term("pen_n", "?")}=${term(
  "pen_logn",
  "?",
)}`;

const N_MIN = 2;
const N_MAX = 60;
const N_OBS_DEFAULT = 24;
/** log n = 2 ⟺ n = e² ≈ 7.389(高校数学: 対数の定義から指数に戻すだけで示せる)。 */
const CROSSOVER_N = Math.E ** 2;

const W = 320;
const H = 140;
const PAD = { top: 10, right: 14, bottom: 22, left: 30 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;
const Y_MAX = Math.log(N_MAX) + 0.5;

/**
 * PenaltyLab(Level1・Derivationの操作): 標本サイズnを動かして、
 * AICのパラメータ1個あたりの罰則(定数2)とBICの罰則(log n)を比較する。
 * n=e²≈7.39を境にBICの罰則がAICを上回ることを、スライダーとグラフ・数式の
 * 強連動で確かめる(高校数学の対数・指数への橋渡し)。
 * このトピック固有の独立した小さな概念(標本サイズという別の軸)を扱うため、
 * メインのモデル選択データセットとは独立したローカルstateで持つ
 * (MetricsQuiz等、既存トピックの自己完結ウィジェットと同じ扱い)。
 */
export function PenaltyLab() {
  const [n, setN] = useState(N_OBS_DEFAULT);
  const exceeds = bicPenaltyExceedsAic(n);
  const gap = penaltyGap(n);
  const logN = Math.log(n);

  const mathRef = useRef<MathFormulaHandle>(null);

  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("pen_n", String(n));
    m.setValue("pen_logn", formatNumber(logN, 3));
    m.setHighlight("pen_logn", exceeds, "#7c3aed");
  }, [n, logN, exceeds]);

  const cx = (v: number) => round2(PAD.left + ((v - N_MIN) / (N_MAX - N_MIN)) * CW);
  const cy = (v: number) => round2(PAD.top + CH - (v / Y_MAX) * CH);

  const curvePoints = Array.from({ length: N_MAX - N_MIN + 1 }, (_, i) => {
    const x = N_MIN + i;
    return `${cx(x)},${cy(Math.log(x))}`;
  }).join(" ");

  return (
    <div id="model-selection-criteria-penalty-lab" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        標本サイズnを動かすと、BICのパラメータ1個あたりの罰則(log n)がAICの罰則(定数2)をどう追い越すかが分かる。
      </p>

      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-slate-500">n=</span>
        <input
          type="range"
          min={N_MIN}
          max={N_MAX}
          step={1}
          value={n}
          onChange={(e) => setN(Number(e.target.value))}
          aria-label="標本サイズn"
          data-testid="penalty-n-slider"
          className="w-full accent-slate-900"
        />
        <span className="w-10 shrink-0 text-right font-mono text-sm font-semibold text-slate-700" data-testid="penalty-n-value">
          {n}
        </span>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-md" role="img" aria-label="AICとBICの罰則の比較">
          <line x1={PAD.left} y1={PAD.top + CH} x2={W - PAD.right} y2={PAD.top + CH} stroke="#cbd5e1" />
          <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + CH} stroke="#cbd5e1" />
          <line x1={PAD.left} y1={cy(2)} x2={W - PAD.right} y2={cy(2)} stroke="#2563eb" strokeDasharray="4 3" data-testid="penalty-aic-line" />
          <text x={W - PAD.right - 60} y={cy(2) - 4} className="fill-blue-600 text-[9px]">
            AICの罰則=2
          </text>
          <polyline points={curvePoints} fill="none" stroke="#7c3aed" strokeWidth={2} data-testid="penalty-bic-curve" />
          <line
            x1={cx(CROSSOVER_N)}
            y1={PAD.top}
            x2={cx(CROSSOVER_N)}
            y2={PAD.top + CH}
            stroke="#94a3b8"
            strokeDasharray="2 2"
          />
          <text x={cx(CROSSOVER_N) + 3} y={PAD.top + 10} className="fill-slate-500 text-[9px]">
            e²≈7.39
          </text>
          <circle cx={cx(n)} cy={cy(logN)} r={5} fill="#7c3aed" stroke="#fff" strokeWidth={1.5} data-testid="penalty-current-point" />
          <text x={PAD.left} y={H - 6} className="fill-slate-400 text-[9px]">
            n→
          </text>
          <text x={2} y={PAD.top + 8} className="fill-slate-400 text-[9px]">
            罰則↑
          </text>
        </svg>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} display={false} />
      </div>

      <Callout
        title={exceeds ? `n=${n}ではBICの罰則の方が大きい(差=${formatNumber(gap, 3)})` : `n=${n}ではAICの罰則の方が大きい(差=${formatNumber(-gap, 3)})`}
        body="log n > 2 を高校数学の指数・対数の関係(log n = 2 ⟺ n = e²)で解くと、境目はn=e²≈7.39になる。"
        note="標本サイズが8以上ある«ふつうの»データでは、BICは常にAICよりパラメータ1個あたりの罰則が大きい——だからBICはAICより小さい(単純な)モデルを選びやすい傾向がある。"
        kind="explain"
      />
    </div>
  );
}
