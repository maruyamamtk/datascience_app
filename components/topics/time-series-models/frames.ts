/**
 * 時系列モデルの «型» を白色雑音→AR(1)→MA(1)→ランダムウォークとギャラリー形式でコマ送りする
 * フレーム列ビルダー（計算層・純関数）。各モデルの標本パスと自己相関の «指紋»（ACF の形）を並べ、
 * モデルごとの記憶の違いを対比する（アルゴリズム図鑑スタイル）。
 * 副作用なし（Vitest 対象）。描画は ModelGalleryStepper.tsx が購読する。
 */

import type { VizFrame } from "@/components/viz";
import { mulberry32 } from "@/lib/stats/random";
import { simulateAR1, simulateMA1, simulateRandomWalk } from "@/lib/stats/arima";
import { acf } from "@/lib/stats/time-series";

export const GALLERY_N = 120;
export const GALLERY_MAXLAG = 16;

/** モデルの種類。 */
export type ModelKind = "white" | "ar" | "ma" | "walk";

/** 各フレーム（あるモデル）のスナップショット。 */
export type ModelFramePayload = {
  kind: ModelKind;
  /** モデル名。 */
  name: string;
  /** 標本パス。 */
  series: number[];
  /** 標本自己相関 ρ(0..maxLag)。 */
  acf: number[];
  /** 定常か。 */
  stationary: boolean;
};

/** 白色雑音（AR(1) の φ=0）。 */
function whiteNoise(rng: ReturnType<typeof mulberry32>): number[] {
  return simulateAR1({ phi: 0, sigma: 1, n: GALLERY_N, rng });
}

/** 4モデルのギャラリーフレームを作る。 */
export function buildModelFrames(): VizFrame<ModelFramePayload>[] {
  const specs: {
    kind: ModelKind;
    name: string;
    series: number[];
    stationary: boolean;
    callout: { title: string; body: string; note: string; kind: "explain" | "supplement" };
  }[] = [
    {
      kind: "white",
      name: "ホワイトノイズ",
      series: whiteNoise(mulberry32(20250591)),
      stationary: true,
      callout: {
        title: "① ホワイトノイズ e_t（構造ゼロの基準）",
        body: "無相関のランダムなゆらぎ。前の値から次を予測する手がかりが無い。ACF はラグ0で1、それ以外はほぼ0（信頼限界内）。",
        note: "すべてのモデルの «素材»。良いモデルは、系列の構造を説明し尽くして残差をここまで白色化する。",
        kind: "explain",
      },
    },
    {
      kind: "ar",
      name: "AR(1) φ=0.8",
      series: simulateAR1({ phi: 0.8, sigma: 1, n: GALLERY_N, rng: mulberry32(20250592) }),
      stationary: true,
      callout: {
        title: "② AR(1)：x_t = φ·x_{t-1} + e_t（前の値を引きずる）",
        body: "直前の値に φ を掛けて受け継ぐ自己回帰。φ=0.8 なので滑らかに «うねる»。ACF は φ^k で指数的にゆっくり減衰＝長く尾を引く記憶。",
        note: "自己相関が «だんだん» 消えるのが AR の指紋。φ が1に近いほど記憶が長い。",
        kind: "explain",
      },
    },
    {
      kind: "ma",
      name: "MA(1) θ=0.8",
      series: simulateMA1({ theta: 0.8, sigma: 1, n: GALLERY_N, rng: mulberry32(20250593) }),
      stationary: true,
      callout: {
        title: "③ MA(1)：x_t = e_t + θ·e_{t-1}（直近ショックの重ね合わせ）",
        body: "直近2つのショックだけを混ぜる移動平均。記憶が有限で、ACF はラグ1だけ非0、ラグ2以降ぴたりと0に «切れる»。",
        note: "自己相関が «ある次数で急に» 消えるのが MA の指紋。AR（だらだら減衰）との対比が次数決定の鍵。",
        kind: "supplement",
      },
    },
    {
      kind: "walk",
      name: "ランダムウォーク（ARIMA(0,1,0)）",
      series: simulateRandomWalk({ sigma: 1, n: GALLERY_N, rng: mulberry32(20250594) }),
      stationary: false,
      callout: {
        title: "④ ランダムウォーク：x_t = x_{t-1} + e_t（φ=1・非定常）",
        body: "前の値をそのまま受け継ぎ、ショックが消えずに積み上がる。分散が t で増える非定常。ACF は減衰せず «ずっと高い» まま。",
        note: "階差 Δx_t を取ると ① ホワイトノイズに戻る＝定常化。これが ARIMA の I（和分）。d 回階差で定常にしてから ARMA を当てる。",
        kind: "supplement",
      },
    },
  ];

  return specs.map((s) => ({
    payload: {
      kind: s.kind,
      name: s.name,
      series: s.series,
      acf: acf(s.series, GALLERY_MAXLAG),
      stationary: s.stationary,
    },
    highlights: [`model-${s.kind}`, "acf"],
    callout: s.callout,
  }));
}
