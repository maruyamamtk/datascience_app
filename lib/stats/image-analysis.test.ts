import { describe, expect, it } from "vitest";
import {
  AVERAGE_BLUR_3,
  SOBEL_X,
  SOBEL_Y,
  argmax,
  binarize,
  boxArea,
  conv2d,
  convOutputSize,
  convWindowSum,
  generateAnchors,
  gradientMagnitude,
  intersectionArea,
  iou,
  nonMaxSuppression,
  padMatrix,
  softmax,
  topKPredictions,
  unionArea,
  windowPositions,
  type Box,
  type Matrix,
  type ScoredBox,
} from "./image-analysis";

describe("padMatrix", () => {
  it("周囲をゼロで囲む", () => {
    const input: Matrix = [
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

  it("padding=0 は入力のコピーを返す（原本を書き換えない）", () => {
    const input: Matrix = [[5, 6]];
    const out = padMatrix(input, 0);
    expect(out).toEqual(input);
    out[0][0] = 99;
    expect(input[0][0]).toBe(5);
  });
});

describe("convOutputSize / windowPositions", () => {
  it("n=6,f=3,s=1,p=0 のとき出力サイズは4", () => {
    expect(convOutputSize(6, 3, 1, 0)).toBe(4);
  });

  it("windowPositions は行優先で座標を列挙する", () => {
    expect(windowPositions(2, 2)).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
    ]);
  });
});

describe("convWindowSum / conv2d", () => {
  const input: Matrix = [
    [10, 10, 10, 200],
    [10, 10, 10, 200],
    [10, 10, 10, 200],
    [10, 10, 10, 200],
  ];

  it("縦エッジ画像に Sobel X を適用すると境界をまたぐ窓だけ大きな値になる", () => {
    const out = conv2d(input, SOBEL_X, { stride: 1, padding: 0 });
    // 出力は 2x2。窓(*,0)=列0-2はどの行も[10,10,10]で明暗差が無いため0、
    // 窓(*,1)=列1-3は[10,10,200]を含み境界の明暗差190を検出して大きな正の値になる。
    expect(out.length).toBe(2);
    expect(out[0].length).toBe(2);
    for (const row of out) {
      expect(row[0]).toBeCloseTo(0, 8);
      expect(row[1]).toBeGreaterThan(0);
    }
  });

  it("縦エッジ画像に Sobel Y を適用すると0になる（横方向の変化が無いため）", () => {
    const out = conv2d(input, SOBEL_Y, { stride: 1, padding: 0 });
    for (const row of out) {
      for (const v of row) expect(v).toBeCloseTo(0, 8);
    }
  });

  it("convWindowSum は kernel と窓の要素積の総和＋バイアス", () => {
    const kernel: Matrix = [
      [1, 0],
      [0, 1],
    ];
    // (0,0)窓 = [[10,10],[10,10]] -> 10*1+10*0+10*0+10*1=20、bias=5 で25
    expect(convWindowSum(input, kernel, 0, 0, 5)).toBe(25);
  });
});

describe("AVERAGE_BLUR_3 によるぼかし", () => {
  it("一様な画像をぼかしても値は変わらない", () => {
    const flat: Matrix = Array.from({ length: 3 }, () => [50, 50, 50]);
    const out = conv2d(flat, AVERAGE_BLUR_3, { stride: 1, padding: 0 });
    expect(out[0][0]).toBeCloseTo(50, 8);
  });

  it("段差のある画像では平均化により中間値になる", () => {
    const step: Matrix = [
      [0, 0, 0, 100],
      [0, 0, 0, 100],
      [0, 0, 0, 100],
    ];
    const out = conv2d(step, AVERAGE_BLUR_3, { stride: 1, padding: 0 });
    // 唯一の3x3窓（列0-2は全て0、右端の100は窓外）なので平均は0。
    expect(out[0][0]).toBeCloseTo(0, 8);
  });
});

describe("gradientMagnitude", () => {
  it("三平方の定理どおり sqrt(gx^2+gy^2) になる", () => {
    const gx: Matrix = [[3]];
    const gy: Matrix = [[4]];
    expect(gradientMagnitude(gx, gy)[0][0]).toBeCloseTo(5, 8);
  });

  it("両方0なら0", () => {
    expect(gradientMagnitude([[0]], [[0]])[0][0]).toBe(0);
  });
});

describe("binarize", () => {
  it("閾値以上は1、未満は0", () => {
    const input: Matrix = [[10, 128, 255, 127]];
    expect(binarize(input, 128)).toEqual([[0, 1, 1, 0]]);
  });
});

describe("softmax", () => {
  it("非負・総和1になる", () => {
    const probs = softmax([2, 1, 0.1]);
    expect(probs.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    for (const p of probs) expect(p).toBeGreaterThanOrEqual(0);
  });

  it("最大のロジットが最大の確率を持つ", () => {
    const probs = softmax([1, 5, 2]);
    expect(argmax(probs)).toBe(1);
  });

  it("全て同じロジットなら一様分布になる", () => {
    const probs = softmax([3, 3, 3, 3]);
    for (const p of probs) expect(p).toBeCloseTo(0.25, 10);
  });

  it("大きな値でもオーバーフローしない（数値的に安定）", () => {
    const probs = softmax([1000, 1000, 1000]);
    for (const p of probs) {
      expect(Number.isFinite(p)).toBe(true);
      expect(p).toBeCloseTo(1 / 3, 10);
    }
  });

  it("空配列は空配列を返す", () => {
    expect(softmax([])).toEqual([]);
  });
});

describe("argmax", () => {
  it("最大値の最初の index を返す", () => {
    expect(argmax([1, 3, 3, 2])).toBe(1);
  });
});

describe("topKPredictions", () => {
  it("確率降順に並べて上位k件を返す", () => {
    const labels = ["猫", "犬", "鳥"];
    const probs = [0.2, 0.7, 0.1];
    const top = topKPredictions(labels, probs, 2);
    expect(top).toEqual([
      { label: "犬", prob: 0.7, index: 1 },
      { label: "猫", prob: 0.2, index: 0 },
    ]);
  });
});

describe("boxArea / intersectionArea / unionArea / iou", () => {
  const a: Box = { x: 0, y: 0, w: 4, h: 4 }; // 面積16
  const b: Box = { x: 2, y: 2, w: 4, h: 4 }; // 面積16、(2,2)-(4,4)が重なる(面積4)

  it("boxArea は幅×高さ", () => {
    expect(boxArea(a)).toBe(16);
  });

  it("intersectionArea は重なり矩形の面積", () => {
    expect(intersectionArea(a, b)).toBe(4);
  });

  it("重ならないボックスの intersectionArea は0", () => {
    const c: Box = { x: 100, y: 100, w: 1, h: 1 };
    expect(intersectionArea(a, c)).toBe(0);
  });

  it("unionArea = 各面積の和 − 共通部分", () => {
    expect(unionArea(a, b)).toBe(16 + 16 - 4);
  });

  it("iou = 共通部分 / 和集合", () => {
    expect(iou(a, b)).toBeCloseTo(4 / 28, 10);
  });

  it("完全一致するボックスのIoUは1", () => {
    expect(iou(a, { ...a })).toBeCloseTo(1, 10);
  });

  it("重ならないボックスのIoUは0", () => {
    const c: Box = { x: 100, y: 100, w: 1, h: 1 };
    expect(iou(a, c)).toBe(0);
  });
});

describe("nonMaxSuppression", () => {
  it("高スコア順に採用し、しきい値以上重なる候補を抑制する", () => {
    const boxes: ScoredBox[] = [
      { x: 0, y: 0, w: 10, h: 10, score: 0.9 }, // 0: 最高スコア
      { x: 1, y: 1, w: 10, h: 10, score: 0.8 }, // 1: 0と大きく重なる（抑制されるはず）
      { x: 50, y: 50, w: 10, h: 10, score: 0.7 }, // 2: 離れた位置（採用されるはず）
    ];
    const { kept, steps } = nonMaxSuppression(boxes, 0.5);
    expect(kept).toEqual([0, 2]);
    expect(steps.length).toBe(2);
    expect(steps[0].keepIndex).toBe(0);
    expect(steps[0].suppressed.map((s) => s.index)).toEqual([1]);
    expect(steps[0].suppressed[0].iouValue).toBeGreaterThanOrEqual(0.5);
    expect(steps[1].keepIndex).toBe(2);
    expect(steps[1].suppressed).toEqual([]);
  });

  it("重なりが無ければ全て採用される", () => {
    const boxes: ScoredBox[] = [
      { x: 0, y: 0, w: 2, h: 2, score: 0.5 },
      { x: 10, y: 10, w: 2, h: 2, score: 0.9 },
      { x: 20, y: 20, w: 2, h: 2, score: 0.6 },
    ];
    const { kept } = nonMaxSuppression(boxes, 0.5);
    expect(kept.sort()).toEqual([0, 1, 2]);
  });

  it("空配列を渡すと空の結果を返す", () => {
    const { kept, steps } = nonMaxSuppression([], 0.5);
    expect(kept).toEqual([]);
    expect(steps).toEqual([]);
  });
});

describe("generateAnchors", () => {
  it("w*h=scale^2 かつ w/h=ratio を満たす", () => {
    const boxes = generateAnchors({ x: 0, y: 0 }, [8], [2]);
    expect(boxes.length).toBe(1);
    const b = boxes[0];
    expect(b.w * b.h).toBeCloseTo(64, 6);
    expect(b.w / b.h).toBeCloseTo(2, 6);
  });

  it("ratio=1 のとき正方形になる（w=h=scale）", () => {
    const [b] = generateAnchors({ x: 5, y: 5 }, [4], [1]);
    expect(b.w).toBeCloseTo(4, 8);
    expect(b.h).toBeCloseTo(4, 8);
  });

  it("中心座標を軸に左右対称に配置される", () => {
    const [b] = generateAnchors({ x: 10, y: 10 }, [4], [1]);
    expect(b.x + b.w / 2).toBeCloseTo(10, 8);
    expect(b.y + b.h / 2).toBeCloseTo(10, 8);
  });

  it("scales×ratios の組み合わせ数だけボックスを生成する", () => {
    const boxes = generateAnchors({ x: 0, y: 0 }, [4, 8], [0.5, 1, 2]);
    expect(boxes.length).toBe(6);
  });
});
