"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { BN_BATCH, DROPOUT_ACTIVATIONS, useNeuralNetworkBasicsStore } from "@/lib/store/neural-network-basics";

const BN_FORMULA = `\\hat v_i=\\dfrac{v_i-${term("mean", "?")}}{\\sqrt{${term("var", "?")}+\\epsilon}},\\qquad \\text{out}_i=\\gamma\\hat v_i+\\beta`;

/** ドロップアウト・バッチ正規化ラボ（L2）。過学習を防ぐ2つの正則化テクニックを数値で体感する。 */
export function DropoutBatchNormLab() {
  const { dropoutRate, dropoutMaskArr, droppedActivations, bnGamma, bnBeta, bnResult } =
    useNeuralNetworkBasicsStore((s) => s.derived);
  const setControl = useNeuralNetworkBasicsStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("mean", formatNumber(bnResult.mean, 2));
    m.setValue("var", formatNumber(bnResult.variance, 2));
    m.setHighlight("mean", true, "#2563eb");
    m.setHighlight("var", true, "#dc2626");
  }, [bnResult]);

  const keptCount = dropoutMaskArr.filter((m) => m === 1).length;

  return (
    <div id="nn-regularization" className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-700">ドロップアウト（学習時だけユニットをランダムに無効化）</p>
        <div className="space-y-1">
          <label htmlFor="nn-dropout-rate" className="font-mono text-xs font-semibold text-slate-700">
            drop率 = {formatNumber(dropoutRate, 2)}
          </label>
          <input
            id="nn-dropout-rate"
            type="range"
            min={0}
            max={0.8}
            step={0.05}
            value={dropoutRate}
            onChange={(e) => setControl("dropoutRate", Number(e.target.value))}
            className="w-full accent-rose-600"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {DROPOUT_ACTIVATIONS.map((base, i) => {
            const kept = dropoutMaskArr[i] === 1;
            return (
              <div
                key={i}
                className={`flex h-14 w-14 flex-col items-center justify-center rounded-lg border text-xs font-mono ${
                  kept ? "border-emerald-400 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-100 text-slate-400 line-through"
                }`}
              >
                <span>{kept ? formatNumber(droppedActivations[i], 2) : "0"}</span>
                <span className="text-[9px]">{kept ? "残す" : "落とす"}</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs leading-relaxed text-slate-500">
          {keptCount}/{DROPOUT_ACTIVATIONS.length} ユニットが生き残った。生き残ったユニットは元の値
          {formatNumber(DROPOUT_ACTIVATIONS[0], 2)} を 1/(1−drop率) 倍して底上げする（インバーテッドドロップアウト）。
          こうすると学習時の出力の期待値が、推論時（全ユニット使用）とそろう。
        </p>
      </div>

      <div className="space-y-3 border-t border-slate-100 pt-4">
        <p className="text-sm font-semibold text-slate-700">バッチ正規化（ミニバッチの平均・分散で正規化）</p>
        <p className="text-xs text-slate-500">
          隠れ層の生の値 [{BN_BATCH.join(", ")}] を、バッチ全体の平均・分散で正規化してから γ・β でスケール・シフトし直す。
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="nn-bn-gamma" className="font-mono text-xs font-semibold text-slate-700">
              γ（スケール） = {formatNumber(bnGamma, 2)}
            </label>
            <input
              id="nn-bn-gamma"
              type="range"
              min={0.2}
              max={3}
              step={0.1}
              value={bnGamma}
              onChange={(e) => setControl("bnGamma", Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="nn-bn-beta" className="font-mono text-xs font-semibold text-slate-700">
              β（シフト） = {formatNumber(bnBeta, 2)}
            </label>
            <input
              id="nn-bn-beta"
              type="range"
              min={-3}
              max={3}
              step={0.1}
              value={bnBeta}
              onChange={(e) => setControl("bnBeta", Number(e.target.value))}
              className="w-full accent-violet-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-6 gap-2">
          {BN_BATCH.map((v, i) => (
            <div key={i} className="flex flex-col items-center gap-1 text-center text-[10px] font-mono text-slate-600">
              <span>{v}</span>
              <span className="text-slate-300">↓</span>
              <span className="rounded bg-blue-50 px-1 text-blue-700">{formatNumber(bnResult.scaled[i], 2)}</span>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
          <MathFormula ref={mathRef} tex={BN_FORMULA} display={false} />
        </div>
      </div>

      <Callout
        title="どちらも «過学習を防ぐ» ための正則化"
        body="ドロップアウトは学習のたびに違う «部分ネットワーク» を訓練するのに近く、特定のユニットへの過度な依存を防ぐ。バッチ正規化は各層の入力分布をミニバッチごとに揃え直し、学習を安定・高速化する（勾配消失の緩和にも効く）。"
        note="推論（本番の予測）時はドロップアウトを無効化し、バッチ正規化は学習中に蓄積した移動平均の平均・分散を使う——学習時と推論時で挙動が変わる点に注意。"
      />
    </div>
  );
}
