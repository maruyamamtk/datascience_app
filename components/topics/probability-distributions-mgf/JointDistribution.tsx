"use client";

import { useState } from "react";
import { formatNumber } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import {
  conditionalXgivenY,
  isIndependentJoint,
  marginalX,
  marginalY,
  type JointDist,
} from "@/lib/stats/mass-functions";

// 例: X=天気(晴/曇/雨), Y=傘を持つ(持つ/持たない)。傘と天気は従属（雨だと持つ確率が高い）。
const X_LABELS = ["晴", "曇", "雨"];
const Y_LABELS = ["傘あり", "傘なし"];
const JOINT: JointDist = [
  [0.05, 0.35], // 晴
  [0.1, 0.2], // 曇
  [0.22, 0.08], // 雨
];

/**
 * 同時・周辺・条件付き分布の可視化（描画層・自前ローカル状態）。
 * 同時分布 P(X,Y) のセルを濃淡で表し、行和＝周辺 P(X)、列和＝周辺 P(Y) を周囲に出す。
 * 列（Y の値）をクリックすると、その列を正規化した条件付き分布 P(X|Y=y) を表示する。
 */
export function JointDistribution() {
  const [condCol, setCondCol] = useState<number | null>(null);
  const px = marginalX(JOINT);
  const py = marginalY(JOINT);
  const maxCell = Math.max(...JOINT.flat());
  const cond = condCol !== null ? conditionalXgivenY(JOINT, condCol) : null;

  const shade = (v: number) => {
    const a = 0.12 + 0.78 * (v / maxCell);
    return `rgba(37, 99, 235, ${a.toFixed(3)})`;
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        同時分布 P(X=天気, Y=傘)（列をクリック → 条件付き P(X|Y=y)）
      </p>

      <div className="overflow-x-auto">
        <table className="mx-auto text-center text-sm">
          <thead>
            <tr>
              <th className="px-2 py-1" />
              {Y_LABELS.map((y, j) => (
                <th key={j} className="px-2 py-1">
                  <button
                    type="button"
                    onClick={() => setCondCol(condCol === j ? null : j)}
                    aria-pressed={condCol === j}
                    className={`rounded px-2 py-1 text-xs font-semibold transition ${
                      condCol === j
                        ? "bg-red-100 text-red-700 ring-1 ring-red-400"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {y} ▾
                  </button>
                </th>
              ))}
              <th className="px-2 py-1 text-xs font-semibold text-violet-700">P(X)</th>
            </tr>
          </thead>
          <tbody>
            {JOINT.map((row, i) => (
              <tr key={i}>
                <th className="px-2 py-1 text-xs font-semibold text-slate-600">{X_LABELS[i]}</th>
                {row.map((v, j) => (
                  <td
                    key={j}
                    className="border border-white px-3 py-2 font-mono text-xs"
                    style={{
                      backgroundColor: shade(v),
                      color: v / maxCell > 0.6 ? "white" : "#0f172a",
                    }}
                  >
                    {formatNumber(v, 2)}
                  </td>
                ))}
                <td className="px-2 py-1 font-mono text-xs text-violet-700">
                  {formatNumber(px[i], 2)}
                </td>
              </tr>
            ))}
            <tr>
              <th className="px-2 py-1 text-xs font-semibold text-cyan-700">P(Y)</th>
              {py.map((v, j) => (
                <td key={j} className="px-2 py-1 font-mono text-xs text-cyan-700">
                  {formatNumber(v, 2)}
                </td>
              ))}
              <td className="px-2 py-1 font-mono text-xs text-slate-400">1.00</td>
            </tr>
          </tbody>
        </table>
      </div>

      {cond && condCol !== null ? (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-900">
          <p className="font-semibold">
            条件付き分布 P(X | Y={Y_LABELS[condCol]})（その列を P(Y)={formatNumber(py[condCol], 2)}{" "}
            で割る）
          </p>
          <div className="mt-1 flex flex-wrap gap-3 font-mono text-xs">
            {cond.map((c, i) => (
              <span key={i}>
                P({X_LABELS[i]}|{Y_LABELS[condCol]}) = {formatNumber(c, 2)}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <Callout
        title="周辺＝足し合わせ、条件付き＝切り出して正規化"
        body="周辺分布 P(X) は同時分布を Y について «足し合わせ»（行和）。条件付き P(X|Y=y) は «その列だけ» を取り出し、合計が 1 になるよう P(Y=y) で割る。"
        note={`この例は ${isIndependentJoint(JOINT) ? "独立" : "従属"}：雨のとき «傘あり» の条件付き確率が晴のときより高い（天気と傘は関係がある）。`}
        kind="explain"
      />
    </div>
  );
}
