import {
  isAliased,
  levelsForBits,
  nyquistRate,
  quantizationSNRdB,
  quantizationStep,
  quantize,
  sampleSignal,
  type Fn,
} from "@/lib/stats/digital-information-basics";
import { createTopicStore } from "./topicStore";

/** ラボの信号 = 正弦波 sin(2π·f·t)（アナログ原信号）。 */
export const SIG_FREQ = 2; // Hz（時間窓 1 秒で 2 周期）
export const T_MAX = 1; // 秒
/** 量子化の振幅範囲 [−1, 1]。 */
export const SIG_MIN = -1;
export const SIG_MAX = 1;
/** 原信号 f(t)=sin(2π·f·t)。 */
export const LAB_SIGNAL: Fn = (t) => Math.sin(2 * Math.PI * SIG_FREQ * t);
/** ナイキストの «最低» サンプリング周波数 2·f_max。 */
export const LAB_NYQUIST = nyquistRate(SIG_FREQ); // 4 Hz
/** 操作範囲。 */
export const FS_MIN = 3;
export const FS_MAX = 40;
export const BITS_MIN = 1;
export const BITS_MAX = 6;
/** アナログ曲線の描画点数。 */
export const CURVE_N = 160;

/** 標本化＋量子化ラボの操作値。 */
export type DigControls = {
  /** サンプリング周波数 fs [Hz]（1 秒あたりの標本点数）。 */
  fs: number;
  /** 量子化のビット数 n（段階数は 2ⁿ）。 */
  bits: number;
};

/** 量子化まで済んだ 1 標本。 */
export type QuantSample = {
  t: number;
  /** 標本の «真の» 値 f(t)。 */
  raw: number;
  /** 量子化後の代表値。 */
  value: number;
  /** 量子化誤差 value − raw。 */
  error: number;
};

/** 標本化＋量子化ラボの派生値。 */
export type DigDerived = {
  fs: number;
  bits: number;
  /** 量子化の段階数 2ⁿ。 */
  levels: number;
  /** 量子化 1 段の幅 Δ。 */
  step: number;
  /** 量子化 SN 比 ≈ 6.02n+1.76 [dB]。 */
  snrDb: number;
  /** ナイキストの最低サンプリング周波数 2·f_max。 */
  nyquist: number;
  /** fs が不足してエイリアシングが起きているか。 */
  aliased: boolean;
  /** アナログ原信号の滑らかな曲線（描画用）。 */
  curve: { t: number; value: number }[];
  /** 標本化＋量子化した点列（sample-and-hold の階段はここから作る）。 */
  samples: QuantSample[];
};

/**
 * デジタル情報の基礎（A-5）トピックの Zustand ストア（single source of truth）。
 * Control 層（サンプリング周波数 fs・ビット数 n）は action を呼び、Render 層
 * （SamplingQuantizationLab の階段波形と数式 L=2ⁿ・Δ・SN比・ナイキスト）は controls・derived を購読する。
 * fs を上げると横（時間）が、n を上げると縦（振幅）が細かくなる。fs<2·f_max でエイリアシング。
 * frame は 2 進数変換ステッパー（10 進 → 2 進をコマ送り）が使う。
 */
export const useDigitalInformationBasicsStore = createTopicStore<DigControls, DigDerived>({
  initialControls: { fs: 16, bits: 3 },
  derive: ({ fs, bits }) => {
    const levels = levelsForBits(bits);
    const step = quantizationStep(SIG_MIN, SIG_MAX, bits);
    const rawSamples = sampleSignal(LAB_SIGNAL, T_MAX, fs);
    const samples: QuantSample[] = rawSamples.map((s) => {
      const q = quantize(s.value, SIG_MIN, SIG_MAX, bits);
      return { t: s.t, raw: s.value, value: q.value, error: q.error };
    });
    const curve = Array.from({ length: CURVE_N }, (_, i) => {
      const t = (T_MAX * i) / (CURVE_N - 1);
      return { t, value: LAB_SIGNAL(t) };
    });
    return {
      fs,
      bits,
      levels,
      step,
      snrDb: quantizationSNRdB(bits),
      nyquist: LAB_NYQUIST,
      aliased: isAliased(fs, SIG_FREQ),
      curve,
      samples,
    };
  },
});
