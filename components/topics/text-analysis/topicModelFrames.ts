/**
 * トピックモデル（簡易 k=2 クラスタリング）ステッパーのフレーム列ビルダー（計算層・純関数）。
 * lib/stats/text-analysis.ts の runSimpleTopicModel が返す反復ステップ（割り当て→中心更新の繰り返し）
 * を、1反復＝1フレームとして見せる（アルゴリズム図鑑スタイル）。副作用なし（Vitest 対象）。
 */

import type { VizFrame } from "@/components/viz";
import type { TopicModelStep } from "@/lib/stats/text-analysis";

export type TopicModelPayload = {
  iteration: number;
  assignment: number[];
  changedFromPrev: boolean[];
};

export function buildTopicModelFrames(steps: readonly TopicModelStep[]): VizFrame<TopicModelPayload>[] {
  return steps.map((step, i) => {
    const prev = i > 0 ? steps[i - 1].assignment : null;
    const changedFromPrev = step.assignment.map((c, d) => (prev ? c !== prev[d] : false));
    const changedCount = changedFromPrev.filter(Boolean).length;
    return {
      payload: { iteration: i + 1, assignment: step.assignment, changedFromPrev },
      highlights: step.assignment.map((_, d) => `topic-doc-${d}`),
      callout: {
        title: `反復${i + 1}回目: 最も近い中心（クラスタ平均ベクトル）へ割り当て`,
        body:
          i === 0
            ? "最初の中心は«互いに最もコサイン類似度が低い（似ていない）2文書»を選ぶ——乱数を使わない決定的な初期化。各文書を、コサイン類似度が高い方の中心のクラスタへ割り当てる。"
            : `前回の割り当てから中心（各クラスタの平均tf-idfベクトル）を計算し直し、再び各文書を近い方の中心へ割り当てた。${changedCount}文書の所属が前回から変わった。`,
        note: i > 0 && changedCount === 0 ? "所属が変わらなくなった＝収束。これ以上反復しても結果は変わらない。" : undefined,
      },
    };
  });
}
