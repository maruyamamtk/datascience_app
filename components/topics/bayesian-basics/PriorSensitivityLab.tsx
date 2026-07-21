"use client";

import { COIN_SEQUENCE } from "@/lib/stats/bayesian-basics";
import { useBayesianBasicsStore } from "@/lib/store/bayesian-basics";
import { num, round2 } from "./format";

const COLOR_WEAK = "#94a3b8";
const COLOR_CHOSEN = "#2563eb";
const COLOR_STRONG = "#ea580c";

const W = 320;
const H = 170;
const PAD = { top: 10, right: 14, bottom: 22, left: 30 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;
const N = COIN_SEQUENCE.length;

function pathFor(values: number[]): string {
  return values
    .map((v, i) => {
      const x = round2(PAD.left + (i / N) * CW);
      const y = round2(PAD.top + CH - v * CH);
      return `${x},${y}`;
    })
    .join(" ");
}

/**
 * 事前分布の感度ラボ(Level1, 描画層/Control層)。
 * 同じ観測列(コイン投げ10回)に対して、弱い事前分布Beta(1,1)・強い事前分布Beta(20,20)・
 * 操作可能な「選択した」事前分布Beta(w,w)の3通りで事後平均の推移を重ねて描く。
 * データが増えるほど3本の曲線が同じ値へ収束していく様子(事前分布の影響が薄れる)を体感する。
 */
export function PriorSensitivityLab() {
  const weight = useBayesianBasicsStore((s) => s.controls.sensitivityWeight);
  const weak = useBayesianBasicsStore((s) => s.derived.weakTrajectory);
  const chosen = useBayesianBasicsStore((s) => s.derived.chosenTrajectory);
  const strong = useBayesianBasicsStore((s) => s.derived.strongTrajectory);
  const setControl = useBayesianBasicsStore((s) => s.setControl);

  return (
    <div id="prior-sensitivity-lab" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        同じ10投の観測列に対し、弱い事前分布 Beta(1,1)・強い事前分布 Beta(20,20)・
        あなたが選んだ事前分布 Beta(w,w) の3通りで、事後平均が観測数nとともにどう動くかを比較する。
      </p>

      <label className="flex flex-col gap-1 text-sm text-slate-700">
        選択した事前分布の重み w = {num(weight, 1)}(Beta({num(weight, 1)}, {num(weight, 1)}))
        <input
          type="range"
          min={0.5}
          max={30}
          step={0.5}
          value={weight}
          onChange={(e) => setControl("sensitivityWeight", Number(e.target.value))}
          aria-label="選択した事前分布の重みw"
          data-testid="sensitivity-weight-slider"
          className="accent-blue-600"
        />
      </label>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mx-auto h-auto w-full max-w-md"
        role="img"
        aria-label="事後平均の推移(観測数nに対する感度)"
        data-testid="sensitivity-svg"
      >
        <line x1={PAD.left} y1={PAD.top + CH} x2={W - PAD.right} y2={PAD.top + CH} stroke="#cbd5e1" />
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + CH} stroke="#cbd5e1" />
        <line
          x1={PAD.left}
          y1={round2(PAD.top + CH - 0.5 * CH)}
          x2={W - PAD.right}
          y2={round2(PAD.top + CH - 0.5 * CH)}
          stroke="#e2e8f0"
          strokeDasharray="2 2"
        />
        <polyline points={pathFor(weak)} fill="none" stroke={COLOR_WEAK} strokeWidth={2} strokeDasharray="4 3" data-testid="trajectory-weak" />
        <polyline points={pathFor(strong)} fill="none" stroke={COLOR_STRONG} strokeWidth={2} strokeDasharray="4 3" data-testid="trajectory-strong" />
        <polyline points={pathFor(chosen)} fill="none" stroke={COLOR_CHOSEN} strokeWidth={2.5} data-testid="trajectory-chosen" />
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <text key={t} x={2} y={round2(PAD.top + CH - t * CH) + 3} className="fill-slate-500 text-[8px]">
            {t}
          </text>
        ))}
        <text x={W / 2} y={H - 2} textAnchor="middle" className="fill-slate-400 text-[9px]">
          観測数 n(0〜{N})
        </text>
      </svg>
      <div className="flex flex-wrap justify-center gap-4 text-[11px]">
        <span className="flex items-center gap-1"><span className="h-2 w-4 rounded-full" style={{ background: COLOR_WEAK }} />弱い事前分布 Beta(1,1): {num(weak[weak.length - 1], 2)}</span>
        <span className="flex items-center gap-1"><span className="h-2 w-4 rounded-full" style={{ background: COLOR_CHOSEN }} />選択した Beta(w,w): {num(chosen[chosen.length - 1], 2)}</span>
        <span className="flex items-center gap-1"><span className="h-2 w-4 rounded-full" style={{ background: COLOR_STRONG }} />強い事前分布 Beta(20,20): {num(strong[strong.length - 1], 2)}</span>
      </div>
      <p className="text-xs leading-relaxed text-slate-500">
        wを大きくするほど最初の平均は0.5に近い位置から動きにくくなるが、10投すべてを観測したあとの3本の値は互いに近づく——
        観測数が増えるほど尤度の影響が事前分布の影響を上回っていくため。
      </p>
    </div>
  );
}
