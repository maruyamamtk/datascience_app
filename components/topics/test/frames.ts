/**
 * 検出力のコマ送り（PowerStepper）のフレーム列ビルダー（計算層・純関数）。
 * 効果量・α・対立仮説を固定し、標本サイズ n を 1 段ずつ増やしたときに検出力 1−β がどう上がるかを、
 * 検出力曲線の点を 1 つずつ開示するコマ送りで見せる。副作用なし（Vitest 対象, 3層疎結合）。
 * 描画（components/topics/test/PowerStepper.tsx）はこの結果を購読するだけ。
 */

import type { VizFrame } from "@/components/viz";
import { power, type Alternative } from "@/lib/stats/test";

/** 検出力曲線上の 1 点（n と検出力）。 */
export type PowerPoint = {
  /** 標本サイズ n。 */
  n: number;
  /** その n での検出力 1−β。 */
  power: number;
};

/** 各フレームで描画層が使う、n を i 段まで進めた時点のスナップショット。 */
export type PowerPayload = {
  /** いま注目している標本サイズ n。 */
  n: number;
  /** いまの検出力 1−β。 */
  power: number;
  /** いまの第二種の過誤 β。 */
  beta: number;
  /** いま開示した点の通し番号（1 始まり）。 */
  step: number;
  /** ここまでに開示した検出力曲線の点（このフレーム時点）。 */
  revealed: PowerPoint[];
};

const pct = (x: number) => `${(x * 100).toFixed(0)}%`;

/**
 * 標本サイズ列 nValues を 1 つずつ進める検出力コマ送りのフレーム列を作る。
 * フレーム i では曲線上の点 0..i が見えている状態。各フレームのコールアウトは
 * 「n をここまで増やすと検出力がいくつになるか」を述べ、n↑ → 検出力↑ を体感させる。
 */
export function buildPowerFrames(
  nValues: readonly number[],
  opts: { effectSize: number; alpha: number; alternative: Alternative },
): VizFrame<PowerPayload>[] {
  const points: PowerPoint[] = nValues.map((n) => ({
    n,
    power: power({ effectSize: opts.effectSize, n, alpha: opts.alpha, alternative: opts.alternative }),
  }));

  return points.map((p, i) => {
    const step = i + 1;
    const prev = i > 0 ? points[i - 1].power : null;
    const gain = prev === null ? null : p.power - prev;
    const body =
      gain === null
        ? `n=${p.n} のとき検出力は ${pct(p.power)}（β=${pct(1 - p.power)}）。ここが曲線の出発点。`
        : `n を ${points[i - 1].n}→${p.n} に増やすと検出力は ${pct(p.power)} に上がる（β=${pct(
            1 - p.power,
          )}、前段から ${gain >= 0 ? "+" : ""}${pct(gain)}）。`;
    return {
      payload: { n: p.n, power: p.power, beta: 1 - p.power, step, revealed: points.slice(0, step) },
      // いま開示した点を強調。
      highlights: [`pt-${i}`],
      callout: {
        title: `n=${p.n}：検出力 ${pct(p.power)}`,
        body,
        note: `効果量 d=${opts.effectSize}・α=${opts.alpha} は固定。n を増やすほど H1 分布が H0 から離れ、棄却域に入りやすくなる（検出力↑・β↓）。`,
        kind: p.power >= 0.8 ? "supplement" : "explain",
      },
    };
  });
}
