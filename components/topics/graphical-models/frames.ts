/**
 * d分離の «連鎖→分岐→合流» をコマ送りで見せるフレーム列ビルダー（計算層・純関数）。
 * 3つの基本構造で «B を条件づける» と A,C の（条件付き）独立がどう変わるかを、固定シードの実測相関で追う。
 * 連鎖/分岐は条件づけで遮断、合流は条件づけで «逆に» 開く——ここが d分離の肝（アルゴリズム図鑑スタイル）。
 * 副作用なし（Vitest 対象）。描画は StructureStepper.tsx が購読する。
 */

import type { VizFrame } from "@/components/viz";
import { acDependence, generateTriples, type Structure } from "@/lib/stats/graphical";
import { mulberry32 } from "@/lib/stats/random";

const N = 4000;
const W = 0.9;

/** 固定シードの3構造データの実測相関。 */
function measure(structure: Structure, seed: number) {
  return acDependence(generateTriples({ structure, n: N, w: W, rng: mulberry32(seed) }));
}
const CHAIN = measure("chain", 20250651);
const FORK = measure("fork", 20250652);
const COLLIDER = measure("collider", 20250653);

/** 各フレームのスナップショット。 */
export type StructFramePayload = {
  structure: Structure;
  /** B を条件づけているか。 */
  conditioned: boolean;
  /** 周辺相関 corr(A,C)。 */
  marginal: number;
  /** 偏相関 corr(A,C·B)。 */
  partial: number;
  /** この設定で d分離（条件付き独立）か。 */
  dsep: boolean;
};

/** d分離の手順フレーム列を作る。 */
export function buildStructureFrames(): VizFrame<StructFramePayload>[] {
  return [
    {
      payload: { structure: "chain", conditioned: false, marginal: CHAIN.marginal, partial: CHAIN.partialGivenB, dsep: false },
      highlights: ["path"],
      callout: {
        title: `① 連鎖 A→B→C：周辺は繋がる（corr≈${CHAIN.marginal.toFixed(2)}）`,
        body: "A の影響が B を通って C に伝わるので、A と C は（B を見なければ）相関する。情報が流れる «開いた経路»。",
        note: "例：喫煙→タール→肺がん。間の B を無視すると両端は繋がって見える。",
        kind: "explain",
      },
    },
    {
      payload: { structure: "chain", conditioned: true, marginal: CHAIN.marginal, partial: CHAIN.partialGivenB, dsep: true },
      highlights: ["blocked"],
      callout: {
        title: `② 連鎖で B を条件づけ：遮断（偏相関≈${CHAIN.partialGivenB.toFixed(2)}）`,
        body: "中間の B の値を固定（観測）すると、A から C への経路が塞がれ、A と C は条件付き独立になる。B を知れば A の追加情報は C に効かない。",
        note: "d分離のルール：連鎖の中間ノードを条件づけると経路は «閉じる»。",
        kind: "supplement",
      },
    },
    {
      payload: { structure: "fork", conditioned: true, marginal: FORK.marginal, partial: FORK.partialGivenB, dsep: true },
      highlights: ["blocked"],
      callout: {
        title: `③ 分岐 A←B→C：共通原因。B で条件づけると遮断（${FORK.marginal.toFixed(2)}→${FORK.partialGivenB.toFixed(2)}）`,
        body: `共通原因 B が A,C を相関させる（周辺 corr≈${FORK.marginal.toFixed(2)}）——これは «見せかけの相関»（交絡）。B を条件づけると偏相関がほぼ0に落ち、A,C は条件付き独立に。`,
        note: "交絡の除去＝共通原因で層別（条件づけ）。連鎖と同じく «分岐の中心を条件づけると閉じる»。",
        kind: "supplement",
      },
    },
    {
      payload: { structure: "collider", conditioned: false, marginal: COLLIDER.marginal, partial: COLLIDER.partialGivenB, dsep: true },
      highlights: ["blocked"],
      callout: {
        title: `④ 合流 A→B←C：周辺は独立（corr≈${COLLIDER.marginal.toFixed(2)}）`,
        body: "A と C は独立な原因で、B は両者の共通の «結果»。何も条件づけなければ A,C は無相関（d分離）。ここまでの2つとは «閉じている向き» が逆。",
        note: "合流点（コライダー）は、条件づけない限り経路を «閉じている»。",
        kind: "explain",
      },
    },
    {
      payload: { structure: "collider", conditioned: true, marginal: COLLIDER.marginal, partial: COLLIDER.partialGivenB, dsep: false },
      highlights: ["opened"],
      callout: {
        title: `⑤ 合流で B を条件づけ：逆に «開く»（偏相関≈${COLLIDER.partialGivenB.toFixed(2)}）`,
        body: `合流点 B（またはその子孫）を条件づけると、独立だった A,C の間に見せかけの依存が生まれる（偏相関≈${COLLIDER.partialGivenB.toFixed(2)}）。«B が高いのに A が低いなら C は高いはず» という説明のしあいが起きる（選択バイアス）。`,
        note: "d分離の最重要例外：合流点は «条件づけると開く»。むやみに変数を調整に入れてはいけない理由。",
        kind: "supplement",
      },
    },
  ];
}
