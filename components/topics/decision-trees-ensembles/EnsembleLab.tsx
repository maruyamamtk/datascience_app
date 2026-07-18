"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { CLASS_TRAIN, useDecisionTreesEnsemblesStore } from "@/lib/store/decision-trees-ensembles";
import type { EnsembleMethod } from "@/lib/stats/decision-trees-ensembles";

const round2 = (v: number) => Math.round(v * 100) / 100;
const W = 300;
const H = 300;
const PAD = 22;
const px = (v: number) => round2(PAD + v * (W - 2 * PAD));
const py = (v: number) => round2(PAD + (1 - v) * (H - 2 * PAD));

const LABEL_FILL = { 0: "#2563eb", 1: "#d97706" } as const;
const LABEL_BG = { 0: "#dbeafe", 1: "#fef3c7" } as const;

const N_TREES_OPTIONS = [1, 3, 5, 10, 25, 50] as const;

function formulaFor(): string {
  return `\\hat y(x)=\\operatorname*{arg\\,max}_k\\ \\frac1T\\sum_{t=1}^{T}\\mathbb{1}[h_t(x)=k]\\quad T=${term("T", "?")}\\quad \\text{OOB誤り率}=${term("oob", "?")}`;
}

/** バギング・ランダムフォレスト ラボ（Level2）: 木の本数を増やすと境界が滑らかになる=分散低減を見せる。 */
export function EnsembleLab() {
  const d = useDecisionTreesEnsemblesStore((s) => s.derived);
  const setControl = useDecisionTreesEnsemblesStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("T", String(d.nTrees));
    m.setValue("oob", Number.isFinite(d.oobError) ? formatNumber(d.oobError * 100, 1) + "\\%" : "\\text{—}");
    m.setHighlight("T", true, "#0891b2");
    m.setHighlight("oob", true, "#dc2626");
  }, [d.nTrees, d.oobError]);

  const cellSize = round2((W - 2 * PAD) / 28);
  const gain = d.ensembleTestAcc - d.singleTreeTestAcc;

  return (
    <div id="ensemble-lab" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        同じ深さの木を{CLASS_TRAIN.length}点の訓練データからブートストラップ再標本して何本も育て、多数決する。木を増やすほど個々の木の«くせ»が打ち消し合い、決定境界が滑らかになる（分散低減）。ランダムフォレストはさらに各分割で特徴量を1個に絞り、木どうしの相関を下げる。
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-1 rounded-lg border border-slate-300 bg-slate-50 p-1">
          {(["bagging", "randomForest"] as EnsembleMethod[]).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={d.ensembleMethod === m}
              onClick={() => setControl("ensembleMethod", m)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                d.ensembleMethod === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {m === "bagging" ? "バギング（全特徴量）" : "ランダムフォレスト（1特徴量）"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg border border-slate-300 bg-slate-50 p-1">
          {N_TREES_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={d.nTrees === n}
              onClick={() => setControl("nTrees", n)}
              className={`rounded-md px-2.5 py-1 font-mono text-xs font-semibold transition ${
                d.nTrees === n ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              T={n}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-sm" role="img" aria-label="アンサンブルの決定境界">
          {d.ensembleBoundary.map((cell, i) => (
            <rect
              key={`cell${i}`}
              x={round2(px(cell.x1) - cellSize / 2)}
              y={round2(py(cell.x2) - cellSize / 2)}
              width={cellSize}
              height={cellSize}
              fill={LABEL_BG[cell.label]}
            />
          ))}
          <rect x={PAD} y={PAD} width={W - 2 * PAD} height={H - 2 * PAD} fill="none" className="stroke-slate-300" />
          {CLASS_TRAIN.map((p, i) => (
            <circle key={`p${i}`} cx={px(p.x1)} cy={py(p.x2)} r={3} fill={LABEL_FILL[p.label]} stroke="#fff" strokeWidth={0.8} />
          ))}
        </svg>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={formulaFor()} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <Stat value={formatNumber(d.singleTreeTestAcc * 100, 1) + "%"} label="単木テスト正解率" tone="blue" />
        <Stat value={formatNumber(d.ensembleTestAcc * 100, 1) + "%"} label="アンサンブルテスト正解率" tone="emerald" />
        <Stat value={Number.isFinite(d.oobError) ? formatNumber(d.oobError * 100, 1) + "%" : "—"} label="OOB誤り率" tone="red" />
      </div>

      <Callout
        title={`T=${d.nTrees}本・${d.ensembleMethod === "bagging" ? "バギング" : "ランダムフォレスト"}`}
        body={
          d.nTrees === 1
            ? "T=1では単木そのもの（ブートストラップの1標本ぶんノイズが乗るだけ）。木を増やしてみよう。"
            : gain > 0.01
              ? `単木（${formatNumber(d.singleTreeTestAcc * 100, 1)}%）よりアンサンブル（${formatNumber(d.ensembleTestAcc * 100, 1)}%）のテスト正解率が高い——多数決でノイズに引きずられた個々の木の誤りが打ち消し合った。`
              : "木の本数を増やしても単木とほぼ同じ精度——このデータでは元の木がすでに十分安定している可能性がある。"
        }
        note="OOB誤り率は «その点をブートストラップに含まなかった木» だけで多数決した誤り率。held-outデータを別に取り分けなくても汎化誤差を見積もれる、バギング・ランダムフォレストならではの利点（機械学習の枠組みの交差検証と同じ役割）。"
        kind={d.nTrees >= 10 ? "supplement" : "explain"}
      />
    </div>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone: "emerald" | "red" | "blue" }) {
  const bg = { emerald: "bg-emerald-50 text-emerald-700", red: "bg-rose-50 text-rose-700", blue: "bg-blue-50 text-blue-700" }[tone];
  return (
    <div className={`rounded-lg px-2 py-2 ${bg}`}>
      <div className="font-mono text-sm">{value}</div>
      <div className="text-slate-500">{label}</div>
    </div>
  );
}
