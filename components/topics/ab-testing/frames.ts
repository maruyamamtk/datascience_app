/**
 * A/Bテストの «覗き見（peeking）で第一種の過誤が膨らむ» をコマ送りで見せるフレーム列ビルダー
 * （計算層・純関数）。真に差がない A/A データを固定シードでシミュレートし、チェック回数を
 * 1→2→5→10→20 と増やすと «一度でも有意になる» 割合が名目 5% を超えて上がる様子を追う
 * （アルゴリズム図鑑スタイル）。副作用なし（Vitest 対象）。描画は PeekingStepper.tsx が購読する。
 */

import type { VizFrame } from "@/components/viz";
import { peekingFalsePositiveRate } from "@/lib/stats/ab-test";
import { mulberry32 } from "@/lib/stats/random";

export const PEEK_ALPHA = 0.05;
const P0 = 0.2;
const PER_LOOK = 100;
const TRIALS = 1500;

/** チェック回数のスケジュール。 */
export const LOOK_SCHEDULE = [1, 2, 5, 10, 20] as const;

/** 各フレームのスナップショット。 */
export type PeekFramePayload = {
  /** このフレームでのチェック回数。 */
  looks: number;
  /** «一度でも有意» になった割合（＝実効的な第一種の過誤）。 */
  fpRate: number;
  /** 名目有意水準（比較線）。 */
  alpha: number;
};

/** 覗き見の手順フレーム列を作る（各スケジュール点で FP 率を固定シードで計算）。 */
export function buildPeekingFrames(): VizFrame<PeekFramePayload>[] {
  return LOOK_SCHEDULE.map((looks, i) => {
    // 各スケジュール点は同一シードから再スタート（累積の «覗き見回数だけ» を変える公平比較）。
    const fpRate = peekingFalsePositiveRate({
      looks,
      perLook: PER_LOOK,
      p0: P0,
      alpha: PEEK_ALPHA,
      trials: TRIALS,
      rng: mulberry32(20250064),
    });
    const first = i === 0;
    return {
      payload: { looks, fpRate, alpha: PEEK_ALPHA },
      highlights: [first ? "nominal" : "inflated"],
      callout: {
        title: first
          ? `① 最後に1回だけ見る：過誤 ≈ ${(fpRate * 100).toFixed(1)}%`
          : `${["", "②", "③", "④", "⑤"][i]} ${looks}回覗くと過誤 ${(fpRate * 100).toFixed(1)}%`,
        body: first
          ? "真に差がない（A/A）実験。データを最後まで貯めてから1回だけ有意性を見れば、有意になる確率は名目通り約5%（＝正しく制御された第一種の過誤）。"
          : `途中経過を ${looks} 回チェックし «有意になったら止める» と、一度でも 5% ラインを跨ぐ確率が上がり、実効的な過誤は ${(fpRate * 100).toFixed(1)}% に膨張。差がないのに «勝った» と誤判定しやすくなる。`,
        note: first
          ? "検定は «1回の判断» で 5% に制御されるよう作られている。"
          : "覗くほど «最大値» を見ていることになり、独立でない多重比較と同じ問題。対策：事前に標本サイズを決めて途中で止めない／逐次検定（有意水準を配分）／群逐次デザイン。",
        kind: first ? "explain" : "supplement",
      },
    };
  });
}
