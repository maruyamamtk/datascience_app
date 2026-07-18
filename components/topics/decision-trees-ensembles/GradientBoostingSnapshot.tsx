"use client";

import { GB_INITIAL, GB_LEARNING_RATE, GB_ROUNDS, REG_POINTS } from "@/lib/store/decision-trees-ensembles";
import { gbPredict, linspace, meanSquaredError } from "@/lib/stats/decision-trees-ensembles";

const round2 = (v: number) => Math.round(v * 100) / 100;
const W = 320;
const H = 200;
const PADL = 26;
const PADR = 10;
const PADT = 12;
const PADB = 22;
const Y_LO = -1.6;
const Y_HI = 1.6;
const fx = (x: number) => round2(PADL + x * (W - PADL - PADR));
const fy = (v: number) => {
  const c = Math.max(Y_LO, Math.min(Y_HI, v));
  return round2(PADT + ((Y_HI - c) / (Y_HI - Y_LO)) * (H - PADT - PADB));
};

const DENSE_X = linspace(0, 1, 100);
const SNAPSHOT_ROUNDS = [1, 5, 30] as const;
const SNAPSHOT_COLOR: Record<(typeof SNAPSHOT_ROUNDS)[number], string> = { 1: "#94a3b8", 5: "#0891b2", 30: "#dc2626" };

/**
 * 勾配ブースティング（Level3補足図）: 操作系を持たない静的な図。同じ回帰データに対して
 * 「残差に浅い回帰木を1本ずつ足していく」過程を、ラウンド1・5・30の3断面で重ねて見せる。
 * ラウンドを重ねるごとに、まだ捉えられていない«残差の形»をなぞるように予測曲線が真の関数へ近づく。
 */
export function GradientBoostingSnapshot() {
  const truePts = DENSE_X.map((x) => `${fx(x)},${fy(Math.sin(2 * Math.PI * x))}`).join(" ");

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">勾配ブースティング（回帰）: 残差に浅い回帰木を逐次フィットして曲線を組み立てる</p>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-md" role="img" aria-label="勾配ブースティングの学習過程">
          {[-1, 0, 1].map((v) => (
            <line key={`g${v}`} x1={PADL} y1={fy(v)} x2={W - PADR} y2={fy(v)} className="stroke-slate-100" />
          ))}
          <polyline points={truePts} fill="none" className="stroke-slate-800" strokeWidth={1.2} strokeDasharray="4 3" opacity={0.5} />
          {SNAPSHOT_ROUNDS.map((r) => {
            const pts = DENSE_X.map((x) => `${fx(x)},${fy(gbPredict(GB_ROUNDS, GB_INITIAL, x, GB_LEARNING_RATE, r))}`).join(" ");
            return <polyline key={`gb${r}`} points={pts} fill="none" stroke={SNAPSHOT_COLOR[r]} strokeWidth={2} />;
          })}
          {REG_POINTS.map((p, i) => (
            <circle key={`p${i}`} cx={fx(p.x)} cy={fy(p.y)} r={2.4} className="fill-slate-500" />
          ))}
          <text x={(PADL + W - PADR) / 2} y={H - 4} textAnchor="middle" className="fill-slate-500 text-[9px]">
            破線=真の関数 sin(2πx), 点=訓練データ
          </text>
        </svg>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-slate-600">
        {SNAPSHOT_ROUNDS.map((r) => {
          const preds = REG_POINTS.map((p) => gbPredict(GB_ROUNDS, GB_INITIAL, p.x, GB_LEARNING_RATE, r));
          const mse = meanSquaredError(preds, REG_POINTS.map((p) => p.y));
          return (
            <span key={r} className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: SNAPSHOT_COLOR[r] }} />
              ラウンド{r}: 訓練MSE={mse.toFixed(3)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
