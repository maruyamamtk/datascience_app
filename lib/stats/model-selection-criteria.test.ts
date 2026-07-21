import { describe, expect, it } from "vitest";
import {
  aicOf,
  argminBy,
  bicOf,
  bicPenaltyExceedsAic,
  buildDesignMatrix,
  cvMseForAllModels,
  cvMseOf,
  DATA_SEED,
  fitNestedModels,
  generateDataset,
  kFoldIndices,
  logLikelihoodOf,
  makeLcg,
  mallowsCpOf,
  N_CANDIDATES,
  N_OBS,
  penaltyGap,
  pseudoGaussian,
} from "./model-selection-criteria";

describe("makeLcg / pseudoGaussian(決定的乱数)", () => {
  it("同じseedなら同じ数列を返す(SSR/ブラウザで結果がぶれない)", () => {
    const a = makeLcg(42);
    const b = makeLcg(42);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("pseudoGaussianは整数演算(四則演算)だけで作られ、超越関数を使わない", () => {
    const rng = makeLcg(7);
    const v = pseudoGaussian(rng);
    expect(Number.isFinite(v)).toBe(true);
    // rng()∈[0,1)なので3個の和−1.5は[-1.5,1.5)の範囲。
    expect(v).toBeGreaterThanOrEqual(-1.5);
    expect(v).toBeLessThan(1.5);
  });
});

describe("generateDataset", () => {
  it("同じseedなら同じデータセットを返す(決定的)", () => {
    const d1 = generateDataset(DATA_SEED);
    const d2 = generateDataset(DATA_SEED);
    expect(d1).toEqual(d2);
  });

  it("列数・行数がN_CANDIDATES・N_OBSと一致する", () => {
    const d = generateDataset(DATA_SEED, N_OBS);
    expect(d.columns).toHaveLength(N_CANDIDATES);
    for (const col of d.columns) expect(col).toHaveLength(N_OBS);
    expect(d.y).toHaveLength(N_OBS);
  });

  it("異なるseedなら異なるデータセットになる", () => {
    const d1 = generateDataset(1);
    const d2 = generateDataset(2);
    expect(d1.y).not.toEqual(d2.y);
  });
});

describe("buildDesignMatrix", () => {
  it("k=0(切片のみ)でもn行×1列(切片だけ)の行列を返す", () => {
    const columns = [[1, 2, 3]];
    const X = buildDesignMatrix(columns, 0, 3);
    expect(X).toEqual([[1], [1], [1]]);
  });

  it("k=2なら切片+2列の行列になる", () => {
    const columns = [
      [10, 20],
      [100, 200],
    ];
    const X = buildDesignMatrix(columns, 2, 2);
    expect(X).toEqual([
      [1, 10, 100],
      [1, 20, 200],
    ]);
  });
});

describe("logLikelihoodOf", () => {
  it("既知の式どおりに計算する: −(n/2)(log2π+log(RSS/n)+1)", () => {
    const n = 10;
    const rss = 10; // RSS/n=1, log(1)=0
    const expected = -(n / 2) * (Math.log(2 * Math.PI) + 0 + 1);
    expect(logLikelihoodOf(rss, n)).toBeCloseTo(expected, 10);
  });

  it("RSSが小さいほど対数尤度は大きい(単調な関係)", () => {
    expect(logLikelihoodOf(5, 20)).toBeGreaterThan(logLikelihoodOf(20, 20));
  });

  it("RSSやnが0以下ならNaN", () => {
    expect(Number.isNaN(logLikelihoodOf(0, 10))).toBe(true);
    expect(Number.isNaN(logLikelihoodOf(10, 0))).toBe(true);
  });
});

describe("aicOf / bicOf", () => {
  it("AIC = −2×対数尤度 + 2×パラメータ数", () => {
    expect(aicOf(-100, 5)).toBeCloseTo(200 + 10, 10);
  });

  it("BIC = −2×対数尤度 + パラメータ数×log(n)", () => {
    expect(bicOf(-100, 5, 100)).toBeCloseTo(200 + 5 * Math.log(100), 10);
  });

  it("n=1のときBICのペナルティは0(log1=0)、n>e²でAICのペナルティ(2)を上回る", () => {
    expect(bicOf(-100, 5, 1)).toBeCloseTo(200, 10);
  });
});

describe("mallowsCpOf", () => {
  it("既知の式どおりに計算する: RSS/σ̂²−n+2p", () => {
    expect(mallowsCpOf(50, 5, 20, 3)).toBeCloseTo(50 / 5 - 20 + 6, 10);
  });

  it("フルモデル自身のCpは常にpFull(パラメータ数)に一致する(RSS/σ̂²=n−pFullより)", () => {
    // RSS_full/σ̂²_full = dfFull = n - pFull なので Cp_full = dfFull - n + 2*pFull = pFull。
    const n = 20;
    const pFull = 6;
    const dfFull = n - pFull;
    const sigma2Full = 1; // RSS_full = dfFull * sigma2Full となるよう設定
    const rssFull = dfFull * sigma2Full;
    expect(mallowsCpOf(rssFull, sigma2Full, n, pFull)).toBeCloseTo(pFull, 10);
  });

  it("σ̂²が0以下ならNaN", () => {
    expect(Number.isNaN(mallowsCpOf(10, 0, 20, 3))).toBe(true);
  });
});

describe("bicPenaltyExceedsAic / penaltyGap(高校数学: log n > 2 ⟺ n > e²)", () => {
  it("n=7(<e²≈7.389)ではBICのペナルティはAIC未満", () => {
    expect(bicPenaltyExceedsAic(7)).toBe(false);
    expect(penaltyGap(7)).toBeLessThan(0);
  });

  it("n=8(>e²≈7.389)ではBICのペナルティがAICを上回る", () => {
    expect(bicPenaltyExceedsAic(8)).toBe(true);
    expect(penaltyGap(8)).toBeGreaterThan(0);
  });

  it("n=N_OBS(このトピックの標本サイズ)では明確にBICの方が重い", () => {
    expect(bicPenaltyExceedsAic(N_OBS)).toBe(true);
    expect(penaltyGap(N_OBS)).toBeCloseTo(Math.log(N_OBS) - 2, 10);
  });
});

describe("fitNestedModels(このトピックのメインデータセット)", () => {
  const dataset = generateDataset(DATA_SEED);
  const models = fitNestedModels(dataset);

  it("説明変数0個(切片のみ)〜N_CANDIDATES個の、N_CANDIDATES+1個のモデルを返す", () => {
    expect(models).toHaveLength(N_CANDIDATES + 1);
    expect(models.map((m) => m.k)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("paramCount = k+1(切片+説明変数の数)", () => {
    for (const m of models) expect(m.paramCount).toBe(m.k + 1);
  });

  it("RSSはkについて単調非増加(説明変数を増やしてもRSSは増えない、ネストモデルの性質)", () => {
    for (let i = 1; i < models.length; i++) {
      expect(models[i].rss).toBeLessThanOrEqual(models[i - 1].rss + 1e-9);
    }
  });

  it("全モデルのAIC・BIC・Cp・対数尤度が有限", () => {
    for (const m of models) {
      expect(Number.isFinite(m.aic)).toBe(true);
      expect(Number.isFinite(m.bic)).toBe(true);
      expect(Number.isFinite(m.cp)).toBe(true);
      expect(Number.isFinite(m.logLik)).toBe(true);
    }
  });

  it("このデータセットではAICが真のモデル(k=2)より大きいモデル(k=3、無関係なx3を含む)を最小と判断し、BIC・Cpは正しくk=2を選ぶ(argminはハードコードせず実測)", () => {
    const aicBest = argminBy(models, "aic");
    const bicBest = argminBy(models, "bic");
    const cpBest = argminBy(models, "cp");
    expect(bicBest.k).toBe(2);
    expect(cpBest.k).toBe(2);
    expect(aicBest.k).toBeGreaterThan(bicBest.k);
  });

  it("BICはAICより同じモデルに対して常に大きいか等しい罰則を与える(n=24>e²なのでparamCount>=1なら明確に大きい)", () => {
    for (const m of models) {
      if (m.paramCount > 0) expect(m.bic).toBeGreaterThan(m.aic - 1e-9);
    }
  });
});

describe("kFoldIndices", () => {
  it("全インデックスをちょうど1回ずつ、k個のフォールドに分割する", () => {
    const folds = kFoldIndices(10, 4);
    const all = folds.flat().slice().sort((a, b) => a - b);
    expect(all).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("フォールドのサイズはできるだけ均等(差は高々1)", () => {
    const folds = kFoldIndices(10, 4);
    const sizes = folds.map((f) => f.length);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
  });
});

describe("cvMseOf / cvMseForAllModels", () => {
  const dataset = generateDataset(DATA_SEED);

  it("有限な値を返す", () => {
    const folds = kFoldIndices(dataset.y.length, 4);
    const mse = cvMseOf(dataset, 2, folds);
    expect(Number.isFinite(mse)).toBe(true);
    expect(mse).toBeGreaterThan(0);
  });

  it("真の説明変数(x1,x2)を含むモデルは、切片のみのモデルよりCV誤差が小さい", () => {
    const mses = cvMseForAllModels(dataset);
    expect(mses[2]).toBeLessThan(mses[0]);
  });

  it("N_CANDIDATES+1個ぶんのCV-MSEを返す", () => {
    const mses = cvMseForAllModels(dataset);
    expect(mses).toHaveLength(N_CANDIDATES + 1);
  });
});

describe("argminBy", () => {
  it("指定した指標が最小のモデルを返す", () => {
    const models = fitNestedModels(generateDataset(DATA_SEED));
    const best = argminBy(models, "bic");
    for (const m of models) expect(m.bic).toBeGreaterThanOrEqual(best.bic);
  });
});
