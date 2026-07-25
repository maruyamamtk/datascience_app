"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { binaryEntropy, selfInformation } from "@/lib/stats/information-theory";
import { useInformationTheoryStore } from "@/lib/store/information-theory";
import { round2 } from "./format";

// H(p) = -p log2 p - (1-p) log2(1-p) = ? ビット。pとH(p)の値を実時間で差し込む。
const FORMULA = `H(${term("p", "p")})=-${term("p2", "p")}\\log_2 ${term(
  "p3",
  "p",
)}-(1-${term("p4", "p")})\\log_2(1-${term("p5", "p")})=${term("h", "?")}\\ \\text{bit}`;

const P_MIN = 0.01;
const P_MAX = 0.99;

const W = 320;
const H = 160;
const PAD = { top: 10, right: 14, bottom: 24, left: 30 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

/**
 * BinaryEntropyLab(L0/L1の中核): 2値事象の確率pをスライダーで動かすと、
 * エントロピーH(p)の値とH(p) vs p の曲線(p=0.5で最大の1 bit)が数式と実時間連動する
 * (アルゴリズム図鑑スタイル: 操作→グラフ→数式の強連動)。
 */
export function BinaryEntropyLab() {
  const p = useInformationTheoryStore((s) => s.controls.coinP);
  const h = useInformationTheoryStore((s) => s.derived.binaryEntropyValue);
  const setControl = useInformationTheoryStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    for (const key of ["p", "p2", "p3", "p4", "p5"]) {
      m.setValue(key, formatNumber(p, 2));
    }
    m.setValue("h", formatNumber(h, 4));
    m.setHighlight("h", true, "#7c3aed");
    m.setHighlight("p", true, "#2563eb");
  }, [p, h]);

  const cx = (v: number) => round2(PAD.left + v * CW);
  const cy = (v: number) => round2(PAD.top + CH - v * CH); // H(p) in [0,1]

  const curvePoints = Array.from({ length: 101 }, (_, i) => {
    const x = i / 100;
    return `${cx(x)},${cy(binaryEntropy(x))}`;
  }).join(" ");

  const info1 = selfInformation(p);
  const info0 = selfInformation(1 - p);

  return (
    <div
      id="binary-entropy-lab"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <p className="text-sm text-slate-600">
        表が出る確率pのコインを考える。pを動かすと、エントロピーH(p)(この事象1回あたりの
        «不確実性の平均»)がどう変わるかが分かる。
      </p>

      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-slate-500">p=</span>
        <input
          type="range"
          min={P_MIN}
          max={P_MAX}
          step={0.01}
          value={p}
          onChange={(e) => setControl("coinP", Number(e.target.value))}
          aria-label="表が出る確率p"
          data-testid="entropy-p-slider"
          className="w-full accent-slate-900"
        />
        <span
          className="w-14 shrink-0 text-right font-mono text-sm font-semibold text-slate-700"
          data-testid="entropy-p-value"
        >
          {formatNumber(p, 2)}
        </span>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mx-auto w-full max-w-md"
          role="img"
          aria-label="H(p) vs p のエントロピー曲線"
        >
          <line x1={PAD.left} y1={PAD.top + CH} x2={W - PAD.right} y2={PAD.top + CH} stroke="#cbd5e1" />
          <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + CH} stroke="#cbd5e1" />
          <line
            x1={cx(0.5)}
            y1={PAD.top}
            x2={cx(0.5)}
            y2={PAD.top + CH}
            stroke="#94a3b8"
            strokeDasharray="2 2"
          />
          <text x={cx(0.5) - 14} y={PAD.top - 2} className="fill-slate-500 text-[9px]">
            p=0.5で最大
          </text>
          <polyline points={curvePoints} fill="none" stroke="#7c3aed" strokeWidth={2} data-testid="entropy-curve" />
          <circle
            cx={cx(p)}
            cy={cy(h)}
            r={5}
            fill="#7c3aed"
            stroke="#fff"
            strokeWidth={1.5}
            data-testid="entropy-current-point"
          />
          <text x={PAD.left} y={H - 6} className="fill-slate-400 text-[9px]">
            p→
          </text>
          <text x={2} y={PAD.top + 8} className="fill-slate-400 text-[9px]">
            H(p)↑
          </text>
          <text x={W - PAD.right - 34} y={cy(1) + 10} className="fill-slate-400 text-[9px]">
            1 bit
          </text>
        </svg>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} display={false} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-center text-xs">
        <div className="rounded-lg bg-blue-50 px-2 py-2 text-blue-700">
          <div className="font-mono text-base" data-testid="entropy-info-heads">
            {formatNumber(info1, 3)} bit
          </div>
          <div className="text-blue-600">表が出たときの自己情報量 -log2(p)</div>
        </div>
        <div className="rounded-lg bg-amber-50 px-2 py-2 text-amber-700">
          <div className="font-mono text-base" data-testid="entropy-info-tails">
            {formatNumber(info0, 3)} bit
          </div>
          <div className="text-amber-600">裏が出たときの自己情報量 -log2(1-p)</div>
        </div>
      </div>

      <Callout
        title={`p=${formatNumber(p, 2)}のときH(p)=${formatNumber(h, 4)} bit`}
        body="エントロピーH(p)は、表・裏それぞれの自己情報量を、実際に起きる確率で重み付けた平均(期待値)。p=0.5(五分五分でどちらが出るか一番読めない)のとき最大の1 bitになる。"
        note="pを0や1に近づける(結果がほぼ決まっている)と、H(p)は0に近づく——«結果を知る前から、ほぼ分かっている»ので、実際に知ったときの情報量(不確実性)が小さくなる。"
        kind="explain"
      />
    </div>
  );
}
