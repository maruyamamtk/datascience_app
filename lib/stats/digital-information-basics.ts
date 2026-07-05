/**
 * デジタル情報の基礎（A-5）の計算層（純関数・副作用なし・Vitest 対象）。
 *
 * 扱う道具:
 * - 2 進数と «情報量の単位» bit（n bit で 2ⁿ 通りを区別できる）
 * - 接頭語のズレ（10 進の kilo=10³ と 2 進の kibi=2¹⁰=1024）
 * - 標本化（サンプリング）とナイキストの定理（fs ≥ 2·f_max）
 * - 量子化（n bit → 2ⁿ 段階、量子化誤差、SN 比 ≈ 6.02n+1.76 dB）
 * - 論理演算（AND / OR / XOR / NOT の真理値表）
 * - 文字符号化（UTF-8 の可変長バイト数）
 *
 * 描画層（Lab/Stepper）と状態層（store）はこの純関数だけを呼ぶ。
 */

export type Fn = (x: number) => number;

// ────────────────────────────────────────────────────────────
// 2 進数（基数変換）
// ────────────────────────────────────────────────────────────

/** 非負整数を 2 進表記の文字列にする（0 は "0"）。 */
export function decimalToBinary(n: number): string {
  const k = Math.max(0, Math.floor(n));
  return k === 0 ? "0" : k.toString(2);
}

/** 非負整数を 16 進表記（大文字）の文字列にする。 */
export function decimalToHex(n: number): string {
  const k = Math.max(0, Math.floor(n));
  return k.toString(16).toUpperCase();
}

/** 2 進文字列を 10 進整数に戻す（例: "1101" → 13）。 */
export function binaryToDecimal(bits: string): number {
  return bits.split("").reduce((acc, b) => acc * 2 + (b === "1" ? 1 : 0), 0);
}

/** 「2 で割った商と余り」の 1 ステップ（余りを下から並べると 2 進表記になる）。 */
export type DivStep = {
  /** この行の割られる数（前の行の商）。 */
  dividend: number;
  /** 2 で割った商（次の行の割られる数）。 */
  quotient: number;
  /** 2 で割った余り（0 か 1、この桁のビット）。 */
  remainder: 0 | 1;
};

/**
 * 「2 で割り続けて余りを下から読む」基数変換の各ステップを返す（アルゴリズム図鑑スタイル）。
 * 返る配列は上（元の数）から下（商が 0）へ。余りを «下から» 並べると 2 進表記になる。
 * n=0 のときは 1 ステップ（余り 0）。
 */
export function decimalToBinarySteps(n: number): DivStep[] {
  let d = Math.max(0, Math.floor(n));
  const steps: DivStep[] = [];
  if (d === 0) return [{ dividend: 0, quotient: 0, remainder: 0 }];
  while (d > 0) {
    const quotient = Math.floor(d / 2);
    const remainder = (d % 2) as 0 | 1;
    steps.push({ dividend: d, quotient, remainder });
    d = quotient;
  }
  return steps;
}

// ────────────────────────────────────────────────────────────
// 情報量の単位（bit）と接頭語
// ────────────────────────────────────────────────────────────

/** n bit で区別できる状態数 2ⁿ。 */
export function levelsForBits(bits: number): number {
  return 2 ** bits;
}

/** levels 通りを区別するのに必要なビット数 ⌈log₂ levels⌉。 */
export function bitsForLevels(levels: number): number {
  if (levels <= 1) return 0;
  return Math.ceil(Math.log2(levels));
}

/**
 * 等確率で n 通りある «どれか» を知るのに必要な情報量（bit）= log₂ n。
 * bit は «区別する情報の単位»。8 通りなら log₂8=3 bit。
 */
export function bitsToDistinguish(n: number): number {
  if (n <= 1) return 0;
  return Math.log2(n);
}

/**
 * 確率 p の事象が起きたと知ったときの情報量（自己情報量）−log₂ p [bit]。
 * まれな事象（p 小）ほど情報量が大きい。
 */
export function selfInformationBits(p: number): number {
  if (p <= 0 || p > 1) return Number.NaN;
  return -Math.log2(p);
}

/** 10 進接頭語の値 1000^power（kilo=1, mega=2, giga=3, …）。 */
export function siPrefixValue(power: number): number {
  return 1000 ** power;
}

/** 2 進接頭語の値 1024^power（kibi=1, mebi=2, gibi=3, …）。 */
export function binaryPrefixValue(power: number): number {
  return 1024 ** power;
}

/**
 * 同じ «キロ/メガ…» でも 2 進（1024ⁿ）と 10 進（1000ⁿ）でどれだけズレるか。
 * 比 (1024/1000)^power は power とともに開く（1TB≈0.909TiB のあの差）。
 */
export function prefixDiscrepancy(power: number): number {
  return binaryPrefixValue(power) / siPrefixValue(power);
}

// ────────────────────────────────────────────────────────────
// 標本化（サンプリング）
// ────────────────────────────────────────────────────────────

