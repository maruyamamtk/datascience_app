"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { CLASS_LABELS, useImageAnalysisStore } from "@/lib/store/image-analysis";

const FORMULA = `P(y=k\\mid x)=\\dfrac{e^{z_k}}{\\sum_{j} e^{z_j}}=\\dfrac{e^{${term("ia_zk", "?")}}}{${term(
  "ia_denom",
  "?",
)}}=${term("ia_pk", "?")}`;

const BAR_COLORS = ["#2563eb", "#16a34a", "#d97706"];

/**
 * ソフトマックス出力による多クラス分類の実時間操作ラボ（L1 Interact）。
 * 3クラス（猫・犬・鳥）のロジット（生スコア）をスライダーで動かすと、ソフトマックス確率が
 * 即座に再計算されバー表示・数式（着目クラスの分子/分母/確率）が連動する。
 * CNNなどの«画像認識モデル»が最後に出す確率分布を、モデル本体の計算（前提: NNモデル）とは切り離し、
 * 「ロジット→確率」という変換そのものに焦点を当てて可視化する。
 */
export function ClassificationLab() {
  const { logits, probs, predictedIndex } = useImageAnalysisStore((s) => s.derived);
  const setControl = useImageAnalysisStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    const denom = logits.map((z) => `e^{${formatNumber(z, 1)}}`).join("+");
    m.setValue("ia_zk", formatNumber(logits[predictedIndex], 1));
    m.setValue("ia_denom", denom);
    m.setValue("ia_pk", formatNumber(probs[predictedIndex] ?? 0, 3));
    m.setHighlight("ia_pk", true, BAR_COLORS[predictedIndex % BAR_COLORS.length]);
  }, [logits, probs, predictedIndex]);

  return (
    <div id="ia-classification-lab" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        3クラスのロジット（生スコア、CNNの最終層が出す前の値のイメージ）をスライダーで動かすと、
        ソフトマックス確率が即座に再計算される——最も確率が高いクラス（太字）が最終的な予測になる。
      </p>

      <div className="space-y-3">
        {CLASS_LABELS.map((label, i) => (
          <div key={label} className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor={`ia-logit-${i}`} className="text-sm font-semibold text-slate-700">
                {label} のロジット
              </label>
              <span className="font-mono text-sm" style={{ color: BAR_COLORS[i] }}>
                {formatNumber(logits[i], 1)}
              </span>
            </div>
            <input
              id={`ia-logit-${i}`}
              type="range"
              min={-5}
              max={5}
              step={0.1}
              value={logits[i]}
              onChange={(e) => {
                const next = [...logits] as [number, number, number];
                next[i] = Number(e.target.value);
                setControl("logits", next);
              }}
              className="w-full"
              style={{ accentColor: BAR_COLORS[i] }}
              aria-label={`${label}のロジット`}
            />
          </div>
        ))}
      </div>

      <div className="space-y-2 rounded-xl bg-slate-50 p-4">
        {CLASS_LABELS.map((label, i) => {
          const pct = (probs[i] ?? 0) * 100;
          const isTop = i === predictedIndex;
          return (
            <div key={label} className="flex items-center gap-3">
              <span className={`w-10 shrink-0 text-sm ${isTop ? "font-bold text-slate-900" : "text-slate-600"}`}>{label}</span>
              <div className="h-5 flex-1 overflow-hidden rounded-full bg-slate-200" data-testid={`ia-softmax-bar-${label}`}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: BAR_COLORS[i] }}
                />
              </div>
              <span className="w-16 shrink-0 text-right font-mono text-sm" style={{ color: BAR_COLORS[i] }}>
                {formatNumber(probs[i] ?? 0, 3)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} display={false} />
      </div>

      <Callout
        title={`予測: ${CLASS_LABELS[predictedIndex]}（確率${formatNumber((probs[predictedIndex] ?? 0) * 100, 1)}%）`}
        body="ソフトマックスはロジットを指数関数 e^z に通してから総和で割ることで、«非負»«総和1»を満たす確率分布に変換する。最もロジットが大きいクラスが最も確率も大きくなる（指数関数は単調増加なので順位は変わらない）。"
        note="どれか1つのロジットを上げると、他のクラスの確率は（総和1を保つため）自動的に下がる——確率は«競合»する。"
      />
    </div>
  );
}
