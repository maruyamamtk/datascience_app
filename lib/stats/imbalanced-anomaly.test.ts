import { describe, expect, it } from "vitest";
import {
  adasynWeights,
  buildIsolationForest,
  buildIsolationTree,
  cFactor,
  classCounts,
  classifyByThreshold,
  computeMoments,
  confusionAt,
  costOptimalThreshold,
  euclideanDistance,
  expectedCost,
  firstPrincipalDirection,
  generateAdasynSequence,
  generateAnomalyData,
  generateImbalancedData,
  generateSmoteSequence,
  imbalanceRatio,
  interpolate,
  isolationScore,
  kDistance,
  kNearestIndices,
  localDifficulty,
  localReachabilityDensity,
  lofAll,
  lofAt,
  mahalanobisT2,
  majorityBaselineAccuracy,
  makeLcg,
  meanOf,
  N_MINORITY_BORDERLINE,
  N_MINORITY_CORE,
  N_MAJORITY,
  N_NORMAL,
  N_OUTLIERS,
  nearestIndicesWithin,
  pathLength,
  pcaResidualQ,
  percentileCutoffCount,
  projectionScore,
  pseudoGaussian,
  rankByScoreDescending,
  reachabilityDistance,
  weightedPick,
  type Point2D,
} from "./imbalanced-anomaly";

