/**
 * 潜在的結果（Rubin 因果モデル）の «神の視点→根本問題→交絡した割り当て→素朴比較のバイアス→層別調整»
 * をコマ送りで見せるフレーム列ビルダー（計算層・純関数）。6個体の固定例で «相関≠因果» を追う
 * （アルゴリズム図鑑スタイル）。副作用なし（Vitest 対象）。描画は PotentialOutcomesStepper.tsx が購読する。
 */

import type { VizFrame } from "@/components/viz";

/** ステッパー用の1個体（手作りの分かりやすい例）。値が大きいほど «回復» が良い。 */
export type DemoUnit = {
  id: number;
  /** 交絡変数（0=軽症/1=重症）。重症ほど回復が低く、かつ治療されやすい。 */
  severe: boolean;
  /** 処置なしの潜在結果 Y(0)。 */
  y0: number;
  /** 処置ありの潜在結果 Y(1)。全個体で Y(1)−Y(0)=+2（真の効果）。 */
  y1: number;
  /** 実際の割り当て（交絡：重症ほど treated が多い）。 */
  treated: boolean;
};

/** 6個体：重症3（低ベースライン・多くが治療）／軽症3（高ベースライン・多くが対照）。真の効果は全員 +2。 */
export const DEMO_UNITS: DemoUnit[] = [
  { id: 1, severe: true, y0: 4, y1: 6, treated: true },
  { id: 2, severe: true, y0: 4, y1: 6, treated: true },
  { id: 3, severe: true, y0: 4, y1: 6, treated: false },
  { id: 4, severe: false, y0: 8, y1: 10, treated: false },
  { id: 5, severe: false, y0: 8, y1: 10, treated: false },
  { id: 6, severe: false, y0: 8, y1: 10, treated: true },
];

export const TRUE_ATE = 2;

/** 手順のステージ。 */
export type CausalStage = "god" | "observed" | "assignment" | "naive" | "adjust";

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/** 観測結果（treated なら Y(1)、対照なら Y(0)）。 */
function observed(u: DemoUnit): number {
  return u.treated ? u.y1 : u.y0;
}

/** 各フレームのスナップショット。 */
export type CausalFramePayload = {
  stage: CausalStage;
  units: DemoUnit[];
  trueAte: number;
  naive: number;
  adjusted: number;
  /** 処置群の観測平均。 */
  treatedMean: number;
  /** 対照群の観測平均。 */
  controlMean: number;
};

/** 潜在的結果の手順フレーム列を作る。 */
export function buildCausalFrames(): VizFrame<CausalFramePayload>[] {
  const units = DEMO_UNITS;
  const treatedMean = mean(units.filter((u) => u.treated).map(observed));
  const controlMean = mean(units.filter((u) => !u.treated).map(observed));
  const naive = treatedMean - controlMean;

  // 層別調整（重症/軽症それぞれで処置−対照 → 加重）。
  const strata = [true, false];
  let adjusted = 0;
  for (const s of strata) {
    const g = units.filter((u) => u.severe === s);
    const t = g.filter((u) => u.treated).map(observed);
    const c = g.filter((u) => !u.treated).map(observed);
    if (t.length && c.length) adjusted += (g.length / units.length) * (mean(t) - mean(c));
  }

  const base = { units, trueAte: TRUE_ATE, naive, adjusted, treatedMean, controlMean };

  return [
    {
      payload: { ...base, stage: "god" },
      highlights: ["both"],
      callout: {
        title: "① 神の視点：各個体に «2つの潜在結果»",
        body: "もし処置したら Y(1)、しなかったら Y(0)。その差 Y(1)−Y(0) が «その人の処置効果»（個体処置効果）。ここでは全員 +2。全個体の平均が真の平均処置効果 ATE=+2。",
        note: "潜在的結果（Rubin 因果モデル）：因果効果は «同じ人の処置あり/なしの差» として定義される。",
        kind: "explain",
      },
    },
    {
      payload: { ...base, stage: "observed" },
      highlights: ["observed"],
      callout: {
        title: "② 因果推論の根本問題：片方しか見えない",
        body: "実際に観測できるのは «実際に受けた方» の結果だけ。処置した人の Y(0)、しなかった人の Y(1) は永遠に «反事実»（?）で欠測。だから個人の効果は直接測れない。",
        note: "1人では差が取れないので、«処置群と対照群の平均» を比べて集団の効果を推定するしかない。",
        kind: "explain",
      },
    },
    {
      payload: { ...base, stage: "assignment" },
      highlights: ["confounder"],
      callout: {
        title: "③ 交絡：重症ほど治療されやすい",
        body: "重症（低ベースライン）ほど治療を受けやすく、軽症（高ベースライン）は対照に回りやすい。すると処置群には «元々回復が低い人» が偏って集まる——交絡変数（重症度）が処置と結果の両方に効く。",
        note: "交絡があると «処置群と対照群» はそもそも別物の集団。この不均衡が素朴な比較を歪める。",
        kind: "supplement",
      },
    },
    {
      payload: { ...base, stage: "naive" },
      highlights: ["naive"],
      callout: {
        title: `④ 素朴比較のバイアス：${naive.toFixed(2)} ≠ 真の効果 2`,
        body: `処置群の平均 ${treatedMean.toFixed(2)} − 対照群の平均 ${controlMean.toFixed(2)} = ${naive.toFixed(2)}。真の効果は +2 なのに過小評価。処置群に重症（低ベースライン）が多いせいで、効果が «薄まって» 見える。これが «相関≠因果»。`,
        note: "単純な群間比較（相関）は交絡で真の因果効果からズレる。差が出ても・出なくても、交絡を疑う必要がある。",
        kind: "supplement",
      },
    },
    {
      payload: { ...base, stage: "adjust" },
      highlights: ["adjust"],
      callout: {
        title: `⑤ 層別調整で真の効果を回復：${adjusted.toFixed(2)}`,
        body: "重症どうし・軽症どうし «同じ条件の中» で処置群と対照群を比べ、層の大きさで加重平均する。各層で +2 が出て、調整後 ATE=+2 と真値に一致。交絡変数で層別＝バックドアを塞ぐ最も単純な形。",
        note: "無作為化できれば割り当てが交絡と無関係になり、そもそも群が均衡して素朴比較で因果が測れる。観察データでは層別・回帰・傾向スコアなどで «同じ条件で比べる» を作る。",
        kind: "supplement",
      },
    },
  ];
}
