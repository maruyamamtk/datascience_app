"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { ITEMS, TRUE_SCORES, useQualStore } from "@/lib/store/qualitative-data-analysis";

// ŷ = 定数 + 天気スコア + 曜日スコア。予測の内訳を実時間で差し込み＋ハイライト。
const FORMULA = `\\hat y=${term("c", "?")}+\\underbrace{${term("w", "?")}}_{\\text{天気}}+\\underbrace{${term("d", "?")}}_{\\text{曜日}}=${term("yhat", "?")}`;

/** スコアバー1本（正=青/負=赤）。 */
function ScoreBar({ label, value, trueValue, selected }: { label: string; value: number; trueValue: number; selected: boolean }) {
  const w = Math.min(50, Math.abs(value) * 5); // ±10 → ±50%
  const pos = value >= 0;
  return (
    <div className={`flex items-center gap-2 text-xs ${selected ? "font-semibold" : ""}`}>
      <span className={`w-14 text-right ${selected ? "text-violet-700" : "text-slate-600"}`}>{label}{selected ? " ◀" : ""}</span>
      <div className="relative h-4 flex-1 rounded bg-slate-100">
        <div className="absolute left-1/2 top-0 h-4 w-px bg-slate-300" />
        <div className="absolute top-0 h-4 rounded" style={{ left: pos ? "50%" : `${50 - w}%`, width: `${w}%`, background: pos ? "#2563eb" : "#dc2626" }} />
      </div>
      <span className="w-10 text-right font-mono text-slate-700">{formatNumber(value, 1)}</span>
      <span className="w-12 text-right font-mono text-slate-300">(真{formatNumber(trueValue, 0)})</span>
    </div>
  );
}

export function QuantLab() {
  const controls = useQualStore((s) => s.controls);
  const { fit, prediction, parts } = useQualStore((s) => s.derived);
  const setControl = useQualStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("c", formatNumber(parts.constant, 1));
    m.setValue("w", formatNumber(parts.weather, 1));
    m.setValue("d", formatNumber(parts.day, 1));
    m.setValue("yhat", formatNumber(prediction, 1));
    m.setHighlight("w", true, parts.weather >= 0 ? "#2563eb" : "#dc2626");
    m.setHighlight("d", true, parts.day >= 0 ? "#2563eb" : "#dc2626");
    m.setHighlight("yhat", true, "#7c3aed");
  }, [parts, prediction]);

  return (
    <div id="qual-operation" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-xs text-slate-500">シナリオ：天気×曜日から «アイスの売上（万円）» を予測（数量化I類）</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="qa-noise" className="text-xs font-semibold text-slate-700">雑音の大きさ = {formatNumber(controls.noise, 1)}</label>
          <input id="qa-noise" type="range" min={0.5} max={12} step={0.5} value={controls.noise} onChange={(e) => setControl("noise", Number(e.target.value))} className="w-full accent-blue-600" />
        </div>
        <div className="space-y-1">
          <label htmlFor="qa-n" className="text-xs font-semibold text-slate-700">標本サイズ n = {controls.n.toLocaleString()}</label>
          <input id="qa-n" type="range" min={100} max={5000} step={100} value={controls.n} onChange={(e) => setControl("n", Number(e.target.value))} className="w-full accent-blue-600" />
        </div>
      </div>

      {/* 予測する組合せ選択 */}
      <div className="grid grid-cols-2 gap-3">
        <ItemSelect label="天気" options={ITEMS[0].categories} value={controls.weather} onChange={(v) => setControl("weather", v)} />
        <ItemSelect label="曜日" options={ITEMS[1].categories} value={controls.day} onChange={(v) => setControl("day", v)} />
      </div>

      {/* カテゴリ数量バー */}
      <div className="space-y-2 rounded-xl bg-slate-50 px-4 py-3">
        <p className="text-xs font-semibold text-slate-600">推定カテゴリ数量（各アイテム平均0・青=押上げ/赤=押下げ）</p>
        <div className="space-y-1">
          <p className="text-[10px] text-slate-400">天気（レンジ {formatNumber(fit.ranges[0], 1)}）</p>
          {ITEMS[0].categories.map((cat, i) => (
            <ScoreBar key={cat} label={cat} value={fit.scores[0][i]} trueValue={TRUE_SCORES[0][i]} selected={controls.weather === i} />
          ))}
          <p className="text-[10px] text-slate-400">曜日（レンジ {formatNumber(fit.ranges[1], 1)}）</p>
          {ITEMS[1].categories.map((cat, i) => (
            <ScoreBar key={cat} label={cat} value={fit.scores[1][i]} trueValue={TRUE_SCORES[1][i]} selected={controls.day === i} />
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-center text-xs">
        <Stat value={`${formatNumber(prediction, 1)} 万円`} label={`予測（${ITEMS[0].categories[controls.weather]}×${ITEMS[1].categories[controls.day]}）`} tone="violet" />
        <Stat value={formatNumber(fit.rSquared, 3)} label="R²（説明力）" tone={fit.rSquared > 0.5 ? "blue" : "amber"} />
      </div>

      <Callout
        title="数量化I類：質的変数を «カテゴリ数量» に変えて予測する"
        body={`各カテゴリにスコアを与え、定数 ${formatNumber(parts.constant, 1)} ＋ 天気 ${formatNumber(parts.weather, 1)} ＋ 曜日 ${formatNumber(parts.day, 1)} ＝ ${formatNumber(prediction, 1)} 万円で予測。推定スコアは真の値（灰）をよく回復している。R²=${formatNumber(fit.rSquared, 3)}。`}
        note={`実質はダミー変数による重回帰。雑音を上げると推定スコアがブレて R² が下がり、標本 n を増やすと真値に近づく。レンジ（max−min）が大きいアイテムほど予測への «効き» が大きい（ここでは天気 ${formatNumber(fit.ranges[0], 1)} > 曜日 ${formatNumber(fit.ranges[1], 1)}）。`}
        kind="explain"
      />
    </div>
  );
}

function ItemSelect({ label, options, value, onChange }: { label: string; options: string[]; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <span className="text-xs font-semibold text-slate-700">{label}</span>
      <div className="flex gap-1">
        {options.map((o, i) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(i)}
            aria-pressed={value === i}
            className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${
              value === i ? "border-violet-500 bg-violet-50 text-violet-700" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone: "violet" | "blue" | "amber" }) {
  const bg = { violet: "bg-violet-50 text-violet-700", blue: "bg-blue-50 text-blue-700", amber: "bg-amber-50 text-amber-700" }[tone];
  return (
    <div className={`rounded-lg px-2 py-2 ${bg}`}>
      <div className="font-mono text-base">{value}</div>
      <div className="text-slate-500">{label}</div>
    </div>
  );
}
