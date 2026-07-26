import { describe, expect, it } from "vitest";
import { sigmoid } from "./logistic";
import {
  convOutputSize,
  conv2d,
  convWindowSum,
  type LstmParams,
  lstmCellGradientProfile,
  lstmStep,
  lstmUnroll,
  padMatrix,
  pool2d,
  type RnnParams,
  rnnGradientProfile,
  rnnOutput,
  rnnStep,
  rnnUnroll,
  tanhDerivative,
  windowPositions,
} from "./neural-network-models";

describe("convOutputSize（出力サイズ公式 floor((n+2p-f)/s)+1）", () => {
  it("padding無し・stride1: n=5,f=3 → 3", () => {
    expect(convOutputSize(5, 3, 1, 0)).toBe(3);
  });
  it("padding無し・stride2: n=5,f=3 → 2", () => {
    expect(convOutputSize(5, 3, 2, 0)).toBe(2);
  });
  it("stride2・n=7,f=3 → 3", () => {
    expect(convOutputSize(7, 3, 2, 0)).toBe(3);
  });
  it("same padding（p=(f-1)/2, f=3, stride1）は入力と同じサイズを保つ", () => {
    expect(convOutputSize(5, 3, 1, 1)).toBe(5);
    expect(convOutputSize(10, 3, 1, 1)).toBe(10);
  });
});

describe("padMatrix（ゼロパディング）", () => {
  it("padding=0はコピーを返す", () => {
    const input = [
      [1, 2],
      [3, 4],
    ];
    const out = padMatrix(input, 0);
    expect(out).toEqual(input);
    expect(out).not.toBe(input);
  });
  it("padding=1で周囲をゼロで囲む", () => {
    const input = [
      [1, 2],
      [3, 4],
    ];
    expect(padMatrix(input, 1)).toEqual([
      [0, 0, 0, 0],
      [0, 1, 2, 0],
      [0, 3, 4, 0],
      [0, 0, 0, 0],
    ]);
  });
});

describe("convWindowSum / conv2d（畳み込み＝要素積の総和）", () => {
  const INPUT = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
  ];
  const FILTER = [
    [1, 0],
    [0, 1],
  ];

  it("1つの窓位置の手計算どおりの値になる", () => {
    // top=0,left=0: 1*1 + 0*2 + 0*4 + 1*5 = 6
    expect(convWindowSum(INPUT, FILTER, 0, 0)).toBe(6);
    // top=1,left=1: 1*5 + 0*6 + 0*8 + 1*9 = 14
    expect(convWindowSum(INPUT, FILTER, 1, 1)).toBe(14);
  });

  it("バイアスを足せる", () => {
    expect(convWindowSum(INPUT, FILTER, 0, 0, 10)).toBe(16);
  });

  it("conv2d: 3x3入力・2x2フィルタ・stride1・padding0 → 2x2出力を全窓で手計算どおりに埋める", () => {
    const out = conv2d(INPUT, FILTER, { stride: 1, padding: 0 });
    expect(out).toEqual([
      [6, 8],
      [12, 14],
    ]);
  });

  it("conv2d: stride2で窓の間隔が2つおきになる（出力サイズも縮む）", () => {
    const bigInput = [
      [1, 2, 3, 4, 5],
      [6, 7, 8, 9, 10],
      [11, 12, 13, 14, 15],
      [16, 17, 18, 19, 20],
      [21, 22, 23, 24, 25],
    ];
    const filter3 = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
    const out = conv2d(bigInput, filter3, { stride: 2, padding: 0 });
    // 出力サイズ floor((5-3)/2)+1=2
    expect(out.length).toBe(2);
    expect(out[0].length).toBe(2);
    // top=0,left=0: 1+7+13=21
    expect(out[0][0]).toBe(21);
    // top=0,left=2: window cols2-4,rows0-2 → 3+9+15=27
    expect(out[0][1]).toBe(27);
  });

  it("conv2d: paddingありだと外周窓にゼロパディング分の欠けが生じる（同一値の全1入力・全1フィルタで検証）", () => {
    const ones3 = [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ];
    const filterOnes = [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ];
    const out = conv2d(ones3, filterOnes, { stride: 1, padding: 1 });
    expect(out.length).toBe(3); // same padding: 出力サイズが入力と同じ
    expect(out[1][1]).toBe(9); // 中心窓はパディングにかからず全て1×9個
    expect(out[0][0]).toBe(4); // 左上窓は3x3のうち4マスだけ実際のデータ（残りはゼロパディング）
  });
});

describe("windowPositions（走査順の列挙）", () => {
  it("行優先で全座標を列挙する", () => {
    expect(windowPositions(2, 3)).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 1, col: 2 },
    ]);
  });
});

