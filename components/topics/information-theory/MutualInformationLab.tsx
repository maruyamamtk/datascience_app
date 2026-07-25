"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import {
  JOINT_COL_LABELS,
  JOINT_ROW_LABELS,
  useInformationTheoryStore,
} from "@/lib/store/information-theory";
import { num, pct } from "./format";

// I(X;Y) = ΣΣ p(x,y) log2( p(x,y)/(p(x)p(y)) ) = D_KL(P(X,Y)‖P(X)P(Y)) = 直接式・KL経由の両方
const FORMULA = `I(X;Y)=\\sum_{x,y}p(x,y)\\log_2\\frac{p(x,y)}{p(x)p(y)}=${term(
  "mi",
  "?",
)}\\ \\text{bit}\\ \\ (=D_{KL}=${term("mikl", "?")}\\ \\text{bit})`;

/**
 * MutualInformationLab(L2の中核): 天気(晴れ/雨)×傘(持つ/持たない)の同時分布を
 * 4セルのスライダーで編集すると、周辺分布・相互情報量I(X;Y)が実時間で再計算される
 * (操作→グラフ→数式の強連動)。相互情報量を「直接の定義式」と「KLダイバージェンス経由」の
 * 2通りで同時に表示し、I(X;Y)=D_KL(P(X,Y)‖P(X)P(Y))の関係を数値で裏付ける。
 */
export function MutualInformationLab() {
  const counts = useInformationTheoryStore((s) => s.controls.jointCounts);
  const { jointTable, px, py, hx, hy, hxy, mutualInfo, mutualInfoViaKL } = useInformationTheoryStore(
    (s) => s.derived,
  );
  const setControl = useInformationTheoryStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("mi", formatNumber(mutualInfo, 4));
    m.setValue("mikl", formatNumber(mutualInfoViaKL, 4));
    m.setHighlight("mi", true, "#7c3aed");
    m.setHighlight("mikl", true, "#0891b2");
  }, [mutualInfo, mutualInfoViaKL]);

  const setCell = (i: number, j: number, value: number) => {
    const next = counts.map((row) => [...row]);
    next[i][j] = value;
    setControl("jointCounts", next);
  };

  return (
    <div
      id="mutual-information-lab"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <p className="text-sm text-slate-600">
        天気(X: 晴れ/雨)と傘(Y: 持つ/持たない)を観測した回数の表。セルを編集して
        «天気と傘の持ち方がどれだけ連動しているか»を相互情報量I(X;Y)で確かめよう。
      </p>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {counts.map((row, i) =>
          row.map((v, j) => (
            <div key={`${i}-${j}`} className="space-y-1">
              <label htmlFor={`mi-${i}-${j}`} className="text-xs font-semibold text-slate-700">
                {JOINT_ROW_LABELS[i]}×{JOINT_COL_LABELS[j]} = {v}
              </label>
              <input
                id={`mi-${i}-${j}`}
                type="range"
                min={0}
                max={100}
                step={1}
                value={v}
                onChange={(e) => setCell(i, j, Number(e.target.value))}
                className="w-full accent-violet-600"
                aria-label={`${JOINT_ROW_LABELS[i]}×${JOINT_COL_LABELS[j]}のセル`}
                data-testid={`mi-slider-${i}-${j}`}
              />
            </div>
          )),
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="mx-auto border-collapse text-center text-sm" data-testid="mi-table">
          <thead>
            <tr>
              <th className="px-2 py-1"></th>
              {JOINT_COL_LABELS.map((c) => (
                <th key={c} className="px-3 py-1 text-xs text-slate-500">
                  {c}
                </th>
              ))}
              <th className="px-3 py-1 text-xs text-slate-400">P(X)</th>
            </tr>
          </thead>
          <tbody>
            {jointTable.map((row, i) => (
              <tr key={i}>
                <th className="px-2 py-1 text-xs text-slate-500">{JOINT_ROW_LABELS[i]}</th>
                {row.map((p, j) => (
                  <td key={j} className="border border-slate-200 px-3 py-1.5 font-mono text-slate-800">
                    {pct(p)}
                  </td>
                ))}
                <td className="px-3 py-1 font-mono text-xs text-slate-400">{pct(px[i])}</td>
              </tr>
            ))}
            <tr>
              <th className="px-2 py-1 text-xs text-slate-400">P(Y)</th>
              {py.map((p, j) => (
                <td key={j} className="px-3 py-1 font-mono text-xs text-slate-400">
                  {pct(p)}
                </td>
              ))}
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} display={false} />
      </div>

      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <Stat value={`${num(hx, 3)} bit`} label="H(X)" tone="blue" />
        <Stat value={`${num(hy, 3)} bit`} label="H(Y)" tone="amber" />
        <Stat value={`${num(hxy, 3)} bit`} label="H(X,Y)" tone="slate" />
        <Stat value={`${num(mutualInfo, 3)} bit`} label="I(X;Y)" tone="violet" />
      </div>

      <Callout
        title={`I(X;Y)=${num(mutualInfo, 4)} bit（KL経由でも${num(mutualInfoViaKL, 4)} bitと一致）`}
        body="相互情報量は«Yを知ることで、Xの不確実性がどれだけ減るか»を表す。対角(晴れ×持つ、雨×持たない)を大きくするほど天気と傘が強く連動し、I(X;Y)が増える。"
        note="対角と反対の2セルを均等(すべて同じ値)にすると天気と傘は独立になり、I(X;Y)はちょうど0になる——試してみよう。"
        kind="explain"
      />
    </div>
  );
}

function Stat({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone: "blue" | "amber" | "slate" | "violet";
}) {
  const bg = {
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-700",
    violet: "bg-violet-50 text-violet-700",
  }[tone];
  return (
    <div className={`rounded-lg px-2 py-2 ${bg}`}>
      <div className="font-mono text-sm">{value}</div>
      <div className="text-slate-500">{label}</div>
    </div>
  );
}
