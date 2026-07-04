/**
 * ブートストラップの «復元抽出→統計量→分布の構築→信頼区間» をコマ送りで見せるフレーム列ビルダー
 * （計算層・純関数）。元標本から再標本を1つずつ引き、その平均を積み上げてブートストラップ分布を作り、
 * 最後にパーセンタイル信頼区間を提示する（アルゴリズム図鑑スタイル）。
 * 副作用なし（Vitest 対象）。描画（BootstrapStepper.tsx）はこの結果を購読するだけ。
 */

import type { VizFrame } from "@/components/viz";
import { mulberry32 } from "@/lib/stats/random";
import {
  bootstrapStandardError,
  mean,
  percentileInterval,
  resample,
} from "@/lib/stats/monte-carlo";

/** ステッパーで使う固定の元標本（体感用の小さな例）。 */
export const SAMPLE = [3, 5, 5, 6, 8, 9, 11, 14] as const;

/** 個々に見せる復元抽出の回数（この後は «一気に» B 回まで積む）。 */
const SHOWN_RESAMPLES = 6;
/** 最終的に積み上げるブートストラップ標本数。 */
const TOTAL_B = 600;

/** 各フレームのスナップショット。 */
export type BootstrapFramePayload = {
  kind: "original" | "resample" | "grow" | "summary";
  /** 元標本（常に表示）。 */
  sample: number[];
  /** その回に引いた再標本（resample フレームのみ）。 */
  drawn: number[] | null;
  /** これまでに積んだブートストラップ統計量（平均）の列。 */
  stats: number[];
  /** 元標本の平均（基準線）。 */
  sampleMean: number;
  /** 現時点のブートストラップ標準誤差。 */
  se: number;
  /** 95% パーセンタイル信頼区間（summary で確定）。 */
  ci: [number, number] | null;
};

/** ブートストラップの全過程フレームを作る。 */
export function buildBootstrapFrames(): VizFrame<BootstrapFramePayload>[] {
  const sample = [...SAMPLE];
  const sampleMean = mean(sample);
  const rng = mulberry32(20250572);
  const frames: VizFrame<BootstrapFramePayload>[] = [];
  const stats: number[] = [];

  // フレーム0：元標本。
  frames.push({
    payload: {
      kind: "original",
      sample,
      drawn: null,
      stats: [],
      sampleMean,
      se: 0,
      ci: null,
    },
    highlights: ["sample"],
    callout: {
      title: "元の標本（n=8）",
      body: `手元にあるのはこの1組の標本だけ。標本平均は ${sampleMean.toFixed(2)}。「この平均はどれくらいブレるのか？」を、追加のデータ無しに知りたい。`,
      note: "母集団からもう一度サンプリングし直すことはできない。そこで «手元の標本を母集団の代わり» に見立てて、そこから引き直す（＝ブートストラップ）。",
      kind: "explain",
    },
  });

  // フレーム1..SHOWN：復元抽出を1つずつ見せる。
  for (let b = 0; b < SHOWN_RESAMPLES; b++) {
    const drawn = resample(sample, rng);
    const stat = mean(drawn);
    stats.push(stat);
    frames.push({
      payload: {
        kind: "resample",
        sample,
        drawn,
        stats: [...stats],
        sampleMean,
        se: bootstrapStandardError(stats),
        ci: null,
      },
      highlights: ["resample", "hist"],
      callout: {
        title: `復元抽出 #${b + 1}：平均 ${stat.toFixed(2)}`,
        body: `元標本から «重複を許して» 同じ8個を引き直した。同じ値が何度も選ばれ得る（重み付けが揺れる）。この再標本の平均 ${stat.toFixed(2)} を1点、下のヒストグラムに積む。`,
        note: "1回ごとに平均が少しずつ違う。この «違い» こそ推定したかった標本平均のばらつき。",
        kind: "explain",
      },
    });
  }

  // フレーム：残りを一気に TOTAL_B まで積む。
  for (let b = SHOWN_RESAMPLES; b < TOTAL_B; b++) {
    stats.push(mean(resample(sample, rng)));
  }
  frames.push({
    payload: {
      kind: "grow",
      sample,
      drawn: null,
      stats: [...stats],
      sampleMean,
      se: bootstrapStandardError(stats),
      ci: null,
    },
    highlights: ["hist"],
    callout: {
      title: `一気に ${TOTAL_B} 回まで反復`,
      body: `同じ操作を ${TOTAL_B} 回繰り返すと、再標本平均のヒストグラムが釣鐘型に整う。これが «ブートストラップ分布»＝標本平均の標本分布の推定。`,
      note: `その広がり（標準偏差）がブートストラップ標準誤差 SE ≈ ${bootstrapStandardError(stats).toFixed(3)}。理論値 s/√n に近い。`,
      kind: "supplement",
    },
  });

  // 最終：パーセンタイル信頼区間。
  const ci = percentileInterval(stats, 0.05);
  frames.push({
    payload: {
      kind: "summary",
      sample,
      drawn: null,
      stats: [...stats],
      sampleMean,
      se: bootstrapStandardError(stats),
      ci,
    },
    highlights: ["ci"],
    callout: {
      title: `95% 信頼区間 [${ci[0].toFixed(2)}, ${ci[1].toFixed(2)}]`,
      body: "ブートストラップ分布の下側2.5%・上側97.5%点をそのまま読むだけで信頼区間になる（パーセンタイル法）。正規性の仮定も公式も要らない。",
      note: "解析的に標準誤差が出せない統計量（中央値・相関・分位点など）でも、同じ手順でそのばらつきと区間が得られるのがブートストラップの強み。",
      kind: "supplement",
    },
  });

  return frames;
}
