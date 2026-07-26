"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { useNeuralNetworkBasicsStore } from "@/lib/store/neural-network-basics";
import type { ActivationName } from "@/lib/stats/neural-network-basics";
import { NetworkDiagram } from "./NetworkDiagram";

const FORMULA = `z_1^{(0)}=${term("z10", "?")},\\ a_1^{(0)}=\\phi(z_1^{(0)})=${term("a10", "?")}\\qquad z_1^{(1)}=${term("z11", "?")},\\ a_1^{(1)}=\\phi(z_1^{(1)})=${term("a11", "?")}\\qquad \\hat y=${term("yhat", "?")}`;

const ACT_LABEL: Record<ActivationName, string> = { relu: "ReLU", sigmoid: "シグモイド", rbf: "動径基底関数" };

/** 「ブラックボックスとしてのNN」ラボ（L0）。入力→隠れ層→出力を小さなネットワークで体感する。 */
export function ForwardLab() {
  const { x0, x1, activation, trace } = useNeuralNetworkBasicsStore((s) => s.derived);
  const setControl = useNeuralNetworkBasicsStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("z10", formatNumber(trace.z1[0], 2));
    m.setValue("a10", formatNumber(trace.a1[0], 2));
    m.setValue("z11", formatNumber(trace.z1[1], 2));
    m.setValue("a11", formatNumber(trace.a1[1], 2));
    m.setValue("yhat", formatNumber(trace.yhat, 2));
    m.setHighlight("a10", true, "#7c3aed");
    m.setHighlight("a11", true, "#7c3aed");
    m.setHighlight("yhat", true, "#16a34a");
  }, [trace]);

  return (
    <div id="nn-forward" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        入力 <span className="font-mono">x₀, x₁</span> を動かすと、各エッジの重み（«シナプス結合»）で重み付き和を取り、活性化関数
        <span className="font-mono"> φ</span> を通した隠れ層の値、そして出力 <span className="font-mono">ŷ</span> が実時間で再計算される。
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <label htmlFor="nn-x0" className="font-mono text-xs font-semibold text-slate-700">
            x₀ = {formatNumber(x0, 2)}
          </label>
          <input
            id="nn-x0"
            type="range"
            min={-2}
            max={2}
            step={0.1}
            value={x0}
            onChange={(e) => setControl("x0", Number(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="nn-x1" className="font-mono text-xs font-semibold text-slate-700">
            x₁ = {formatNumber(x1, 2)}
          </label>
          <input
            id="nn-x1"
            type="range"
            min={-2}
            max={2}
            step={0.1}
            value={x1}
            onChange={(e) => setControl("x1", Number(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="nn-activation" className="text-xs font-semibold text-slate-700">
            活性化関数 φ
          </label>
          <select
            id="nn-activation"
            value={activation}
            onChange={(e) => setControl("activation", e.target.value as ActivationName)}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="relu">ReLU</option>
            <option value="sigmoid">シグモイド</option>
            <option value="rbf">動径基底関数</option>
          </select>
        </div>
      </div>

      <NetworkDiagram
        values={{ x0, x1, z1: trace.z1, a1: trace.a1, yhat: trace.yhat, loss: trace.loss }}
        activeNodes={["x0", "x1", "h0", "h1", "out", "loss"]}
        activeEdges={["e-x0-h0", "e-x1-h0", "e-x0-h1", "e-x1-h1", "e-h0-out", "e-h1-out", "e-out-loss"]}
        accent="#2563eb"
      />

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} display={false} />
      </div>

      <Callout
        title={`活性化関数: ${ACT_LABEL[activation]}`}
        body={`隠れ層は «入力の重み付き和 → 活性化関数» の2段構え。重み（シナプス結合）はネットワークが学習で調整するパラメータで、活性化関数がネットワークに非線形性を与える——線形結合だけを何層重ねても結局1つの線形写像にしかならないが、間に非線形な φ を挟むことで複雑な関数を表現できる。`}
        note="出力層は今回は活性化なし（線形）——回帰の予測値としてそのまま使う設定。分類なら出力層にもシグモイド/ソフトマックスを使う。"
      />
    </div>
  );
}
