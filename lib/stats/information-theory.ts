/**
 * 情報理論（P-2）の計算層（純関数・副作用なし・Vitest対象）。
 *
 * シャノン情報量（自己情報量）・エントロピー・相互情報量・KLダイバージェンスを、
 * すべて底2の対数（bit単位）で統一して扱う。教育上の理由から底2を選ぶ——
 * 公正なコイン投げ（p=0.5）の自己情報量がちょうど1 bitになる（digital-information-basics
 * トピックの「ビット＝情報量の単位」とそのまま接続する）。
 *
 * 相互情報量とKLダイバージェンスの関係 I(X;Y)=D_KL(P(X,Y)‖P(X)P(Y)) は、
 * mutualInformation（直接の定義式）と mutualInformationViaKL（KLの定義を経由）の
 * 2通りの実装で計算し、単体テストで一致することを確認する（数式を誤魔化さない）。
 */

/** 離散確率分布（各要素が確率、合計は1に近い想定）。 */
export type Distribution = number[];

/** 2変数の同時分布 joint[i][j] = P(X=x_i, Y=y_j)。 */
export type JointDistribution = number[][];

const clampNonNegative = (v: number): number => (v > 0 ? v : 0);

/**
 * 重み配列を確率分布に正規化する（合計1）。
 * 負の重みは0とみなす。合計が0以下（すべて0など）のときは一様分布にフォールバックする
 * （ラボでスライダーをすべて0にしても NaN が伝播しないようにするための安全策）。
 */
export function normalize(weights: readonly number[]): Distribution {
  const total = weights.reduce((sum, w) => sum + clampNonNegative(w), 0);
  if (total <= 0) return weights.map(() => 1 / weights.length);
  return weights.map((w) => clampNonNegative(w) / total);
}

/** 2次元の重み表を同時分布に正規化する（全セルの合計が1）。 */
export function normalizeJoint(counts: readonly (readonly number[])[]): JointDistribution {
  const total = counts.reduce(
    (sum, row) => sum + row.reduce((s, v) => s + clampNonNegative(v), 0),
    0,
  );
  const rows = counts.length;
  const cols = counts[0]?.length ?? 0;
  if (total <= 0) {
    const uniform = rows * cols > 0 ? 1 / (rows * cols) : 0;
    return counts.map((row) => row.map(() => uniform));
  }
  return counts.map((row) => row.map((v) => clampNonNegative(v) / total));
}

/**
 * シャノン情報量（自己情報量, self-information）。
 * I(x) = -log2 P(x)  [bit]
 * 確率pの事象が実際に起きたと知ったときの「驚きの量」。p=1（必ず起きる）で0、
 * pが小さいほど（珍しい事象ほど）大きくなる。p<=0 は未定義として +Infinity を返す。
 */
export function selfInformation(p: number): number {
  if (!(p > 0)) return Infinity;
  return -Math.log2(p);
}

/**
 * エントロピー H(X) = -Σ p(x) log2 p(x)  [bit]
 * 確率変数Xの「不確実性の平均」＝自己情報量の期待値。p(x)=0の項は
 * lim_{p→0} p log2 p = 0（高校数学の範囲を超えるがロピタルの定理で示せる極限）として0扱いする。
 */
export function entropy(dist: readonly number[]): number {
  return dist.reduce((sum, p) => sum + (p > 0 ? -p * Math.log2(p) : 0), 0);
}

/**
 * 2値（表/裏、成功/失敗）のエントロピー H(p) = -p log2 p - (1-p) log2(1-p)。
 * p=0.5（五分五分）で最大値1 bitを取り、p=0またはp=1（結果が確定）で0になる
 * （L1で微分により導出する）。
 */
export function binaryEntropy(p: number): number {
  return entropy([p, 1 - p]);
}

/** 同時分布からXの周辺分布 P(X)=Σ_y P(X,Y) を求める。 */
export function marginalX(joint: JointDistribution): Distribution {
  return joint.map((row) => row.reduce((a, b) => a + b, 0));
}

