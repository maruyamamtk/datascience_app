/**
 * 一般化線形モデルの «族ギャラリー» をコマ送りで見せるフレーム列ビルダー（計算層・純関数）。
 * ガウス（恒等リンク）→二項（ロジット）→ポアソン（対数）と、同じ «線形予測子 η=b0+b1x» を
 * 各リンクの逆関数で平均 μ に写す曲線を切り替えて、GLM が応答型ごとに姿を変える統一構造を見せる。
 * 副作用なし（Vitest 対象）。描画（GlmFamilyStepper.tsx）はこの結果を購読するだけ。
 */

import type { VizFrame } from "@/components/viz";
import { inverseLink, type GlmFamily } from "@/lib/stats/glm";

/** 各フレーム（ある族）のスナップショット。 */
export type FamilyPayload = {
  family: GlmFamily;
  /** 表示名。 */
  label: string;
  /** 応答の型。 */
  responseType: string;
  /** リンク関数名。 */
  link: string;
  /** η→μ の曲線点（x ごとの平均）。 */
  curve: { x: number; mu: number }[];
};

const defs: {
  family: GlmFamily;
  label: string;
  responseType: string;
  link: string;
  b0: number;
  b1: number;
  note: string;
}[] = [
  {
    family: "gaussian",
    label: "① 正規（線形回帰）",
    responseType: "連続値",
    link: "恒等 g(μ)=μ",
    b0: 0.2,
    b1: 0.5,
    note: "恒等リンクでは μ=η そのまま。ふつうの線形回帰。応答は連続値で、誤差は正規。",
  },
  {
    family: "binomial",
    label: "② 二項（ロジスティック回帰）",
    responseType: "2値 0/1",
    link: "ロジット g(μ)=log(μ/(1−μ))",
    b0: -1,
    b1: 1.2,
    note: "ロジットリンクの逆＝シグモイドで μ を0〜1の確率に。2値応答のロジスティック回帰。",
  },
  {
    family: "poisson",
    label: "③ ポアソン（ポアソン回帰）",
    responseType: "カウント 0,1,2,…",
    link: "対数 g(μ)=log μ",
    b0: 0.1,
    b1: 0.45,
    note: "対数リンクの逆＝exp で μ を正のカウント平均に。件数データのポアソン回帰。",
  },
];

/** 3つの族（正規/二項/ポアソン）のフレーム列を作る。 */
export function buildFamilyFrames(): VizFrame<FamilyPayload>[] {
  const xs = Array.from({ length: 41 }, (_, i) => -2 + (i / 40) * 6); // -2..4
  return defs.map((d) => ({
    payload: {
      family: d.family,
      label: d.label,
      responseType: d.responseType,
      link: d.link,
      curve: xs.map((x) => ({ x, mu: inverseLink(d.family, d.b0 + d.b1 * x) })),
    },
    highlights: [`fam-${d.family}`],
    callout: {
      title: d.label,
      body: `応答=${d.responseType}、リンク=${d.link}。線形予測子 η=b0+b1x を逆リンクで平均 μ に写す。`,
      note: d.note,
      kind: "explain",
    },
  }));
}
