/**
 * カプラン–マイヤー推定量の «リスク集合→イベント→積・極限で S を更新» をコマ送りで見せる
 * フレーム列ビルダー（計算層・純関数）。6個体の固定例（打ち切り含む）で階段の作られ方を追う
 * （アルゴリズム図鑑スタイル）。副作用なし（Vitest 対象）。描画は KaplanMeierStepper.tsx が購読する。
 */

import type { VizFrame } from "@/components/viz";
import { kaplanMeier, type SurvObs } from "@/lib/stats/survival";

/** 表示用の6個体（時間・イベント/打ち切り）。 */
export const DEMO: SurvObs[] = [
  { time: 2, event: true },
  { time: 3, event: true },
  { time: 4, event: false }, // 打ち切り
  { time: 5, event: true },
  { time: 8, event: true },
  { time: 8, event: false }, // 打ち切り
];

const STEPS = kaplanMeier(DEMO);

export type KMFramePayload = {
  /** 進行度：−1=導入（全個体表示）、0..=STEPS の index。 */
  stepIndex: number;
  /** 現在のステップ（導入では null）。 */
  time: number | null;
  atRisk: number | null;
  events: number | null;
  /** そのステップ後の生存確率。導入では 1。 */
  survival: number;
};

/** カプラン–マイヤー構成のフレーム列を作る。 */
export function buildKaplanMeierFrames(): VizFrame<KMFramePayload>[] {
  const frames: VizFrame<KMFramePayload>[] = [
    {
      payload: { stepIndex: -1, time: null, atRisk: null, events: null, survival: 1 },
      highlights: ["intro"],
      callout: {
        title: "① 6個体を時間順に並べる（× は打ち切り）",
        body: "イベント（死亡）した人と、途中で観測が終わった «打ち切り»（追跡終了・脱落）の人が混じる。打ち切りは «その時点までは生存していた» という情報を持つので、捨てずに使う。",
        note: "打ち切りがあると単純な «死亡数/全体» では生存率を出せない。カプラン–マイヤーが要る。",
        kind: "explain",
      },
    },
  ];
  STEPS.forEach((s, i) => {
    const marks = ["", "②", "③", "④", "⑤", "⑥"][i + 1] ?? `(${i + 1})`;
    frames.push({
      payload: { stepIndex: i, time: s.time, atRisk: s.atRisk, events: s.events, survival: s.survival },
      highlights: ["step"],
      callout: {
        title: `${marks} 時刻 t=${s.time}：リスク ${s.atRisk} 人・死亡 ${s.events} → S=${s.survival.toFixed(3)}`,
        body: `この時刻の «リスク集合»（まだ観測中の人）は ${s.atRisk} 人、うち死亡 ${s.events} 人。条件付き生存 (1−${s.events}/${s.atRisk}) を直前の S に掛けて更新：S(${s.time})=${s.survival.toFixed(3)}。`,
        note:
          i === STEPS.length - 1
            ? "打ち切りはリスク集合を減らすだけで «段差» を作らない——それが情報を無駄にしない仕組み。"
            : "打ち切りの直後はリスク集合が1人減る（例：t=4 の打ち切りで t=5 のリスクが減る）。",
        kind: "supplement",
      },
    });
  });
  return frames;
}