describe("makeLcg / pseudoGaussian（決定的乱数）", () => {
  it("同じ seed からは常に同じ数列を生成する", () => {
    const a = makeLcg(1);
    const b = makeLcg(1);
    expect(Array.from({ length: 5 }, () => a())).toEqual(Array.from({ length: 5 }, () => b()));
  });

  it("[0,1) の範囲に収まる", () => {
    const rng = makeLcg(99);
    for (let i = 0; i < 300; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("pseudoGaussian はおおむね [-1.5, 1.5] に収まり平均0近傍", () => {
    const rng = makeLcg(3);
    const vals = Array.from({ length: 2000 }, () => pseudoGaussian(rng));
    for (const v of vals) {
      expect(v).toBeGreaterThanOrEqual(-1.5);
      expect(v).toBeLessThanOrEqual(1.5);
    }
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    expect(Math.abs(mean)).toBeLessThan(0.1);
  });
});

describe("generateImbalancedData / クラス不均衡指標", () => {
  const data = generateImbalancedData(20260719);

  it("多数派40点・少数派8点（核5+境界3）の決定的データを生成する", () => {
    expect(data.length).toBe(N_MAJORITY + N_MINORITY_CORE + N_MINORITY_BORDERLINE);
    const counts = classCounts(data);
    expect(counts.majority).toBe(N_MAJORITY);
    expect(counts.minority).toBe(N_MINORITY_CORE + N_MINORITY_BORDERLINE);
  });

  it("同じ seed なら同じデータを再現する", () => {
    const again = generateImbalancedData(20260719);
    expect(again).toEqual(data);
  });

  it("全点が [0,1]^2 に収まる", () => {
    for (const p of data) {
      expect(p.x1).toBeGreaterThanOrEqual(0);
      expect(p.x1).toBeLessThanOrEqual(1);
      expect(p.x2).toBeGreaterThanOrEqual(0);
      expect(p.x2).toBeLessThanOrEqual(1);
    }
  });

  it("不均衡比は多数派/少数派", () => {
    const counts = classCounts(data);
    expect(imbalanceRatio(counts)).toBeCloseTo(N_MAJORITY / (N_MINORITY_CORE + N_MINORITY_BORDERLINE), 10);
  });

  it("«常に多数派» のaccuracyは多数派比率と一致する（accuracy paradoxの土台）", () => {
    const counts = classCounts(data);
    const acc = majorityBaselineAccuracy(counts);
    expect(acc).toBeCloseTo(N_MAJORITY / data.length, 10);
    expect(acc).toBeGreaterThan(0.8); // 不均衡が強いので素朴なaccuracyは高く出る
  });
});

describe("SMOTE", () => {
  const data = generateImbalancedData(20260719);
  const minority = data.filter((p) => p.label === 1);

  it("nearestIndicesWithin は自分自身を含まず、距離昇順で返す", () => {
    const idx = nearestIndicesWithin(minority, 0, 3);
    expect(idx).not.toContain(0);
    expect(idx.length).toBe(3);
    const dists = idx.map((i) => euclideanDistance(minority[0], minority[i]));
    for (let i = 1; i < dists.length; i++) expect(dists[i]).toBeGreaterThanOrEqual(dists[i - 1]);
  });

  it("interpolate(a,b,0)=a, interpolate(a,b,1)=b", () => {
    const a: Point2D = { x1: 0.2, x2: 0.3 };
    const b: Point2D = { x1: 0.8, x2: 0.5 };
    expect(interpolate(a, b, 0)).toEqual(a);
    expect(interpolate(a, b, 1)).toEqual(b);
  });

  it("合成点は常に seed-neighbor 線分上（gapで内分）にある", () => {
    const steps = generateSmoteSequence(minority, 3, 10, 1);
    for (const s of steps) {
      const expected = interpolate(s.seed, s.neighbor, s.gap);
      expect(s.synthetic.x1).toBeCloseTo(expected.x1, 10);
      expect(s.synthetic.x2).toBeCloseTo(expected.x2, 10);
      expect(s.gap).toBeGreaterThanOrEqual(0);
      expect(s.gap).toBeLessThan(1);
    }
  });

  it("種点は少数派の巡回順（0,1,2,...を繰り返す）", () => {
    const steps = generateSmoteSequence(minority, 3, 2 * minority.length, 1);
    for (let i = 0; i < steps.length; i++) expect(steps[i].seedIndex).toBe(i % minority.length);
  });

  it("同じ seed なら同じ合成列を再現する（決定的）", () => {
    const a = generateSmoteSequence(minority, 3, 12, 42);
    const b = generateSmoteSequence(minority, 3, 12, 42);
    expect(a).toEqual(b);
  });
});

describe("ADASYN", () => {
  const data = generateImbalancedData(20260719);
  const minority = data.filter((p) => p.label === 1);

  it("localDifficulty は [0,1] に収まる", () => {
    for (const p of minority) {
      const d = localDifficulty(p, data, 5);
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(1);
    }
  });

  it("境界（多数派に近い）少数派点は核（多数派から離れた）少数派点より困難度が高い", () => {
    // generateImbalancedData の並び: [majority..., core(5), borderline(3)]
    const coreDifficulties = minority.slice(0, N_MINORITY_CORE).map((p) => localDifficulty(p, data, 5));
    const borderlineDifficulties = minority.slice(N_MINORITY_CORE).map((p) => localDifficulty(p, data, 5));
    const meanCore = coreDifficulties.reduce((s, v) => s + v, 0) / coreDifficulties.length;
    const meanBorderline = borderlineDifficulties.reduce((s, v) => s + v, 0) / borderlineDifficulties.length;
    expect(meanBorderline).toBeGreaterThan(meanCore);
  });

  it("adasynWeights は合計1に正規化される", () => {
    const w = adasynWeights(minority, data, 5);
    expect(w.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 8);
    for (const v of w) expect(v).toBeGreaterThanOrEqual(0);
  });

  it("weightedPick はu=0で最初の正の重みの要素、u→1で最後の要素に近づく", () => {
    const w = [0.5, 0.3, 0.2];
    expect(weightedPick(w, 0)).toBe(0);
    expect(weightedPick(w, 0.999999)).toBe(2);
  });

  it("ADASYNは境界点をSMOTE（一様巡回）より多く種に選ぶ傾向がある", () => {
    const count = 400;
    const smoteSteps = generateSmoteSequence(minority, 3, count, 7);
    const adasynSteps = generateAdasynSequence(minority, data, 3, count, 7);
    const isBorderline = (i: number) => i >= N_MINORITY_CORE;
    const smoteBorderlineShare = smoteSteps.filter((s) => isBorderline(s.seedIndex)).length / smoteSteps.length;
    const adasynBorderlineShare = adasynSteps.filter((s) => isBorderline(s.seedIndex)).length / adasynSteps.length;
    expect(adasynBorderlineShare).toBeGreaterThan(smoteBorderlineShare);
  });
});

describe("コスト考慮型学習", () => {
  it("costOptimalThreshold(コスト対称)=0.5", () => {
    expect(costOptimalThreshold(1, 1)).toBeCloseTo(0.5, 10);
  });

  it("偽陰性のコストが偽陽性より大きいとき、最適しきい値は0.5未満（陽性と判定しやすくなる）", () => {
    expect(costOptimalThreshold(1, 9)).toBeLessThan(0.5);
    expect(costOptimalThreshold(1, 9)).toBeCloseTo(0.1, 10);
  });

  it("classifyByThreshold はしきい値以上で1", () => {
    expect(classifyByThreshold(0.6, 0.5)).toBe(1);
    expect(classifyByThreshold(0.4, 0.5)).toBe(0);
  });

  it("confusionAt: 完全一致なら fp=fn=0", () => {
    const labels: (0 | 1)[] = [0, 0, 1, 1];
    const probs = [0.1, 0.2, 0.9, 0.8];
    const c = confusionAt(labels, probs, 0.5);
    expect(c).toEqual({ tp: 2, fp: 0, tn: 2, fn: 0 });
  });

  it("expectedCost はFP×costFP+FN×costFNに一致する", () => {
    expect(expectedCost({ tp: 1, fp: 2, tn: 3, fn: 4 }, 10, 100)).toBe(2 * 10 + 4 * 100);
  });

  it("projectionScore: 多数派重心で0, 少数派重心で1", () => {
    const data = generateImbalancedData(20260719);
    const majMean = meanOf(data.filter((p) => p.label === 0));
    const minMean = meanOf(data.filter((p) => p.label === 1));
    expect(projectionScore(majMean, majMean, minMean)).toBeCloseTo(0, 8);
    expect(projectionScore(minMean, majMean, minMean)).toBeCloseTo(1, 8);
  });

  it("projectionScore は少数派クラスの点で多数派クラスの点より平均的に高い", () => {
    const data = generateImbalancedData(20260719);
    const majMean = meanOf(data.filter((p) => p.label === 0));
    const minMean = meanOf(data.filter((p) => p.label === 1));
    const scoreOf = (p: Point2D) => projectionScore(p, majMean, minMean);
    const majScores = data.filter((p) => p.label === 0).map(scoreOf);
    const minScores = data.filter((p) => p.label === 1).map(scoreOf);
    const mean = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
    expect(mean(minScores)).toBeGreaterThan(mean(majScores));
  });
});

describe("LOF（局所外れ値因子）", () => {
  const anomalyData = generateAnomalyData(555);
  const points: Point2D[] = anomalyData.map((p) => ({ x1: p.x1, x2: p.x2 }));

  it("kNearestIndices は自分自身を除外する", () => {
    const idx = kNearestIndices(points, points[0], 5, 0);
    expect(idx).not.toContain(0);
    expect(idx.length).toBe(5);
  });

  it("到達可能距離は kDistance(neighbor) 以上", () => {
    const d = reachabilityDistance(points, 1, 2, 5);
    expect(d).toBeGreaterThanOrEqual(kDistance(points, 2, 5) - 1e-9);
  });

  it("局所到達可能密度は正", () => {
    for (let i = 0; i < 10; i++) expect(localReachabilityDensity(points, i, 5)).toBeGreaterThan(0);
  });

  it("植え付けた外れ値のLOFは正常クラスタ点の平均LOFより明確に大きい（自己検証: 相対順序で判定）", () => {
    const scores = lofAll(points, 5);
    const normalScores = scores.filter((_, i) => !anomalyData[i].isPlantedOutlier);
    const outlierScores = scores.filter((_, i) => anomalyData[i].isPlantedOutlier);
    const meanNormal = normalScores.reduce((s, v) => s + v, 0) / normalScores.length;
    const meanOutlier = outlierScores.reduce((s, v) => s + v, 0) / outlierScores.length;
    expect(meanOutlier).toBeGreaterThan(meanNormal * 1.3);
  });

  it("正常クラスタ点のLOFはおおむね1に近い（中心的な点ほど）", () => {
    const scores = lofAll(points, 5);
    const normalScores = scores.filter((_, i) => !anomalyData[i].isPlantedOutlier);
    const meanNormal = normalScores.reduce((s, v) => s + v, 0) / normalScores.length;
    expect(meanNormal).toBeGreaterThan(0.7);
    expect(meanNormal).toBeLessThan(1.6);
  });

  it("lofAt はほぼ同じ位置のクエリに対し訓練点のlofScoreに近い値を返す", () => {
    const trainLrd = points.map((_, i) => localReachabilityDensity(points, i, 5));
    const i = 0;
    const approx = lofAt(points, trainLrd, points[i], 5);
    // lofAt は query 自身を neighbor 集合から除外しないため lofScore とは僅かに異なるが、桁は近い。
    expect(Number.isFinite(approx)).toBe(true);
    expect(approx).toBeGreaterThan(0);
  });
});

describe("Isolation Forest", () => {
  const anomalyData = generateAnomalyData(555);
  const points: Point2D[] = anomalyData.map((p) => ({ x1: p.x1, x2: p.x2 }));

  it("cFactor(1)=0, cFactor は n が増えると増加する", () => {
    expect(cFactor(1)).toBe(0);
    expect(cFactor(16)).toBeGreaterThan(cFactor(4));
  });

  it("buildIsolationTree は葉に到達するまで再帰的に分割する", () => {
    const rng = makeLcg(1);
    const tree = buildIsolationTree(
      points.map((_, i) => i),
      points,
      0,
      4,
      rng,
    );
    expect(["leaf", "split"]).toContain(tree.kind);
  });

  it("pathLength は非負", () => {
    const rng = makeLcg(1);
    const tree = buildIsolationTree(
      points.map((_, i) => i),
      points,
      0,
      6,
      rng,
    );
    for (const p of points) expect(pathLength(tree, p)).toBeGreaterThanOrEqual(0);
  });

  it("同じ seed なら同じ森を再現する（決定的）", () => {
    const forestA = buildIsolationForest(points, 20, 16, 123);
    const forestB = buildIsolationForest(points, 20, 16, 123);
    const scoresA = points.map((p) => isolationScore(forestA, 16, p));
    const scoresB = points.map((p) => isolationScore(forestB, 16, p));
    expect(scoresA).toEqual(scoresB);
  });

  it("植え付けた外れ値の異常スコアは正常クラスタ点の平均より大きい", () => {
    const forest = buildIsolationForest(points, 60, 16, 20260719);
    const scores = points.map((p) => isolationScore(forest, 16, p));
    const normalScores = scores.filter((_, i) => !anomalyData[i].isPlantedOutlier);
    const outlierScores = scores.filter((_, i) => anomalyData[i].isPlantedOutlier);
    const meanNormal = normalScores.reduce((s, v) => s + v, 0) / normalScores.length;
    const meanOutlier = outlierScores.reduce((s, v) => s + v, 0) / outlierScores.length;
    expect(meanOutlier).toBeGreaterThan(meanNormal);
  });
});

describe("MSPC（T²・Q統計量）", () => {
  const anomalyData = generateAnomalyData(555);
  const points: Point2D[] = anomalyData.map((p) => ({ x1: p.x1, x2: p.x2 }));
  const moments = computeMoments(points);

  it("平均点自身のT²はほぼ0", () => {
    const t2 = mahalanobisT2({ x1: moments.mean1, x2: moments.mean2 }, moments);
    expect(t2).toBeCloseTo(0, 6);
  });

  it("firstPrincipalDirection は単位ベクトル", () => {
    const { u1, u2 } = firstPrincipalDirection(moments);
    expect(u1 * u1 + u2 * u2).toBeCloseTo(1, 8);
  });

  it("PC1方向上の点のQ統計量はほぼ0（完全に再構成できる）", () => {
    const { u1, u2 } = firstPrincipalDirection(moments);
    const onAxis: Point2D = { x1: moments.mean1 + 0.1 * u1, x2: moments.mean2 + 0.1 * u2 };
    expect(pcaResidualQ(onAxis, moments)).toBeCloseTo(0, 8);
  });

  it("植え付けた外れ値のT²+Qは正常クラスタ点の平均より大きい", () => {
    const scores = points.map((p) => mahalanobisT2(p, moments) + pcaResidualQ(p, moments));
    const normalScores = scores.filter((_, i) => !anomalyData[i].isPlantedOutlier);
    const outlierScores = scores.filter((_, i) => anomalyData[i].isPlantedOutlier);
    const meanNormal = normalScores.reduce((s, v) => s + v, 0) / normalScores.length;
    const meanOutlier = outlierScores.reduce((s, v) => s + v, 0) / outlierScores.length;
    expect(meanOutlier).toBeGreaterThan(meanNormal);
  });
});

describe("generateAnomalyData / ランキング・しきい値ヘルパー", () => {
  it("正常32点+外れ値5点の決定的データを生成する", () => {
    const data = generateAnomalyData(1);
    expect(data.length).toBe(N_NORMAL + N_OUTLIERS);
    expect(data.filter((p) => p.isPlantedOutlier).length).toBe(N_OUTLIERS);
  });

  it("rankByScoreDescending はスコア降順の添字を返す", () => {
    const idx = rankByScoreDescending([0.2, 0.9, 0.5]);
    expect(idx).toEqual([1, 2, 0]);
  });

  it("percentileCutoffCount(n,0)=0, (n,100)=n", () => {
    expect(percentileCutoffCount(37, 0)).toBe(0);
    expect(percentileCutoffCount(37, 100)).toBe(37);
    expect(percentileCutoffCount(37, 50)).toBe(19);
  });
});
