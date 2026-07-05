import { describe, expect, it } from "vitest";
import {
  applyLogic,
  binaryPrefixValue,
  binaryToDecimal,
  bitsForLevels,
  bitsToDistinguish,
  decimalToBinary,
  decimalToBinarySteps,
  decimalToHex,
  isAliased,
  levelsForBits,
  maxQuantError,
  nyquistRate,
  prefixDiscrepancy,
  quantizationSNRdB,
  quantizationStep,
  quantize,
  sampleSignal,
  selfInformationBits,
  siPrefixValue,
  truthTable,
  utf8ByteLength,
} from "./digital-information-basics";

describe("2 進数（基数変換）", () => {
  it("10 進 → 2 進", () => {
    expect(decimalToBinary(13)).toBe("1101");
    expect(decimalToBinary(0)).toBe("0");
    expect(decimalToBinary(255)).toBe("11111111");
  });
  it("10 進 → 16 進（大文字）", () => {
    expect(decimalToHex(255)).toBe("FF");
    expect(decimalToHex(13)).toBe("D");
  });
  it("2 進 → 10 進で往復する", () => {
    expect(binaryToDecimal("1101")).toBe(13);
    for (const n of [0, 1, 7, 42, 200]) {
      expect(binaryToDecimal(decimalToBinary(n))).toBe(n);
    }
  });
  it("「2 で割り続ける」各ステップの余りを下から読むと 2 進表記", () => {
    const steps = decimalToBinarySteps(13);
    // 13→6 r1, 6→3 r0, 3→1 r1, 1→0 r1
    expect(steps.map((s) => s.remainder)).toEqual([1, 0, 1, 1]);
    const fromBottom = steps
      .map((s) => s.remainder)
      .reverse()
      .join("");
    expect(fromBottom).toBe("1101");
    // 最後の商は 0。
    expect(steps[steps.length - 1].quotient).toBe(0);
  });
  it("n=0 は 1 ステップ", () => {
    expect(decimalToBinarySteps(0)).toHaveLength(1);
  });
});

describe("情報量の単位 bit", () => {
  it("n bit で 2ⁿ 通り", () => {
    expect(levelsForBits(8)).toBe(256);
    expect(levelsForBits(1)).toBe(2);
    expect(levelsForBits(10)).toBe(1024);
  });
  it("levels 通りに必要なビット数は ⌈log₂ levels⌉", () => {
    expect(bitsForLevels(256)).toBe(8);
    expect(bitsForLevels(1000)).toBe(10); // 2¹⁰=1024 ≥ 1000
    expect(bitsForLevels(2)).toBe(1);
    expect(bitsForLevels(1)).toBe(0);
  });
  it("等確率 n 通りの情報量は log₂ n", () => {
    expect(bitsToDistinguish(8)).toBeCloseTo(3, 12);
    expect(bitsToDistinguish(1)).toBe(0);
  });
  it("自己情報量 −log₂ p はまれな事象ほど大きい", () => {
    expect(selfInformationBits(0.5)).toBeCloseTo(1, 12);
    expect(selfInformationBits(0.25)).toBeCloseTo(2, 12);
    expect(selfInformationBits(1)).toBeCloseTo(0, 12);
    expect(Number.isNaN(selfInformationBits(0))).toBe(true);
  });
});

describe("接頭語のズレ（10 進 vs 2 進）", () => {
  it("kilo=10³、kibi=2¹⁰=1024", () => {
    expect(siPrefixValue(1)).toBe(1000);
    expect(binaryPrefixValue(1)).toBe(1024);
  });
  it("ズレは接頭語が大きいほど開く（kibi 2.4%、gibi 7.4%…）", () => {
    expect(prefixDiscrepancy(1)).toBeCloseTo(1.024, 6);
    expect(prefixDiscrepancy(4)).toBeGreaterThan(prefixDiscrepancy(1)); // tera vs tebi は約 10%
    expect(prefixDiscrepancy(4)).toBeCloseTo((1024 / 1000) ** 4, 6);
  });
});

describe("標本化とナイキストの定理", () => {
  it("最低サンプリング周波数は 2·f_max", () => {
    expect(nyquistRate(20)).toBe(40);
  });
  it("fs < 2·f_max でエイリアシング", () => {
    expect(isAliased(30, 20)).toBe(true); // 30 < 40
    expect(isAliased(50, 20)).toBe(false); // 50 ≥ 40
  });
  it("サンプリング点数は floor(tMax·fs)+1、間隔 1/fs", () => {
    const s = sampleSignal((t) => t, 1, 4); // 0,0.25,0.5,0.75,1.0
    expect(s).toHaveLength(5);
    expect(s[1].t).toBeCloseTo(0.25, 12);
    expect(s[4].value).toBeCloseTo(1, 12);
  });
});

describe("量子化", () => {
  it("n bit の段の幅は（範囲）/2ⁿ", () => {
    expect(quantizationStep(-1, 1, 1)).toBeCloseTo(1, 12); // 範囲2 / 2段
    expect(quantizationStep(-1, 1, 3)).toBeCloseTo(0.25, 12); // 範囲2 / 8段
  });
  it("量子化の誤差は Δ/2 以内", () => {
    const min = -1;
    const max = 1;
    const bits = 4;
    const half = maxQuantError(min, max, bits);
    for (const x of [-0.9, -0.3, 0, 0.42, 0.99]) {
      const q = quantize(x, min, max, bits);
      expect(Math.abs(q.error)).toBeLessThanOrEqual(half + 1e-12);
    }
  });
  it("段番号は 0..2ⁿ−1 にクランプ", () => {
    expect(quantize(-5, -1, 1, 3).index).toBe(0);
    expect(quantize(5, -1, 1, 3).index).toBe(7);
    expect(quantize(0, -1, 1, 3).index).toBe(4); // 中央
  });
  it("SN 比は 1 bit ごとに約 6 dB 改善（6.02n+1.76）", () => {
    expect(quantizationSNRdB(16)).toBeCloseTo(98.08, 2); // CD 品質
    expect(quantizationSNRdB(8) - quantizationSNRdB(7)).toBeCloseTo(6.02, 6);
  });
});

describe("論理演算（真理値表）", () => {
  it("AND/OR/XOR/NAND/NOR/NOT", () => {
    expect(applyLogic("AND", 1, 1)).toBe(1);
    expect(applyLogic("AND", 1, 0)).toBe(0);
    expect(applyLogic("OR", 0, 1)).toBe(1);
    expect(applyLogic("XOR", 1, 1)).toBe(0);
    expect(applyLogic("XOR", 1, 0)).toBe(1);
    expect(applyLogic("NAND", 1, 1)).toBe(0);
    expect(applyLogic("NOR", 0, 0)).toBe(1);
    expect(applyLogic("NOT", 1)).toBe(0);
    expect(applyLogic("NOT", 0)).toBe(1);
  });
  it("真理値表は 4 行で、XOR は «違えば 1»", () => {
    const t = truthTable("XOR");
    expect(t).toHaveLength(4);
    expect(t.map((r) => r.out)).toEqual([0, 1, 1, 0]);
  });
});

describe("文字符号化（UTF-8 可変長）", () => {
  it("ASCII は 1 バイト、日本語は 3 バイト、絵文字は 4 バイト", () => {
    expect(utf8ByteLength("A".codePointAt(0)!)).toBe(1); // U+0041
    expect(utf8ByteLength("あ".codePointAt(0)!)).toBe(3); // U+3042
    expect(utf8ByteLength("😀".codePointAt(0)!)).toBe(4); // U+1F600
    expect(utf8ByteLength(0x7ff)).toBe(2);
  });
});
