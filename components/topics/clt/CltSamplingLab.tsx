"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { drawSampleMeans } from "@/lib/stats/clt";
import { DISTRIBUTIONS, getDistribution } from "@/lib/stats/distributions";
import { histogram } from "@/lib/stats/histogram";
import { mulberry32 } from "@/lib/stats/random";
import { useCltStore } from "@/lib/store/clt";
import { Histogram } from "./Histogram";

// SD[X̄] = σ/√n を「記号 → 現在値」で見せる数式。term() で項に id を付け、
// 操作のたびに TermController で σ・n・SE の数値を差し込み＆ハイライトする（強連動）。
const FORMULA = `\\operatorname{SD}[\\bar X]=\\dfrac{\\sigma}{\\sqrt{n}}=\\dfrac{${term(
  "sigma",
  "\\sigma",
)}}{\\sqrt{${term("n", "n")}}}=${term("se", "\\text{SE}")}`;

const N_MIN = 1;
const N_MAX = 100;
const HIST_BINS = 32;
const COLOR_SIGMA = "#7c3aed";
const COLOR_N = "#0891b2";
const COLOR_SE = "#2563eb";

/**
 * CLT 操作ラボ（描画層 / Control 層）。
 * 元分布選択 → n スライダー → 「サンプリング」で標本平均を蓄積し、ヒストグラム更新と同時に
 * 数式の σ/√n 項へ現在の σ・n を差し込みハイライトする（操作→グラフ→数式の強連動, 受け入れ条件）。
 * 操作値（distKind・n）は useCltStore が single source of truth。蓄積した標本平均だけは
 * 実行時の対話履歴なのでコンポーネント local state に持つ。
 */
export function CltSamplingLab() {
  const distKind = useCltStore((s) => s.controls.distKind);
  const n = useCltStore((s) => s.controls.n);
  const { mu, sigma, standardError: se } = useCltStore((s) => s.derived);
  const setControl = useCltStore((s) => s.setControl);

  const dist = getDistribution(distKind);

  // 蓄積した標本平均（対話履歴）。乱数は再現性より「引くたびに進む」ことが大事なので ref に保持。
  const [means, setMeans] = useState<number[]>([]);
  const rngRef = useRef(mulberry32((Date.now() & 0xffffffff) >>> 0));

  // 分布や n を変えたら、標本平均分布が変わるので蓄積をリセットする。
  useEffect(() => {
    setMeans([]);
  }, [distKind, n]);

  const addSamples = useCallback(
    (count: number) => {
      const next = drawSampleMeans(distKind, n, count, rngRef.current);
      setMeans((prev) => [...prev, ...next]);
    },
    [distKind, n],
  );

  const bins = useMemo(
    () => histogram(means, { min: dist.min, max: dist.max, bins: HIST_BINS }),
    [means, dist.min, dist.max],
  );

  // 数式の項を差し込み＋ハイライト（全体再描画はせず TermController で DOM 差分パッチ）。
  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const c = mathRef.current;
    if (!c) return;
    c.setValue("sigma", formatNumber(sigma));
    c.setValue("n", String(n));
    c.setValue("se", formatNumber(se));
    c.setHighlight("sigma", true, COLOR_SIGMA);
    c.setHighlight("n", true, COLOR_N);
    c.setHighlight("se", true, COLOR_SE);
  }, [sigma, n, se]);

  return (
    <div id="clt-operation" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
      {/* ① 元分布の選択 */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">元分布を選ぶ</p>
        <div className="flex flex-wrap gap-2">
          {DISTRIBUTIONS.map((d) => {
            const active = d.kind === distKind;
            return (
              <button
                key={d.kind}
                type="button"
                onClick={() => setControl("distKind", d.kind)}
                aria-pressed={active}
                className={`rounded-lg border px-3 py-2 text-sm transition ${
                  active
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {d.label}
                <span className={`ml-1 text-xs ${active ? "text-slate-300" : "text-slate-400"}`}>
                  {d.paramText}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-500">
          選んだ分布の母標準偏差 σ = {formatNumber(sigma)}（母平均 μ = {mu} は 3 分布で共通）。
        </p>
      </div>

      {/* ② 標本サイズ n */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="clt-n" className="text-sm font-semibold text-slate-700">
            標本サイズ n
          </label>
          <span className="font-mono text-sm text-slate-600">n = {n}</span>
        </div>
        <input
          id="clt-n"
          type="range"
          min={N_MIN}
          max={N_MAX}
          step={1}
          value={n}
          onChange={(e) => setControl("n", Number(e.target.value))}
          className="w-full accent-slate-900"
          aria-label="標本サイズ n"
        />
      </div>

      {/* ③ 強連動する数式（σ/√n に現在値を差し込み＋ハイライト） */}
      <div className="rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>

      {/* ④ ヒストグラム（標本平均の分布） */}
      <Histogram
        bins={bins}
        axisMin={dist.min}
        axisMax={dist.max}
        mu={mu}
        se={se}
        total={means.length}
        showNormal={means.length > 0}
      />
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-slate-400" />
          標本平均の度数
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-3 border-t-2 border-blue-600" />
          収束先 N(μ, σ²/n)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-3 bg-cyan-600/10 ring-1 ring-cyan-600/40" />μ ± SE
        </span>
        <span className="font-mono text-slate-600">蓄積 {means.length} 標本</span>
      </div>

      {/* ⑤ サンプリング操作 */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => addSamples(1)}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          ＋1 標本
        </button>
        <button
          type="button"
          onClick={() => addSamples(100)}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          ＋100 標本
        </button>
        <button
          type="button"
          onClick={() => setMeans([])}
          className="ml-auto rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50"
        >
          リセット
        </button>
      </div>
      <p className="text-xs leading-relaxed text-slate-500">
        ヒント: 元分布を指数（左右非対称）にして n を 1 → 大きく動かすと、釣鐘型に近づきつつ 分布が
        μ の周りに σ/√n で縮む様子が見えます。
      </p>
    </div>
  );
}
