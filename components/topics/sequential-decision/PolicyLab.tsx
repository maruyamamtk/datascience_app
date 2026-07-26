"use client";

import { useSequentialDecisionStore } from "@/lib/store/sequential-decision";
import { MAX_PERIODS, MIN_PERIODS } from "@/lib/stats/sequential-decision";
import { ACTION_COLORS, num } from "./format";

/**
 * 逐次決定問題の「政策表」Lab(L0、ブラックボックス)。
 * 景気の続きやすさ・割引率・期間数を動かすと、後ろ向き帰納法(仕組みはLevel1で見る)が
 * 自動で計算した最適政策π_t(s)(各時点・各状態での最適行動)の表がそのままリアルタイムに更新される。
 * まずは「この表を計算する道具がある」ことを道具として使う段階。
 */
export function PolicyLab() {
  const persistence = useSequentialDecisionStore((s) => s.controls.persistence);
  const discount = useSequentialDecisionStore((s) => s.controls.discount);
  const periods = useSequentialDecisionStore((s) => s.controls.periods);
  const setControl = useSequentialDecisionStore((s) => s.setControl);

  const actions = useSequentialDecisionStore((s) => s.derived.actions);
  const states = useSequentialDecisionStore((s) => s.derived.states);
  const resultsChronological = useSequentialDecisionStore((s) => s.derived.resultsChronological);

  return (
    <div id="policy-lab" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        毎期「稼働台数」を選び、景気(好況/不況)は毎期確率的に移り変わる。3つのつまみを動かすと、
        <strong className="font-semibold text-slate-900">最適政策</strong>
        (各時点・各状態でどの行動を選ぶべきか)の表が自動で計算し直される——中身の計算方法は
        Level1で見る。
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          景気の続きやすさ = {pctLabel(persistence)}
          <input
            type="range"
            min={0.5}
            max={0.95}
            step={0.01}
            value={persistence}
            onChange={(e) => setControl("persistence", Number(e.target.value))}
            aria-label="景気の続きやすさ"
            data-testid="persistence-slider"
            className="accent-amber-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          割引率 γ = {discount.toFixed(2)}
          <input
            type="range"
            min={0.5}
            max={1}
            step={0.01}
            value={discount}
            onChange={(e) => setControl("discount", Number(e.target.value))}
            aria-label="割引率ガンマ"
            data-testid="discount-slider"
            className="accent-blue-600"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          期間数 T = {periods}
          <input
            type="range"
            min={MIN_PERIODS}
            max={MAX_PERIODS}
            step={1}
            value={periods}
            onChange={(e) => setControl("periods", Number(e.target.value))}
            aria-label="期間数T"
            data-testid="periods-slider"
            className="accent-emerald-600"
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-sm" data-testid="policy-table">
          <thead>
            <tr>
              <th className="border border-slate-200 px-3 py-2 text-left font-medium text-slate-600">
                時点
              </th>
              {states.map((s) => (
                <th
                  key={s}
                  className="border border-slate-200 px-3 py-2 text-left font-medium text-slate-600"
                >
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {resultsChronological.map((r) => (
              <tr key={r.period}>
                <td className="border border-slate-200 px-3 py-2 font-mono text-slate-700">
                  t={r.period}
                </td>
                {r.actionIndexByState.map((ai, si) => (
                  <td
                    key={si}
                    className="border border-slate-200 px-3 py-2"
                    data-testid={`policy-cell-${r.period}-${si}`}
                  >
                    <span
                      className="rounded px-2 py-0.5 text-xs font-semibold text-white"
                      style={{ backgroundColor: ACTION_COLORS[ai] }}
                    >
                      {actions[ai]}
                    </span>
                    <span className="ml-2 font-mono text-xs text-slate-500">
                      V={num(r.valueByState[si])}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        最終期(t={periods})に近いほど「先がない」ので即時報酬だけを見た近視眼的な選択(2台稼働が
        好況で有利)になりやすく、期間が長く残っているほど将来の景気変化も加味した選択に変わりうる
        ——この違いを生む計算手順が後ろ向き帰納法(Level1)。
      </p>
    </div>
  );
}

function pctLabel(v: number): string {
  return `${Math.round(v * 100)}%`;
}
