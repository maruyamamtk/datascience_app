/**
 * 残差プロットの «パターン図鑑» をコマ送りで見せるフレーム列ビルダー（計算層・純関数）。
 * 良い当てはめ / 非線形 / 不等分散 / 外れ値 の4シナリオの残差点列を生成し、«何が崩れているか» を提示する。
 * 副作用なし（Vitest 対象）。描画（ResidualPatternStepper.tsx）はこの結果を購読するだけ。
 */

import type { VizFrame } from "@/components/viz";
import { fitSimple } from "@/lib/stats/regression-diagnostics";
import { mulberry32 } from "@/lib/stats/random";

/** 各フレーム（あるシナリオの残差プロット）のスナップショット。 */
export type PatternPayload = {
  /** シナリオ名。 */
  kind: "good" | "nonlinear" | "hetero" | "outlier";
  /** 表示名。 */
  label: string;
  /** 残差プロット点（横=予測値, 縦=残差）。 */
  points: { fitted: number; residual: number }[];
};

const N = 40;

/** 4つの残差パターン（良い/非線形/不等分散/外れ値）のフレーム列を作る。決定的。 */
export function buildPatternFrames(): VizFrame<PatternPayload>[] {
  const rng = mulberry32(20240803);
  const xs = Array.from({ length: N }, (_, i) => 1 + (i / (N - 1)) * 9); // 1..10

  const make = (gen: (x: number) => number) => {
    const y = xs.map(gen);
    const fit = fitSimple(xs, y);
    return fit.fitted.map((f, i) => ({ fitted: f, residual: fit.residuals[i] }));
  };

  const noise = () => (rng() - 0.5) * 2;
  const defs: {
    kind: PatternPayload["kind"];
    label: string;
    gen: (x: number) => number;
    note: string;
  }[] = [
    {
      kind: "good",
      label: "① 良い当てはめ（前提OK）",
      gen: (x) => 2 * x + noise(),
      note: "残差が0の周りに «均一にランダム» に散らばる。パターンなし＝線形・等分散・無相関が満たされている理想形。",
    },
    {
      kind: "nonlinear",
      label: "② 非線形（曲がり）",
      gen: (x) => 0.3 * x * x + noise(),
      note: "残差に «U字» など曲線パターンが出る＝直線では捉えきれない。多項式項や変数変換が必要。",
    },
    {
      kind: "hetero",
      label: "③ 不等分散（裾が広がる）",
      gen: (x) => 2 * x + noise() * x * 0.5,
      note: "残差の «ばらつき» が予測値とともに広がる（ラッパ型）＝等分散の崩れ。加重最小二乗や変数変換で対処。",
    },
    {
      kind: "outlier",
      label: "④ 外れ値",
      gen: (x) => 2 * x + noise() + (x > 9.5 ? 15 : 0),
      note: "1点だけ大きく外れる＝外れ値。てこ比が高いと回帰直線を引っ張る（影響点）。標準化残差 |>2| で検出。",
    },
  ];

  return defs.map((d) => ({
    payload: { kind: d.kind, label: d.label, points: make(d.gen) },
    highlights: [`pat-${d.kind}`],
    callout: {
      title: d.label,
      body: d.note,
      note: "残差プロット（横=予測値, 縦=残差）の «形» で前提の崩れを読む。良い当てはめは «模様なし»。",
      kind: d.kind === "good" ? "explain" : "supplement",
    },
  }));
}
