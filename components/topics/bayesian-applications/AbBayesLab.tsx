"use client";

import { useEffect, useMemo, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { betaPdfCurve } from "@/lib/stats/bayesian-applications";
import { useBayesianApplicationsStore } from "@/lib/store/bayesian-applications";
import { num, pct, round2 } from "./format";

const FORMULA = `\\theta_A\\sim\\mathrm{Beta}(${term("aA", "?")},${term("bA", "?")}),\\quad\\theta_B\\sim\\mathrm{Beta}(${term(
  "aB",
  "?",
)},${term("bB", "?")})\\quad\\Rightarrow\\quad \\hat P(\\theta_B>\\theta_A)=${term("pHat", "?")}`;

const COLOR_A = "#64748b";
const COLOR_B = "#2563eb";

const W = 320;
const H = 170;
const PAD = { top: 10, right: 14, bottom: 22, left: 30 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

function pathFor(curve: { x: number; y: number }[], maxY: number): string {
  return curve
    .map(({ x, y }) => {
      const cx = round2(PAD.left + x * CW);
      const cy = round2(PAD.top + CH - (Math.min(y, maxY) / maxY) * CH);
      return `${cx},${cy}`;
    })
    .join(" ");
}

/**
 * ベイズA/Bテスト・メインラボ(Level0の中核可視化, 描画層/Control層)。
 * A・B各バリアントのコンバージョン数/試行数をスライダーで操作すると、
 * それぞれの事後分布(ベータ分布)の曲線が重なって描かれ、モンテカルロで推定した
 * P(θ_B>θ_A)・期待損失がリアルタイムに更新される。頻度論の2標本比率検定(同じデータ)の
 * 結論(p値・有意/非有意)も並べて表示し、«確率で語るか・二分で語るか»の対比を体感する。
 */
export function AbBayesLab() {
  const successesA = useBayesianApplicationsStore((s) => s.controls.successesA);
  const trialsA = useBayesianApplicationsStore((s) => s.controls.trialsA);
  const successesB = useBayesianApplicationsStore((s) => s.controls.successesB);
  const trialsB = useBayesianApplicationsStore((s) => s.controls.trialsB);
  const posteriorA = useBayesianApplicationsStore((s) => s.derived.posteriorA);
  const posteriorB = useBayesianApplicationsStore((s) => s.derived.posteriorB);
  const mcResult = useBayesianApplicationsStore((s) => s.derived.mcResult);
  const freqResult = useBayesianApplicationsStore((s) => s.derived.freqResult);
  const patchControls = useBayesianApplicationsStore((s) => s.patchControls);

  const curveA = useMemo(() => betaPdfCurve(posteriorA), [posteriorA]);
  const curveB = useMemo(() => betaPdfCurve(posteriorB), [posteriorB]);
  const maxY = Math.max(2, ...curveA.map((p) => p.y), ...curveB.map((p) => p.y));

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("aA", formatNumber(posteriorA.alpha, 0));
    m.setValue("bA", formatNumber(posteriorA.beta, 0));
    m.setValue("aB", formatNumber(posteriorB.alpha, 0));
    m.setValue("bB", formatNumber(posteriorB.beta, 0));
    m.setValue("pHat", pct(mcResult.probBBeatsA, 1));
    m.setHighlight("pHat", true, mcResult.probBBeatsA >= 0.5 ? COLOR_B : COLOR_A);
  }, [posteriorA, posteriorB, mcResult]);

  const pRejects = freqResult.pValue < 0.05;

  return (
    <div id="ab-bayes-lab" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        A案・B案それぞれの「訪問者数のうちコンバージョンした数」を動かすと、コンバージョン率θの事後分布(ベータ分布)が
        重なって描かれる。灰色がA、青がB。モンテカルロ法で「Bの方が優れている確率 P(θ_B&gt;θ_A)」と、
        誤った方を選んだときの期待損失を推定する。
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2 rounded-xl bg-slate-50 p-3">
          <div className="text-sm font-semibold text-slate-700">A案</div>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            訪問者数 n_A = {trialsA}
            <input
              type="range"
              min={5}
              max={120}
              step={1}
              value={trialsA}
              onChange={(e) => {
                const n = Number(e.target.value);
                patchControls({ trialsA: n, successesA: Math.min(successesA, n) });
              }}
              aria-label="A案の訪問者数"
              data-testid="trials-a-slider"
              className="accent-slate-600"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            コンバージョン数 x_A = {successesA}
            <input
              type="range"
              min={0}
              max={trialsA}
              step={1}
              value={successesA}
              onChange={(e) => patchControls({ successesA: Number(e.target.value) })}
              aria-label="A案のコンバージョン数"
              data-testid="successes-a-slider"
              className="accent-slate-600"
            />
          </label>
          <div className="text-xs text-slate-500">観測率 = {pct(trialsA > 0 ? successesA / trialsA : 0, 1)}</div>
        </div>

        <div className="space-y-2 rounded-xl bg-blue-50 p-3">
          <div className="text-sm font-semibold text-blue-700">B案</div>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            訪問者数 n_B = {trialsB}
            <input
              type="range"
              min={5}
              max={120}
              step={1}
              value={trialsB}
              onChange={(e) => {
                const n = Number(e.target.value);
                patchControls({ trialsB: n, successesB: Math.min(successesB, n) });
              }}
              aria-label="B案の訪問者数"
              data-testid="trials-b-slider"
              className="accent-blue-600"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            コンバージョン数 x_B = {successesB}
            <input
              type="range"
              min={0}
              max={trialsB}
              step={1}
              value={successesB}
              onChange={(e) => patchControls({ successesB: Number(e.target.value) })}
              aria-label="B案のコンバージョン数"
              data-testid="successes-b-slider"
              className="accent-blue-600"
            />
          </label>
          <div className="text-xs text-slate-500">観測率 = {pct(trialsB > 0 ? successesB / trialsB : 0, 1)}</div>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mx-auto h-auto w-full max-w-md"
        role="img"
        aria-label="AとBの事後分布(ベータ曲線)の重ね描き"
        data-testid="ab-posterior-svg"
      >
        <line x1={PAD.left} y1={PAD.top + CH} x2={W - PAD.right} y2={PAD.top + CH} stroke="#cbd5e1" />
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + CH} stroke="#cbd5e1" />
        <polyline points={pathFor(curveA, maxY)} fill="none" stroke={COLOR_A} strokeWidth={2} data-testid="curve-a" />
        <polyline points={pathFor(curveB, maxY)} fill="none" stroke={COLOR_B} strokeWidth={2.5} data-testid="curve-b" />
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <text key={t} x={round2(PAD.left + t * CW)} y={PAD.top + CH + 14} textAnchor="middle" className="fill-slate-500 text-[9px]">
            {t}
          </text>
        ))}
        <text x={W / 2} y={H - 2} textAnchor="middle" className="fill-slate-400 text-[9px]">
          θ(コンバージョン率)
        </text>
      </svg>
      <div className="flex flex-wrap justify-center gap-4 text-[11px]">
        <span className="flex items-center gap-1"><span className="h-2 w-4 rounded-full" style={{ background: COLOR_A }} />A案の事後分布</span>
        <span className="flex items-center gap-1"><span className="h-2 w-4 rounded-full" style={{ background: COLOR_B }} />B案の事後分布</span>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} display={false} />
      </div>

      <div className="grid grid-cols-1 gap-3 text-center text-sm sm:grid-cols-3">
        <div className="rounded-lg bg-blue-50 px-3 py-2" data-testid="prob-b-beats-a">
          <div className="font-semibold text-blue-700">P(θ_B&gt;θ_A)</div>
          <div className="mt-1 text-lg font-bold text-blue-900">{pct(mcResult.probBBeatsA, 1)}</div>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2" data-testid="expected-loss-choose-a">
          <div className="font-semibold text-slate-700">Aを選ぶ期待損失</div>
          <div className="mt-1 text-lg font-bold text-slate-900">{num(mcResult.expectedLossChooseA, 4)}</div>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2" data-testid="expected-loss-choose-b">
          <div className="font-semibold text-slate-700">Bを選ぶ期待損失</div>
          <div className="mt-1 text-lg font-bold text-slate-900">{num(mcResult.expectedLossChooseB, 4)}</div>
        </div>
      </div>

      <div className="rounded-lg bg-amber-50 px-3 py-2 text-center text-sm" data-testid="freq-contrast">
        <span className="font-semibold text-amber-800">頻度論(同じデータ)との対比: </span>
        <span className="text-amber-900">
          両側p値 = {pct(freqResult.pValue, 2)}({pRejects ? "α=5%で有意" : "α=5%で有意でない"})——
          頻度論は「有意/非有意」の二分だが、ベイズは「B案が優れている確率は{pct(mcResult.probBBeatsA, 1)}」と直接答える。
        </span>
      </div>

      <Callout
        title="P(B>A)と期待損失は補い合う"
        body="P(B>A)は«どちらが優れているか»の確率、期待損失は«判断を間違えたときにどれだけ損するか»の大きさ。P(B>A)が60%程度でも、期待損失がごく小さければ«どちらを選んでも大差ない»と判断してよい——これがベイズA/Bテストで早期に意思決定できる理由。"
        note="訪問者数を増やす（両方のスライダーを右へ）と、2本の曲線が痩せて重なりが減り、P(B>A)は0または1に近づいていく。"
        kind="explain"
      />
    </div>
  );
}
