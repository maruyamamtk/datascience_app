/**
 * 主成分分析（H-1）トピックの計算層（純関数）。
 * 2次元データの共分散行列・その固有値分解（2×2は解析解）・主成分軸への射影・寄与率を扱う。
 * 「相関したデータを、分散最大の方向（主成分）に座標変換して次元を圧縮する」の土台。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。乱数は呼び出し側の Rng に閉じる。
 */

import type { Rng } from "./random";

const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** 2次元点。 */
export type Point2 = { x: number; y: number };

/** 2×2 共分散行列の成分。 */
export type Cov2 = { sxx: number; syy: number; sxy: number };

/** 2次元データの共分散行列（標本, n−1 で割る）。 */
export function covariance2(points: readonly Point2[]): Cov2 {
  const n = points.length;
  if (n < 2) return { sxx: 0, syy: 0, sxy: 0 };
  const mx = mean(points.map((p) => p.x));
  const my = mean(points.map((p) => p.y));
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const p of points) {
    sxx += (p.x - mx) ** 2;
    syy += (p.y - my) ** 2;
    sxy += (p.x - mx) * (p.y - my);
  }
  return { sxx: sxx / (n - 1), syy: syy / (n - 1), sxy: sxy / (n - 1) };
}

/** 主成分（固有ベクトル＝軸の単位ベクトル・固有値＝その軸方向の分散）。 */
export type PrincipalComponent = {
  /** 固有値（その主成分方向の分散）。 */
  eigenvalue: number;
  /** 単位固有ベクトル [ux, uy]。 */
  vector: [number, number];
  /** 軸の角度（ラジアン）。 */
  angle: number;
};

/**
 * 2×2 対称行列 [[sxx, sxy],[sxy, syy]] の固有値分解（解析解）。
 * 固有値を降順（第1主成分が先）に、対応する単位固有ベクトルを返す。
 * 固有値 λ = (tr ± √(tr²−4det))/2、tr=sxx+syy, det=sxx·syy−sxy²。
 */
export function eigenDecomposition2(cov: Cov2): [PrincipalComponent, PrincipalComponent] {
  const { sxx, syy, sxy } = cov;
  const tr = sxx + syy;
  const det = sxx * syy - sxy * sxy;
  const disc = Math.sqrt(Math.max(0, (tr / 2) ** 2 - det));
  const l1 = tr / 2 + disc; // 大きいほう＝第1主成分
  const l2 = tr / 2 - disc;

  const vecFor = (lambda: number): [number, number] => {
    // (sxx−λ)ux + sxy·uy = 0 → 固有ベクトル。
    if (Math.abs(sxy) > 1e-12) {
      const ux = lambda - syy;
      const uy = sxy;
      const norm = Math.hypot(ux, uy) || 1;
      return [ux / norm, uy / norm];
    }
    // 非対角が0＝既に主軸。分散の大きい軸を選ぶ。
    return sxx >= syy ? [1, 0] : [0, 1];
  };

  const v1 = vecFor(l1);
  const v2 = vecFor(l2);
  return [
    { eigenvalue: l1, vector: v1, angle: Math.atan2(v1[1], v1[0]) },
    { eigenvalue: l2, vector: v2, angle: Math.atan2(v2[1], v2[0]) },
  ];
}

/** 第1主成分の寄与率 λ1/(λ1+λ2)。 */
export function explainedVarianceRatio(pcs: readonly PrincipalComponent[]): number[] {
  const total = pcs.reduce((a, p) => a + p.eigenvalue, 0);
  if (total <= 0) return pcs.map(() => 0);
  return pcs.map((p) => p.eigenvalue / total);
}

/** 点を主成分軸へ射影したスコア（中心化してから固有ベクトルとの内積）。 */
export function projectToPC(points: readonly Point2[], pc: PrincipalComponent): number[] {
  const mx = mean(points.map((p) => p.x));
  const my = mean(points.map((p) => p.y));
  return points.map((p) => (p.x - mx) * pc.vector[0] + (p.y - my) * pc.vector[1]);
}

/**
 * 相関した2次元データを生成。x は標準正規、y = corr に応じて x と相関。スケール sx, sy。
 * 決定的 PRNG で再現可能。
 */
export function generateCorrelatedData(params: {
  n: number;
  corr: number;
  sx: number;
  sy: number;
  rng: Rng;
}): Point2[] {
  const { n, corr, sx, sy, rng } = params;
  const s = Math.sqrt(Math.max(0, 1 - corr * corr));
  const out: Point2[] = [];
  for (let i = 0; i < n; i++) {
    const a = gauss(rng);
    const b = gauss(rng);
    const zx = a;
    const zy = corr * a + s * b;
    out.push({ x: zx * sx, y: zy * sy });
  }
  return out;
}

/** ボックス–ミュラー法で標準正規。 */
function gauss(rng: Rng): number {
  const u1 = Math.max(1e-12, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