describe("pool2d（Max / Average プーリング）", () => {
  const INPUT = [
    [1, 3, 2, 4],
    [5, 6, 1, 2],
    [3, 2, 8, 1],
    [0, 1, 4, 9],
  ];

  it("maxPool: 2x2窓・stride2で各窓の最大値を取る", () => {
    expect(pool2d(INPUT, 2, 2, "max")).toEqual([
      [6, 4],
      [3, 9],
    ]);
  });

  it("avgPool: 2x2窓・stride2で各窓の平均値を取る", () => {
    expect(pool2d(INPUT, 2, 2, "avg")).toEqual([
      [3.75, 2.25],
      [1.5, 5.5],
    ]);
  });

  it("maxPoolの結果は常にavgPoolの結果以上（同じ窓なら max >= average）", () => {
    const maxOut = pool2d(INPUT, 2, 2, "max");
    const avgOut = pool2d(INPUT, 2, 2, "avg");
    for (let i = 0; i < maxOut.length; i++) {
      for (let j = 0; j < maxOut[0].length; j++) {
        expect(maxOut[i][j]).toBeGreaterThanOrEqual(avgOut[i][j]);
      }
    }
  });
});

describe("tanhDerivative", () => {
  it("z=0で最大値1", () => {
    expect(tanhDerivative(0)).toBeCloseTo(1, 10);
  });
  it("|z|が大きいほど0に近づく（飽和）", () => {
    expect(tanhDerivative(3)).toBeLessThan(tanhDerivative(1));
    expect(tanhDerivative(5)).toBeLessThan(0.01);
  });
});

const RNN_PARAMS: RnnParams = { wxh: 0.5, whh: 0.8, bh: 0.1, why: 1.2, by: -0.1 };

describe("rnnStep / rnnUnroll（再帰計算 h_t=tanh(w_xh x_t + w_hh h_{t-1} + b_h)）", () => {
  it("1ステップ目: z・hが手計算（線形部分）+ tanh と一致する", () => {
    const step = rnnStep(1, 0, RNN_PARAMS);
    const z = 0.5 * 1 + 0.8 * 0 + 0.1;
    expect(step.z).toBeCloseTo(z, 10);
    expect(step.h).toBeCloseTo(Math.tanh(z), 10);
  });

  it("rnnUnroll: 各ステップが直前の隠れ状態を引き継いで再帰計算する", () => {
    const xs = [1, -1, 0.5];
    const steps = rnnUnroll(xs, 0, RNN_PARAMS);
    expect(steps.length).toBe(3);

    let hPrev = 0;
    for (let t = 0; t < xs.length; t++) {
      const z = RNN_PARAMS.wxh * xs[t] + RNN_PARAMS.whh * hPrev + RNN_PARAMS.bh;
      const h = Math.tanh(z);
      expect(steps[t].z).toBeCloseTo(z, 10);
      expect(steps[t].h).toBeCloseTo(h, 10);
      hPrev = h;
    }
  });

  it("rnnOutput: 隠れ状態からの線形変換", () => {
    expect(rnnOutput(0.5, RNN_PARAMS)).toBeCloseTo(1.2 * 0.5 - 0.1, 10);
  });
});

describe("rnnGradientProfile（時間方向のBPTT勾配の積、数値微分と一致）", () => {
  it("∂h_T/∂h_0 の解析近似（Π w_hh・tanh'(z_k)）が中心差分による数値微分と一致する", () => {
    const xs = [1, -1, 1, -1, 1];
    const eps = 1e-6;
    const hAt = (h0: number) => rnnUnroll(xs, h0, RNN_PARAMS).at(-1)!.h;
    const numericDeriv = (hAt(eps) - hAt(-eps)) / (2 * eps);

    const steps = rnnUnroll(xs, 0, RNN_PARAMS);
    const profile = rnnGradientProfile(steps, RNN_PARAMS.whh);
    expect(profile.length).toBe(xs.length + 1);
    expect(profile.at(-1)).toBeCloseTo(numericDeriv, 5);
  });

  it("|w_hh|<1で活性化の微分も1未満が続くと、ステップを経るほど単調に絶対値が縮む", () => {
    const xs = Array(8).fill(1);
    const steps = rnnUnroll(xs, 0, { ...RNN_PARAMS, whh: 0.6 });
    const profile = rnnGradientProfile(steps, 0.6);
    for (let t = 1; t < profile.length; t++) {
      expect(Math.abs(profile[t])).toBeLessThan(Math.abs(profile[t - 1]));
    }
    expect(Math.abs(profile.at(-1)!)).toBeLessThan(0.01);
  });
});

const LSTM_PARAMS: LstmParams = {
  wf: 0.4,
  uf: 0.3,
  bf: 0.2,
  wi: 0.5,
  ui: -0.2,
  bi: 0.1,
  wg: 0.6,
  ug: 0.1,
  bg: -0.1,
  wo: 0.3,
  uo: 0.4,
  bo: 0.05,
};

