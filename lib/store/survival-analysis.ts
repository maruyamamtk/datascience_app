import {
  censoredFraction,
  generateSurvival,
  kaplanMeier,
  logRankTest,
  medianSurvival,
  type KMStep,
  type SurvObs,
} from "@/lib/stats/survival";
import { mulberry32 } from "@/lib/stats/random";
import { createTopicStore } from "./topicStore";

/** 1群あたりの標本サイズ（KM は距離ごとに走査するので控えめに）。 */
export const N = 240;
export const MAX_TIME = 24;

/** 生存時間解析ラボの操作値。 */
export type SurvControls = {
  /** 群A（処置）のハザード。 */
  hazardA: number;
  /** 群B（対照）のハザード。 */
  hazardB: number;
  /** 打ち切りの起こりやすさ。 */
  censorRate: number;
};

/** 生存時間解析ラボの派生値。 */
export type SurvDerived = {
  obsA: SurvObs[];
  obsB: SurvObs[];
  kmA: KMStep[];
  kmB: KMStep[];
  medianA: number;
  medianB: number;
  /** ハザード比（B/A の理論値）。 */
  hazardRatio: number;
  /** 打ち切り割合（両群まとめ）。 */
  censored: number;
  logrank: { chi2: number; pValue: number; observedA: number; expectedA: number };
};

/**
 * 生存時間解析（O-2）トピックの Zustand ストア（single source of truth）。
 * Control 層（2群のハザード・打ち切り率）は action を呼び、Render 層（SurvivalLab の
 * カプラン–マイヤー階段曲線・打ち切り記号・中央値・ログランク検定の強連動数式）は controls・derived を購読する。
 * ハザードが違うほど曲線が離れログランクが有意に、打ち切りを増やすと «段差» が疎になるのを体感する。
 * frame はカプラン–マイヤー構成ステッパーが使う。
 */
export const useSurvivalStore = createTopicStore<SurvControls, SurvDerived>({
  initialControls: { hazardA: 0.25, hazardB: 0.55, censorRate: 0.12 },
  derive: ({ hazardA, hazardB, censorRate }) => {
    const obsA = generateSurvival({ n: N, hazard: hazardA, censorRate, maxTime: MAX_TIME, rng: mulberry32(20250681) });
    const obsB = generateSurvival({ n: N, hazard: hazardB, censorRate, maxTime: MAX_TIME, rng: mulberry32(20250682) });
    const kmA = kaplanMeier(obsA);
    const kmB = kaplanMeier(obsB);
    return {
      obsA,
      obsB,
      kmA,
      kmB,
      medianA: medianSurvival(kmA),
      medianB: medianSurvival(kmB),
      hazardRatio: hazardA > 0 ? hazardB / hazardA : Number.NaN,
      censored: censoredFraction([...obsA, ...obsB]),
      logrank: logRankTest(obsA, obsB),
    };
  },
});
