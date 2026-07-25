import { betaPdf } from "@/lib/stats/continuous";
import {
  dropBurnIn,
  effectiveSampleSize,
  gibbsChain,
  metropolisHastingsChain,
  mhAcceptanceRate,
  mhSamples,
  splitRhat,
  type BetaParams,
  type GibbsHalfStep,
  type MhStep,
} from "@/lib/stats/mcmc-methods";
import { mulberry32 } from "@/lib/stats/random";
import { createTopicStore } from "./topicStore";

// ────────────────────────────────────────────────────────────
// 固定の目標分布: K-1(bayesian-basics)と同じ Beta(6,6) 事後分布
// （コイン投げ10回・5勝5敗・一様事前分布Beta(1,1)の結果）。
// 「共役性で解析的に求まる答えを、正規化定数を使わずMCMCで復元できるか」を確認できるようにする。
//
// 描画に使う密度は正規化済みの betaPdf（continuous.ts）を使う——受理確率は比 π(θ')/π(θ) だけで
// 決まり正規化定数は約分されて消えるため、正規化の有無に関わらず受理判定は完全に一致する
// （lib/stats/mcmc-methods.test.ts で kernel 版と数値一致することを直接テスト済み）。
// ここでは画面に出す数値が背景の曲線の高さとそのまま一致するよう、正規化済みの密度を使う。
// ────────────────────────────────────────────────────────────

export const TARGET_BETA: BetaParams = { alpha: 6, beta: 6 };
const targetDensity = (theta: number) => betaPdf(theta, TARGET_BETA.alpha, TARGET_BETA.beta);

// Level0(MHステッパー)のコマ送りに使う短いチェーンの長さ。
const MH_SHORT_STEPS = 12;
// Level2(収束診断)に使う長いチェーンの長さ・バーンイン。
const MH_LONG_STEPS = 400;
const MH_BURN_IN = 50;
const ESS_MAX_LAG = 60;

// Level1(ギブスサンプラー)のコマ送りに使うスイープ数。
const GIBBS_SWEEPS = 12;

// SSR/CSRで一致させるための固定シード（整数、乱数の再現性のみが目的）。
const MH_SEED = 20260722;
const GIBBS_SEED = 20260723;

export type MainControls = {
  /** Metropolis-Hastingsの提案分布(正規近似)の標準偏差。Level0の短いステッパーとLevel2の収束診断の両方に使う。 */
  proposalSd: number;
  /** ギブスサンプリングの目標2変量正規分布の相関係数(Level1)。 */
  gibbsRho: number;
};

export type MainDerived = {
  // Level0: MHステッパー用の短いチェーン
  mhShortChain: MhStep[];
  // Level1: ギブスサンプラー用の半ステップ列
  gibbsSteps: GibbsHalfStep[];
  // Level2: 収束診断用の長いチェーン
  mhLongChain: MhStep[];
  mhLongSamplesBurned: number[];
  acceptanceRate: number;
  rHat: number;
  ess: number;
};

export const INITIAL_CONTROLS: MainControls = {
  proposalSd: 0.3,
  gibbsRho: 0.8,
};

/**
 * ベイズ計算法(K-2, MCMC)トピックのZustandストア(single source of truth)。
 * Control層(提案分布の幅・ギブスの相関係数)はsetControlを呼び、Render層(トレース・ヒストグラム・
 * 数式ハイライト)はこのストアのcontrols・derivedを購読するだけ(3層疎結合)。
 *
 * ステッパーが2つ(MHステッパー・ギブスステッパー)同時にページ上へ存在するため、
 * このメインストアはframeを使わず(tasks/lessons.md #76)、各ステッパーは
 * 専用の空controlsストア(useMhStepperStore/useGibbsStepperStore、下記)のframeを使う。
 */
export const useMcmcMethodsStore = createTopicStore<MainControls, MainDerived>({
  initialControls: INITIAL_CONTROLS,
  derive: (controls) => {
    const mhShortChain = metropolisHastingsChain(
      0.5,
      targetDensity,
      controls.proposalSd,
      MH_SHORT_STEPS,
      mulberry32(MH_SEED),
    );

    const gibbsSteps = gibbsChain({ x: 0, y: 0 }, controls.gibbsRho, GIBBS_SWEEPS, mulberry32(GIBBS_SEED));

    const mhLongChain = metropolisHastingsChain(
      0.5,
      targetDensity,
      controls.proposalSd,
      MH_LONG_STEPS,
      mulberry32(MH_SEED + 1),
    );
    const mhLongSamplesBurned = dropBurnIn(mhSamples(mhLongChain), MH_BURN_IN);

    return {
      mhShortChain,
      gibbsSteps,
      mhLongChain,
      mhLongSamplesBurned,
      acceptanceRate: mhAcceptanceRate(mhLongChain),
      rHat: splitRhat(mhLongSamplesBurned),
      ess: effectiveSampleSize(mhLongSamplesBurned, ESS_MAX_LAG),
    };
  },
});

/**
 * コマ送りステッパー専用の «空 controls» ストア（Level0 MHStepper・Level1 GibbsStepper で使う）。
 * フレーム «中身» は各コンポーネントの frames.ts が純関数で作り、ストアは
 * `frame`（index/count/playing）だけを single source of truth として提供する
 * ——2つのステッパーが同一ページに同時に存在するため、メインストアの frame とは独立させる
 * （tasks/lessons.md #76 の判断目安）。
 */
export type EmptyControls = Record<string, never>;
export type EmptyDerived = Record<string, never>;

export const useMhStepperStore = createTopicStore<EmptyControls, EmptyDerived>({
  initialControls: {},
  derive: () => ({}),
});

export const useGibbsStepperStore = createTopicStore<EmptyControls, EmptyDerived>({
  initialControls: {},
  derive: () => ({}),
});