/** 標本化の 1 点（時刻 t と信号値）。 */
export type Sample = { t: number; value: number };

/** ナイキスト周波数から見た «最低サンプリング周波数» 2·f_max。 */
export function nyquistRate(fMax: number): number {
  return 2 * fMax;
}

/** サンプリング周波数 fs が不足（fs < 2·f_max）してエイリアシングが起きるか。 */
export function isAliased(fs: number, fMax: number): boolean {
  return fs < 2 * fMax;
}

/**
 * 信号 f(t) を [0, tMax] でサンプリング周波数 fs（1 秒あたり fs 点）で標本化する。
 * サンプル間隔は 1/fs。返る点数は floor(tMax·fs)+1。
 */
export function sampleSignal(f: Fn, tMax: number, fs: number): Sample[] {
  const dt = 1 / fs;
  const n = Math.floor(tMax * fs) + 1;
  return Array.from({ length: n }, (_, i) => {
    const t = i * dt;
    return { t, value: f(t) };
  });
}

// ────────────────────────────────────────────────────────────
// 量子化
// ────────────────────────────────────────────────────────────

/** n bit 量子化の 1 段の幅 Δ =（範囲）/2ⁿ。 */
export function quantizationStep(min: number, max: number, bits: number): number {
  return (max - min) / 2 ** bits;
}

/** 量子化の結果（段の番号・代表値・誤差）。 */
export type Quantized = {
  /** 段の番号 0..2ⁿ−1。 */
  index: number;
  /** その段の代表値（段の中央、mid-rise）。 */
  value: number;
  /** 量子化誤差 value − x。 */
  error: number;
};

/**
 * 値 x を [min,max] で n bit（2ⁿ 段階）に量子化する。
 * 段番号 = clamp(⌊(x−min)/Δ⌋, 0, 2ⁿ−1)、代表値は段の中央（誤差は最大でも Δ/2）。
 */
export function quantize(x: number, min: number, max: number, bits: number): Quantized {
  const levels = 2 ** bits;
  const step = (max - min) / levels;
  const raw = Math.floor((x - min) / step);
  const index = Math.max(0, Math.min(levels - 1, raw));
  const value = min + (index + 0.5) * step;
  return { index, value, error: value - x };
}

/** n bit 量子化の最大誤差 Δ/2。 */
export function maxQuantError(min: number, max: number, bits: number): number {
  return quantizationStep(min, max, bits) / 2;
}

/**
 * 量子化の SN 比（理論値）≈ 6.02·n + 1.76 [dB]。
 * bit を 1 増やすごとに SN 比が約 6 dB（振幅で 2 倍）改善する «1 bit ≈ 6 dB» の法則。
 */
export function quantizationSNRdB(bits: number): number {
  return 6.02 * bits + 1.76;
}

// ────────────────────────────────────────────────────────────
// 論理演算
// ────────────────────────────────────────────────────────────

export type Bit = 0 | 1;
export type LogicOp = "AND" | "OR" | "XOR" | "NAND" | "NOR" | "NOT";

/** 2 入力（NOT は a のみ）の論理演算を 1 つ評価する。 */
export function applyLogic(op: LogicOp, a: Bit, b: Bit = 0): Bit {
  switch (op) {
    case "AND":
      return (a && b ? 1 : 0) as Bit;
    case "OR":
      return (a || b ? 1 : 0) as Bit;
    case "XOR":
      return ((a ^ b) as Bit);
    case "NAND":
      return (a && b ? 0 : 1) as Bit;
    case "NOR":
      return (a || b ? 0 : 1) as Bit;
    case "NOT":
      return (a ? 0 : 1) as Bit;
  }
}

/** 真理値表の 1 行。 */
export type TruthRow = { a: Bit; b: Bit; out: Bit };

/** 2 入力論理演算の真理値表（4 行）。 */
export function truthTable(op: LogicOp): TruthRow[] {
  const rows: TruthRow[] = [];
  for (const a of [0, 1] as Bit[]) {
    for (const b of [0, 1] as Bit[]) {
      rows.push({ a, b, out: applyLogic(op, a, b) });
    }
  }
  return rows;
}

// ────────────────────────────────────────────────────────────
// 文字符号化（UTF-8）
// ────────────────────────────────────────────────────────────

/**
 * Unicode コードポイントを UTF-8 で表すのに必要なバイト数（1〜4）。
 * ASCII（U+0000..U+007F）は 1 バイト、日本語（U+3000 付近）は 3 バイトなど可変長。
 */
export function utf8ByteLength(codePoint: number): number {
  if (codePoint < 0) return Number.NaN;
  if (codePoint <= 0x7f) return 1;
  if (codePoint <= 0x7ff) return 2;
  if (codePoint <= 0xffff) return 3;
  return 4;
}

/** [min,max] を n 点で等分（端点を含む）。 */
export function linspace(min: number, max: number, n: number): number[] {
  if (n <= 1) return [min];
  return Array.from({ length: n }, (_, i) => min + ((max - min) * i) / (n - 1));
}
