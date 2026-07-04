import {
  densityCurve,
  integratedSquaredError,
  kde,
  silvermanBandwidth,
  type KernelKind,
} from "@/lib/stats/kde";
import { normalPdf } from "@/lib/stats/normal";
import { mulberry32 } from "@/lib/stats/random";
import { createTopicStore } from "./topicStore";

/** 表示・評価レンジ。 */
export const KDE_RANGE = { min: -5, max: 6, steps: 160 };

/** 真の密度：二峰性の混合正規 0.6·N(−1.5,0.6²) + 0.4·N(2,0.8²)。 */
export function trueDensity(x: number): number {
  return 0.6 * normalPdf(x, -1.5, 0.6) + 0.4 * normalPdf(x, 2, 0.8);
}

/** 真の密度から生成した固定データ（決定的）。 */
export const KDE_DATA: number[] = (() => {
  const rng = mulberry32(20241401);
  const gauss = (mu: number, sd: number) => {
    const u1 = Math.max(1e-12, rng());
    const u2 = rng();
    return mu + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
  return Array.from({ length: 40 }, () => (rng() < 0.6 ? gauss(-1.5, 0.6) : gauss(2, 0.8)));
})();

/** カーネル密度推定ラボの操作値。 */
export type KdeControls = {
  /** 帯域幅 h（小さいほどギザギザ、大きいほど平滑）。 */
  bandwidth: number;
  /** カーネルの種類。 */
  kernel: KernelKind;
};

/** カーネル密度推定ラボの派生値。 */
export type KdeDerived = {
  /** データ。 */
  data: number[];
  /** KDE 曲線。 */
  curve: { x: number; y: number }[];
  /** 真の密度曲線。 */
  truthCurve: { x: number; y: number }[];
  /** シルバーマンの推奨帯域幅。 */
  silverman: number;
  /** 現在の帯域幅での積分二乗誤差。 */
  ise: number;
};

/**
 * カーネル密度推定（H-6）トピックの Zustand ストア（single source of truth）。
 * Control 層（帯域幅 h スライダー・カーネル種別トグル）は action を呼び、Render 層（ヒストグラム・個別カーネル・
 * KDE曲線・真の密度・ISE・数式）は controls・derived を購読する。h を小さくするとギザギザ、大きくすると潰れる。
 * データは固定。frame は帯域幅スイープのステッパーが使う。
 */
export const useKdeStore = createTopicStore<KdeControls, KdeDerived>({
  initialControls: { bandwidth: silvermanBandwidth(KDE_DATA), kernel: "gaussian" },
  derive: ({ bandwidth, kernel }) => ({
    data: KDE_DATA,
    curve: densityCurve(KDE_DATA, bandwidth, kernel, KDE_RANGE),
    truthCurve: Array.from({ length: KDE_RANGE.steps }, (_, i) => {
      const x = KDE_RANGE.min + ((KDE_RANGE.max - KDE_RANGE.min) * i) / (KDE_RANGE.steps - 1);
      return { x, y: trueDensity(x) };
    }),
    silverman: silvermanBandwidth(KDE_DATA),
    ise: integratedSquaredError(KDE_DATA, bandwidth, kernel, trueDensity, KDE_RANGE),
  }),
});

/** 単一の帯域幅・カーネルでの KDE 値（ステッパー等での再利用）。 */
export function kdeAt(x: number, bandwidth: number, kernel: KernelKind): number {
  return kde(x, KDE_DATA, bandwidth, kernel);
}
