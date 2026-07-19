/**
 * 「Q学習の更新式」ステッパー（Level1）のフレーム列ビルダー（計算層・純関数・Vitest 対象）。
 *
 * メインの GridWorldLab とは別に、«ある程度学習が進んだ状態» から1エピソード分だけ走らせ、
 * 各ステップで Q(s,a) ← Q(s,a) + α[r + γ·max_a' Q(s',a') − Q(s,a)] の項を1つずつ
 * 数式にハイライトしながら見せる（tasks/lessons.md: ステッパーは «見せたい本質だけを持つ»
 * 専用データで作ってよい）。学習前（Qテーブルが全て0）だと更新の中身が全て0になり
 * 教育的でないため、ウォームアップ済みのQテーブルから始める。
 * 描画は QUpdateStepper.tsx。
 */

import type { CalloutKind, VizFrame } from "@/components/viz";
import { ACTION_ARROW, ACTIONS, type EpisodeStep, makeLcg, runEpisode, trainEpisodes } from "@/lib/stats/reinforcement-learning";

export const Q_STEPPER_WARMUP_EPISODES = 60;
export const Q_STEPPER_SEED = 271828;
export const Q_STEPPER_WARMUP_EPSILON = 0.15;
export const Q_STEPPER_DEMO_EPSILON = 0.2;
export const Q_STEPPER_DEMO_SEED_OFFSET = 8;
export const Q_STEPPER_ALPHA = 0.5;
export const Q_STEPPER_GAMMA = 0.9;
export const Q_STEPPER_MAX_STEPS = 60;
export const Q_STEPPER_DEMO_STEPS = 8;

export type QUpdateFramePayload = {
  step: EpisodeStep;
  stepNumber: number;
  totalSteps: number;
};

/**
 * ウォームアップ学習済みのQテーブルから、決定的な乱数列で1エピソードの先頭
 * Q_STEPPER_DEMO_STEPS 歩だけを実行して返す（探索1回＋残りは活用でゴールへ辿り着く、
 * という教育的に見通しの良い短いデモ列になるよう seed を選定した）。
 * ウォームアップ（trainEpisodes）とデモ（runEpisode）は互いに独立した seed の
 * rng を使う——同じ乱数列を2回消費し直す必要がなく、決定性はそのまま保たれる。
 */
export function buildQUpdateDemoSteps(): EpisodeStep[] {
  const warmup = trainEpisodes(
    Q_STEPPER_WARMUP_EPISODES,
    Q_STEPPER_WARMUP_EPSILON,
    Q_STEPPER_ALPHA,
    Q_STEPPER_GAMMA,
    Q_STEPPER_SEED,
    Q_STEPPER_MAX_STEPS,
  );
  const demoRng = makeLcg(Q_STEPPER_SEED + Q_STEPPER_DEMO_SEED_OFFSET);
  const demo = runEpisode(warmup.qTable, Q_STEPPER_DEMO_EPSILON, Q_STEPPER_ALPHA, Q_STEPPER_GAMMA, demoRng, Q_STEPPER_DEMO_STEPS);
  return demo.steps;
}

/** Q学習更新ステッパーのフレーム列を作る（1ステップ=1フレーム）。 */
export function buildQUpdateFrames(steps: EpisodeStep[] = buildQUpdateDemoSteps()): VizFrame<QUpdateFramePayload>[] {
  return steps.map((step, i) => {
    const arrow = ACTION_ARROW[ACTIONS[step.action]];
    const isLast = i === steps.length - 1;
    let note: string | undefined;
    let kind: CalloutKind = "explain";
    if (step.done) {
      note = step.reward > 0 ? "ゴールに到達——大きな正の報酬が入り、この行動の価値が跳ね上がる。" : "落とし穴に落ちた——大きな負の報酬が入り、この行動の価値が大きく下がる。";
      kind = "supplement";
    } else if (isLast) {
      note = "続きのエピソードでも同じ更新式が繰り返され、Qテーブル全体が少しずつ真の値に近づいていく。";
      kind = "supplement";
    }

    return {
      payload: { step, stepNumber: i + 1, totalSteps: steps.length },
      highlights: [step.explored ? "explore" : "exploit"],
      callout: {
        title: `${i + 1}手目: 行動 ${arrow}（${step.explored ? "探索（ランダム）" : "活用（貪欲）"}）`,
        body: `報酬 r=${step.reward} を受け取り、TD誤差 ${step.update.tdError.toFixed(2)} の分だけ Q(s,a) を ${step.update.qBefore.toFixed(2)} → ${step.update.qAfter.toFixed(2)} に更新した。`,
        note,
        kind,
      },
    };
  });
}