describe("lstmStep / lstmUnroll（ゲート機構とセル状態の更新）", () => {
  it("1ステップ目: 各ゲート・セル状態・隠れ状態が手計算どおり", () => {
    const x = 1;
    const hPrev = 0;
    const cPrev = 0;
    const step = lstmStep(x, hPrev, cPrev, LSTM_PARAMS);

    const zf = LSTM_PARAMS.wf * x + LSTM_PARAMS.uf * hPrev + LSTM_PARAMS.bf;
    const zi = LSTM_PARAMS.wi * x + LSTM_PARAMS.ui * hPrev + LSTM_PARAMS.bi;
    const zg = LSTM_PARAMS.wg * x + LSTM_PARAMS.ug * hPrev + LSTM_PARAMS.bg;
    const zo = LSTM_PARAMS.wo * x + LSTM_PARAMS.uo * hPrev + LSTM_PARAMS.bo;

    expect(step.f).toBeCloseTo(sigmoid(zf), 10);
    expect(step.i).toBeCloseTo(sigmoid(zi), 10);
    expect(step.g).toBeCloseTo(Math.tanh(zg), 10);
    expect(step.o).toBeCloseTo(sigmoid(zo), 10);

    const c = sigmoid(zf) * cPrev + sigmoid(zi) * Math.tanh(zg);
    expect(step.c).toBeCloseTo(c, 10);
    expect(step.h).toBeCloseTo(sigmoid(zo) * Math.tanh(c), 10);
  });

  it("全ゲートは(0,1)の範囲、候補gは(-1,1)の範囲に収まる", () => {
    const steps = lstmUnroll([1, -2, 0.5, 3, -1], 0, 0, LSTM_PARAMS);
    for (const s of steps) {
      expect(s.f).toBeGreaterThan(0);
      expect(s.f).toBeLessThan(1);
      expect(s.i).toBeGreaterThan(0);
      expect(s.i).toBeLessThan(1);
      expect(s.o).toBeGreaterThan(0);
      expect(s.o).toBeLessThan(1);
      expect(s.g).toBeGreaterThan(-1);
      expect(s.g).toBeLessThan(1);
    }
  });

  it("忘却ゲートf=0（前を全部忘れる）だとセル状態はi_t*g_tだけに決まる", () => {
    const zeroForget: LstmParams = { ...LSTM_PARAMS, wf: 0, uf: 0, bf: -1000 }; // sigmoid(-1000)≈0
    const step = lstmStep(1, 0, 5, zeroForget); // cPrev=5だが忘れるので寄与しない
    expect(step.f).toBeCloseTo(0, 10);
    expect(step.c).toBeCloseTo(step.i * step.g, 8);
  });
});

describe("lstmCellGradientProfile（セル状態を通る勾配 ∂c_T/∂c_0 ≈ Π f_t）", () => {
  it("ゲートが隠れ状態に依存しない特殊ケース（u*=0）では、Π f_t が数値微分 ∂c_T/∂c_0 と厳密に一致する", () => {
    // u*=0 にすると各ゲートは x_t だけで決まり c_{t-1} に依存しないため、
    // c の再帰は c_t = f_t・c_{t-1} + (定数) という c について線形な式になり、
    // ∂c_T/∂c_0 = Π f_t が近似ではなく厳密に成り立つ。
    const indepParams: LstmParams = { ...LSTM_PARAMS, uf: 0, ui: 0, ug: 0, uo: 0 };
    const xs = [1, -1, 0.5, 2, -0.5];
    const eps = 1e-6;
    const cAt = (c0: number) => lstmUnroll(xs, 0, c0, indepParams).at(-1)!.c;
    const numericDeriv = (cAt(eps) - cAt(-eps)) / (2 * eps);

    const steps = lstmUnroll(xs, 0, 0, indepParams);
    const profile = lstmCellGradientProfile(steps);
    expect(profile.at(-1)).toBeCloseTo(numericDeriv, 6);
  });

  it("忘却ゲートを1近くに保てるLSTMは、同じステップ数でRNNの勾配プロファイルより緩やかにしか縮まない", () => {
    // 忘却ゲートがx,hに依存せずほぼ1で一定になるようbf を大きくする（勾配消失対策の核心）。
    const stableForget: LstmParams = { ...LSTM_PARAMS, wf: 0, uf: 0, bf: 4 }; // sigmoid(4)≈0.982
    const xs = [1, -1, 1, -1, 1, -1, 1, -1, 1, -1];
    const lstmSteps = lstmUnroll(xs, 0, 0, stableForget);
    const lstmProfile = lstmCellGradientProfile(lstmSteps);

    const rnnSteps = rnnUnroll(xs, 0, { ...RNN_PARAMS, whh: 1, wxh: 1, bh: 0 });
    const rnnProfile = rnnGradientProfile(rnnSteps, 1);

    expect(Math.abs(lstmProfile.at(-1)!)).toBeGreaterThan(Math.abs(rnnProfile.at(-1)!));
  });
});
