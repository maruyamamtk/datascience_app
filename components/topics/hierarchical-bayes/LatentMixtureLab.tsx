"use client";

import { useEffect, useMemo, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { term } from "@/components/math/tex";
import { normalPdf } from "@/lib/stats/normal";
import {
  DEFAULT_MIXTURE,
  DEFAULT_MIXTURE_DATA,
  LATENT_X_MAX,
  LATENT_X_MIN,
  useHierarchicalBayesStore,
} from "@/lib/store/hierarchical-bayes";
import { num, pct, round2 } from "./format";

const FORMULA = `P(z{=}1\\mid x)=\\dfrac{${term("w1", "?")}\\times${term(
  "l1",
  "?",
)}}{${term("w1b", "?")}\\times${term("l1b", "?")}+${term("w2", "?")}\\times${term(
  "l2",
  "?",
)}}=${term("post", "?")}`;

const COLOR_C0 = "#0891b2";
const COLOR_C1 = "#dc2626";

const W = 340;
const H = 190;
const PAD = { top: 10, right: 14, bottom: 40, left: 14 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;
const N_CURVE_POINTS = 80;

/**
 * 潜在変数モデルラボ(Level2の中核可視化, 描画層/Control層)。
 * 直接観測できない離散変数z(2成分のうちどちらから生成されたか)を、
 * ベイズの定理で「観測値xを見た後の所属確率」として推定する最小の具体例。
 * 観測値xスライダーを動かすと、2つの密度曲線上のxの位置と、
 * その事後所属確率(responsibility)が連動して変わる。
 */
export function LatentMixtureLab() {
  const x = useHierarchicalBayesStore((s) => s.controls.latentX);
  const probs = useHierarchicalBayesStore((s) => s.derived.latentProbs);
  const setControl = useHierarchicalBayesStore((s) => s.setControl);

  const [c0, c1] = DEFAULT_MIXTURE;

  const curve = useMemo(() => {
    const pts: { x: number; d0: number; d1: number }[] = [];
    for (let i = 0; i <= N_CURVE_POINTS; i++) {
      const xv = LATENT_X_MIN + ((LATENT_X_MAX - LATENT_X_MIN) * i) / N_CURVE_POINTS;
      pts.push({
        x: xv,
        d0: c0.weight * normalPdf(xv, c0.mu, c0.sigma),
        d1: c1.weight * normalPdf(xv, c1.mu, c1.sigma),
      });
    }
    return pts;
  }, [c0, c1]);
  const maxY = Math.max(0.01, ...curve.map((p) => Math.max(p.d0, p.d1)));

  const toCx = (v: number) => round2(PAD.left + ((v - LATENT_X_MIN) / (LATENT_X_MAX - LATENT_X_MIN)) * CW);
  const toCy = (v: number) => round2(PAD.top + CH - (v / maxY) * CH);
  const pathFor = (key: "d0" | "d1") => curve.map((p) => `${toCx(p.x)},${toCy(p[key])}`).join(" ");

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    const l1 = normalPdf(x, c1.mu, c1.sigma);
    const l0 = normalPdf(x, c0.mu, c0.sigma);
    m.setValue("w1", num(c1.weight, 2));
    m.setValue("w1b", num(c1.weight, 2));
    m.setValue("l1", num(l1, 4));
    m.setValue("l1b", num(l1, 4));
    m.setValue("w2", num(c0.weight, 2));
    m.setValue("l2", num(l0, 4));
    m.setValue("post", pct(probs[1], 0));
    m.setHighlight("post", true, probs[1] >= 0.5 ? COLOR_C1 : COLOR_C0);
  }, [x, probs, c0, c1]);

  return (
    <div id="latent-mixture-lab" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        2つの成分(青緑=成分0, 平均{c0.mu}／赤=成分1, 平均{c1.mu})から生成された観測データx。
        実際にどちらの成分から生まれたか(潜在変数z)は直接は分からないが、
        ベイズの定理で「xを観測した後の所属確率」を計算できる。
      </p>

      <label className="flex flex-col gap-1 text-sm text-slate-700">
        観測値 x = {num(x, 1)}
        <input
          type="range"
          min={LATENT_X_MIN}
          max={LATENT_X_MAX}
          step={0.5}
          value={x}
          onChange={(e) => setControl("latentX", Number(e.target.value))}
          aria-label="観測値xの値"
          data-testid="latent-x-slider"
          className="accent-slate-700"
        />
      </label>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mx-auto h-auto w-full max-w-md"
        role="img"
        aria-label="2成分混合正規分布の密度と観測値x"
        data-testid="latent-svg"
      >
        <line x1={PAD.left} y1={PAD.top + CH} x2={W - PAD.right} y2={PAD.top + CH} stroke="#cbd5e1" />
        <polyline points={pathFor("d0")} fill="none" stroke={COLOR_C0} strokeWidth={2} data-testid="mixture-curve-c0" />
        <polyline points={pathFor("d1")} fill="none" stroke={COLOR_C1} strokeWidth={2} data-testid="mixture-curve-c1" />
        {DEFAULT_MIXTURE_DATA.map((p, i) => (
          <circle
            key={i}
            cx={toCx(p.x)}
            cy={H - PAD.bottom + 14}
            r={3}
            fill={p.trueComponent === 0 ? COLOR_C0 : COLOR_C1}
            opacity={0.5}
            data-testid={`mixture-data-point-${i}`}
          />
        ))}
        <line x1={toCx(x)} y1={PAD.top} x2={toCx(x)} y2={PAD.top + CH} stroke="#16a34a" strokeWidth={2} data-testid="latent-x-marker" />
        <text x={toCx(x)} y={PAD.top - 2} textAnchor="middle" className="fill-green-700 text-[9px] font-bold">
          x
        </text>
        <text x={W / 2} y={H - 4} textAnchor="middle" className="fill-slate-400 text-[9px]">
          下段の点＝生成データ(色＝真の所属成分, 学習者には本来見えない「答え合わせ」表示)
        </text>
      </svg>
      <div className="flex flex-wrap justify-center gap-4 text-[11px]">
        <span className="flex items-center gap-1"><span className="h-2 w-4 rounded-full" style={{ background: COLOR_C0 }} />成分0の重み付き密度</span>
        <span className="flex items-center gap-1"><span className="h-2 w-4 rounded-full" style={{ background: COLOR_C1 }} />成分1の重み付き密度</span>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} display={false} />
      </div>

      <div className="flex justify-center gap-6 text-sm" data-testid="latent-responsibility">
        <span>P(z=0|x) = <span className="font-bold" style={{ color: COLOR_C0 }}>{pct(probs[0], 0)}</span></span>
        <span>P(z=1|x) = <span className="font-bold" style={{ color: COLOR_C1 }}>{pct(probs[1], 0)}</span></span>
      </div>
    </div>
  );
}
