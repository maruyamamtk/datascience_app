/**
 * ADASYN 適応重みステッパー（Level1）の純粋なフレームビルダー。
 * 少数派点1つずつについて «局所的な学習の困難度 Δ_i = (k近傍中の多数派の割合)» を計算し、
 * 最終的に正規化した重み g_i=Δ_i/ΣΔ_i を求める過程を1点ずつ数値で追う——SmoteLab（Level0）が
 * «重みの結果»（境界の点ほど多く合成される）を見せるのに対し、こちらは «重みの計算そのもの»
 * を導出として見せる（QUpdateStepper と同じ役割分担, tasks/lessons.md #76 の教訓）。
 */
import type { VizFrame } from "@/components/viz";
import { localDifficulty, type LabeledPoint, type Point2D } from "@/lib/stats/imbalanced-anomaly";

export const ADASYN_DEMO_K = 5;

export type AdasynWeightPayload = {
  index: number;
  point: Point2D;
  neighbors: { point: LabeledPoint; isMajority: boolean }[];
  majorityCount: number;
  k: number;
  difficulty: number;
  totalDifficulty: number;
  weight: number;
};

function kNearestAll(from: Point2D, allPoints: readonly LabeledPoint[], k: number): LabeledPoint[] {
  return allPoints
    .map((p) => ({ p, dist: Math.hypot(p.x1 - from.x1, p.x2 - from.x2) }))
    .filter((e) => e.dist > 0)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, k)
    .map((e) => e.p);
}

/** 少数派点それぞれについて、困難度→重みを1コマずつ求めるフレーム列を作る。 */
export function buildAdasynWeightFrames(minorityPoints: readonly Point2D[], allPoints: readonly LabeledPoint[], k: number = ADASYN_DEMO_K): VizFrame<AdasynWeightPayload>[] {
  const difficulties = minorityPoints.map((p) => localDifficulty(p, allPoints, k));
  const totalDifficulty = difficulties.reduce((s, d) => s + d, 0);

  return minorityPoints.map((point, index) => {
    const neighborPoints = kNearestAll(point, allPoints, k);
    const neighbors = neighborPoints.map((p) => ({ point: p, isMajority: p.label === 0 }));
    const majorityCount = neighbors.filter((n) => n.isMajority).length;
    const difficulty = difficulties[index];
    const weight = totalDifficulty > 0 ? difficulty / totalDifficulty : 1 / minorityPoints.length;
    return {
      highlights: ["current"],
      callout: {
        title: `少数派点 ${index + 1}/${minorityPoints.length}`,
        body:
          majorityCount >= k / 2
            ? `k=${k}近傍のうち${majorityCount}個が多数派——多数派に囲まれた«境界»の点で学習しづらく、重みが大きくなる。`
            : `k=${k}近傍のうち${majorityCount}個だけが多数派——同じ少数派クラスに囲まれた«核»の点で学習しやすく、重みは小さくなる。`,
        kind: "explain",
      },
      payload: { index, point, neighbors, majorityCount, k, difficulty, totalDifficulty, weight },
    };
  });
}
