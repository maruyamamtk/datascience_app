"use client";

import { useEffect, useMemo, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { weightedLikelihoodCurves } from "@/lib/stats/bayesian-basics";
import { DISC_CLASS0, DISC_CLASS1, DISC_X_MAX, DISC_X_MIN, useBayesianBasicsStore } from "@/lib/store/bayesian-basics";
import { num, pct, round2 } from "./format";

const FORMULA = `P(1\\mid x)=\\dfrac{${term("prior1", "?")}\\times${term(
  "l1",
  "?",
)}}{${term("prior1b", "?")}\\times${term("l1b", "?")}+${term("prior0", "?")}\\times${term(
  "l0",
  "?",
)}}=${term("post", "?")}`;

const COLOR_CLASS0 = "#0891b2";
const COLOR_CLASS1 = "#dc2626";

const W = 340;
const H = 170;
const PAD = { top: 10, right: 14, bottom: 22, left: 14 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

/**
 * ベイズ判別ラボ(Level2, 描画層/Control層)。1特徴量x(例: 検査値)を持つ2クラスについて、
 * 事前確率×尤度(ガウス密度)を重ねて描き、その交点が決定境界になることを示す
 * ——事前確率のスライダーを動かすと境界が動く様子と、任意のxでの事後確率を確認できる。
 */
export function BayesianDiscriminantLab() {
  const prior1 = useBayesianBasicsStore((s) => s.controls.discPrior1);
  const x = useBayesianBasicsStore((s) => s.controls.discX);
  const posterior = useBayesianBasicsStore((s) => s.derived.discPosterior);
  const boundaries = useBayesianBasicsStore((s) => s.derived.discBoundaries);
  const setControl = useBayesianBasicsStore((s) => s.setControl);

  const curve = useMemo(
    () => weightedLikelihoodCurves(prior1, DISC_CLASS0, DISC_CLASS1, DISC_X_MIN, DISC_X_MAX),
    [prior1],
  );
  const maxY = Math.max(0.05, ...curve.map((p) => Math.max(p.w0, p.w1)));

  const toCx = (v: number) => round2(PAD.left + ((v - DISC_X_MIN) / (DISC_X_MAX - DISC_X_MIN)) * CW);
  const toCy = (v: number) => round2(PAD.top + CH - (v / maxY) * CH);
  const pathFor = (key: "w0" | "w1") => curve.map((p) => `${toCx(p.x)},${toCy(p[key])}`).join(" ");

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    const class0Likelihood =
      (1 / (DISC_CLASS0.sd * Math.sqrt(2 * Math.PI))) *
      Math.exp(-0.5 * ((x - DISC_CLASS0.mean) / DISC_CLASS0.sd) ** 2);
    const class1Likelihood =
      (1 / (DISC_CLASS1.sd * Math.sqrt(2 * Math.PI))) *
      Math.exp(-0.5 * ((x - DISC_CLASS1.mean) / DISC_CLASS1.sd) ** 2);
    m.setValue("prior1", formatNumber(prior1, 2));
    m.setValue("prior1b", formatNumber(prior1, 2));
    m.setValue("prior0", formatNumber(1 - prior1, 2));
    m.setValue("l1", formatNumber(class1Likelihood, 4));
    m.setValue("l1b", formatNumber(class1Likelihood, 4));
    m.setValue("l0", formatNumber(class0Likelihood, 4));
    m.setValue("post", pct(posterior, 1));
    m.setHighlight("post", true, posterior >= 0.5 ? COLOR_CLASS1 : COLOR_CLASS0);
  }, [prior1, x, posterior]);

  return (
    <div id="bayesian-discriminant-lab" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        特徴量xを持つ2クラス(クラス0: 平均{DISC_CLASS0.mean}・クラス1: 平均{DISC_CLASS1.mean}、
        いずれもガウス分布)について、事前確率×尤度が交わる場所が決定境界になる。
        事前確率(クラス1をどれだけ「ありそう」と思うか)を上げると、境界がクラス0側へ動く。
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          クラス1の事前確率 = {pct(prior1, 0)}
          <input
            type="range"
            min={0.05}
            max={0.95}
            step={0.05}
            value={prior1}
            onChange={(e) => setControl("discPrior1", Number(e.target.value))}
            aria-label="クラス1の事前確率"
            data-testid="disc-prior1-slider"
            className="accent-red-600"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          特徴量 x = {num(x, 1)}
          <input
            type="range"
            min={DISC_X_MIN}
            max={DISC_X_MAX}
            step={0.1}
            value={x}
            onChange={(e) => setControl("discX", Number(e.target.value))}
            aria-label="特徴量xの値"
            data-testid="disc-x-slider"
            className="accent-slate-700"
          />
        </label>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-md" role="img" aria-label="事前確率×尤度の曲線と決定境界" data-testid="disc-svg">
        <line x1={PAD.left} y1={PAD.top + CH} x2={W - PAD.right} y2={PAD.top + CH} stroke="#cbd5e1" />
        <polyline points={pathFor("w0")} fill="none" stroke={COLOR_CLASS0} strokeWidth={2} data-testid="disc-curve-class0" />
        <polyline points={pathFor("w1")} fill="none" stroke={COLOR_CLASS1} strokeWidth={2} data-testid="disc-curve-class1" />
        {boundaries.map((b, i) => (
          <line key={i} x1={toCx(b)} y1={PAD.top} x2={toCx(b)} y2={PAD.top + CH} stroke="#0f172a" strokeDasharray="3 2" data-testid={`disc-boundary-${i}`} />
        ))}
        <line x1={toCx(x)} y1={PAD.top} x2={toCx(x)} y2={PAD.top + CH} stroke="#16a34a" strokeWidth={2} data-testid="disc-x-marker" />
        <text x={toCx(x)} y={PAD.top - 2} textAnchor="middle" className="fill-green-700 text-[9px] font-bold">
          x
        </text>
      </svg>
      <div className="flex flex-wrap justify-center gap-4 text-[11px]">
        <span className="flex items-center gap-1"><span className="h-2 w-4 rounded-full" style={{ background: COLOR_CLASS0 }} />クラス0の事前×尤度</span>
        <span className="flex items-center gap-1"><span className="h-2 w-4 rounded-full" style={{ background: COLOR_CLASS1 }} />クラス1の事前×尤度</span>
        <span className="flex items-center gap-1"><span className="h-2 w-4 rounded-full bg-slate-900" />決定境界</span>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} display={false} />
      </div>

      <p className="text-center text-sm" data-testid="disc-decision">
        x = {num(x, 1)} の予測クラス:{" "}
        <span className={`font-bold ${posterior >= 0.5 ? "text-red-700" : "text-cyan-700"}`}>
          {posterior >= 0.5 ? "クラス1" : "クラス0"}
        </span>
        (事後確率 {pct(posterior, 1)})
      </p>

      <Callout
        title="事前確率を変えると「同じ観測x」でも判定が変わりうる"
        body="事前確率を五分五分(50%)から動かすと、境界(点線)が移動する。境界の内側にあったxが、事前確率を変えるだけで反対のクラスに判定されることがある——尤度(データからの情報)は同じでも、事前知識次第で結論が変わるのがベイズ判別の特徴。"
        note="ナイーブベイズ(単純ベイズ・近傍トピック)は特徴量が複数ある場合にこの考え方を拡張したもの——骨格(事後確率が最大のクラスを選ぶ)は同じ。"
        kind="supplement"
      />
    </div>
  );
}