/** 同時分布からYの周辺分布 P(Y)=Σ_x P(X,Y) を求める。 */
export function marginalY(joint: JointDistribution): Distribution {
  const cols = joint[0]?.length ?? 0;
  const result = new Array(cols).fill(0) as number[];
  for (const row of joint) {
    row.forEach((v, j) => {
      result[j] += v;
    });
  }
  return result;
}

/** 同時エントロピー H(X,Y) = -ΣΣ p(x,y) log2 p(x,y)。 */
export function jointEntropy(joint: JointDistribution): number {
  return entropy(joint.flat());
}

/**
 * 条件付きエントロピー H(Y|X) = H(X,Y) - H(X)。
 * 「Xが分かった後もYに残る不確実性」の平均。X,Yが独立なら H(Y|X)=H(Y)（Xを知っても
 * Yの不確実性は減らない）。
 */
export function conditionalEntropy(joint: JointDistribution): number {
  return jointEntropy(joint) - entropy(marginalX(joint));
}

/**
 * 2つの分布の直積分布 P(X)P(Y) を作る（相互情報量・KLダイバージェンスの関係を示すのに使う）。
 * XとYが独立だった場合に「あるべき」同時分布に相当する。
 */
export function productDistribution(px: Distribution, py: Distribution): JointDistribution {
  return px.map((pxi) => py.map((pyj) => pxi * pyj));
}

/**
 * KLダイバージェンス D_KL(P‖Q) = Σ p(x) log2( p(x)/q(x) )。
 * 「真の分布Pを、近似分布Qで表したときの情報の損失」。常に0以上、P=Qのときのみ0
 * （非負性はイェンセンの不等式から従う——本トピックでは数値実験で確認する）。
 * q(x)=0 かつ p(x)>0 の項があれば、その事象はQでは「絶対に起きない」とみなしているのに
 * 実際には起きうるということなので、発散（+Infinity）を返す——非対称性の極端な現れ。
 */
export function klDivergence(p: readonly number[], q: readonly number[]): number {
  let sum = 0;
  for (let i = 0; i < p.length; i++) {
    const pi = p[i];
    if (!(pi > 0)) continue;
    const qi = q[i];
    if (!(qi > 0)) return Infinity;
    sum += pi * Math.log2(pi / qi);
  }
  return sum;
}

/**
 * 相互情報量 I(X;Y) = ΣΣ p(x,y) log2( p(x,y) / (p(x)p(y)) )  [bit]
 * 「Yを知ることで、Xの不確実性がどれだけ減るか」（対称: I(X;Y)=I(Y;X)）。
 * X,Yが独立なら常に0（p(x,y)=p(x)p(y)なのでlogの中身が1、log2 1=0）。
 */
export function mutualInformation(joint: JointDistribution): number {
  const px = marginalX(joint);
  const py = marginalY(joint);
  let sum = 0;
  joint.forEach((row, i) => {
    row.forEach((pxy, j) => {
      if (!(pxy > 0)) return;
      const denom = px[i] * py[j];
      if (!(denom > 0)) return;
      sum += pxy * Math.log2(pxy / denom);
    });
  });
  return sum;
}

/**
 * 相互情報量を「同時分布と周辺分布の直積とのKLダイバージェンス」経由で計算する。
 * I(X;Y) = D_KL( P(X,Y) ‖ P(X)P(Y) )
 * mutualInformation（直接の定義式）と数値的に一致することをテストで確認し、
 * 「相互情報量＝独立だった場合からのズレをKLで測ったもの」という関係を実装レベルで裏付ける。
 */
export function mutualInformationViaKL(joint: JointDistribution): number {
  const px = marginalX(joint);
  const py = marginalY(joint);
  const product = productDistribution(px, py);
  return klDivergence(joint.flat(), product.flat());
}

/** H(X)+H(Y)-H(X,Y) 経由の相互情報量（もう1つの等価な定義。テストでの相互検証に使う）。 */
export function mutualInformationViaEntropies(joint: JointDistribution): number {
  const hx = entropy(marginalX(joint));
  const hy = entropy(marginalY(joint));
  const hxy = jointEntropy(joint);
  return hx + hy - hxy;
}
