/**
 * 自己相関（ACF）を «系列をラグ k だけずらして重ね、相関を測る» 手順としてコマ送りで見せる
 * フレーム列ビルダー（計算層・純関数）。各ラグでの自己相関を1本ずつコレログラムに積み上げる
 * （アルゴリズム図鑑スタイル）。副作用なし（Vitest 対象）。描画は AcfStepper.tsx が購読する。
 */

import type { VizFrame } from "@/components/viz";
import { mulberry32 } from "@/lib/stats/random";
import { acfConfidenceBound, autocorrelation, generateSeries } from "@/lib/stats/time-series";

/** ステッパーで使う固定系列（季節周期あり）と設定。 */
export const STEP_N = 96;
export const STEP_PERIOD = 12;
export const MAX_LAG = 24;

/** 体感用の固定系列（季節性が強く、ACF に周期ピークが出る）。 */
export function stepSeries(): number[] {
  return generateSeries({
    n: STEP_N,
    slope: 0,
    amp: 3,
    period: STEP_PERIOD,
    noiseSd: 0.8,
    base: 0,
    rng: mulberry32(20250581),
  }).value;
}

/** 各フレーム（あるラグ k）のスナップショット。 */
export type AcfFramePayload = {
  /** ラグ k。 */
  lag: number;
  /** ラグ k の自己相関 ρ(k)。 */
  rho: number;
  /** ラグ 0..k の自己相関列（積み上げ中のコレログラム）。 */
  acfSoFar: number[];
  /** 近似95%信頼限界 ±bound。 */
  bound: number;
  /** |ρ(k)| が限界を超える（有意）か。 */
  significant: boolean;
};

/** ラグ 0..MAX_LAG のフレーム列を作る。 */
export function buildAcfFrames(): VizFrame<AcfFramePayload>[] {
  const series = stepSeries();
  const bound = acfConfidenceBound(series.length);
  const acfSoFar: number[] = [];
  const frames: VizFrame<AcfFramePayload>[] = [];

  for (let k = 0; k <= MAX_LAG; k++) {
    const rho = autocorrelation(series, k);
    acfSoFar.push(rho);
    const significant = k > 0 && Math.abs(rho) > bound;
    const nearPeriod = k > 0 && k % STEP_PERIOD === 0;
    frames.push({
      payload: { lag: k, rho, acfSoFar: [...acfSoFar], bound, significant },
      highlights: ["series", "corr"],
      callout: {
        title:
          k === 0
            ? "ラグ0：自分自身との相関 ρ(0)=1"
            : `ラグ${k}：ρ(${k})=${rho.toFixed(2)}${significant ? "（有意）" : ""}`,
        body:
          k === 0
            ? "系列をずらさず自分自身と重ねれば完全一致。だから自己相関は必ず1から始まる。ここからラグを1つずつ増やして «k期前の自分» との相関を測る。"
            : `系列を右へ ${k} 期ずらして元と重ね、対応する点どうしの相関を計算した値が ρ(${k})。${
                nearPeriod
                  ? `季節周期(${STEP_PERIOD})の倍数なので山と山が揃い、強い正の相関になる。`
                  : k % STEP_PERIOD === STEP_PERIOD / 2
                    ? "半周期ずれで山と谷が重なり、負の相関になる。"
                    : "ずれに応じて相関が上下する。"
              }`,
        note:
          k === 0
            ? "ACF（自己相関関数）: ラグごとの ρ(k) を並べたもの。時系列の «記憶» の形を表す。"
            : significant
              ? `破線 ±${bound.toFixed(2)} が «ほぼ0» の目安（信頼限界）。これを超えるラグは有意な自己相関＝まだ構造が残っている。`
              : "信頼限界の内側なら «偶然の範囲»。全ラグが内側ならホワイトノイズ（無相関）に近い。",
        kind: nearPeriod ? "supplement" : "explain",
      },
    });
  }
  return frames;
}
