/**
 * テキスト解析（Q-3）トピックの計算層（純関数）。
 * 「前処理（分かち書き・ストップワード除去・ステミング）→頻度ベースの表現（tf-idf・n-gram言語モデル）
 * →ベクトル空間の表現（共起に基づく単語埋め込み・コサイン類似度・ベクトル空間モデル）→トピックモデル
 * （tf-idf文書ベクトルの単純な2クラスタリング）」という古典的テキスト解析パイプラインを、
 * 3〜5文程度の小さなコーパスで最初から最後まで数値で追える形にする。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。乱数は一切使わない
 * （k-means 風の初期化は「最もコサイン類似度が低い2文書」を選ぶ決定的な方法にし、
 * tasks/lessons.md の「SSR時の疑似乱数はLCG/mulberry32」を待たずにハイドレーション不一致を避ける）。
 */

// ---------------------------------------------------------------------------
// コーパス（英語5文・日本語辞書ベース分かち書き用の小さな例文）
// ---------------------------------------------------------------------------

/** パイプライン全体（tf-idf・n-gram・共起・ベクトル空間・トピックモデル）で共有する小さなコーパス。 */
export const EN_CORPUS: readonly string[] = [
  "data science combines statistics and programming",
  "machine learning is a part of data science",
  "statistics helps machine learning models generalize",
  "programming skills support data science projects",
  "data science and machine learning drive modern analytics",
];

/** ストップワード（英語・出現頻度が高すぎて内容語の識別に寄与しない機能語）。 */
export const EN_STOP_WORDS: readonly string[] = [
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "with",
];

/** 日本語«分かち書き»デモ用の小さな辞書（実運用の MeCab 等は確率モデル＋大規模辞書を使うが、
 * ここでは «辞書に載っている最長の語を貪欲に選ぶ»（前方最長一致法）という単純なルールで原理を見せる。 */
export const JA_DICTIONARY: readonly string[] = [
  "データ",
  "サイエンス",
  "データサイエンス",
  "機械",
  "学習",
  "機械学習",
  "統計",
  "面白い",
  "好き",
  "学ぶ",
  "が",
  "は",
  "と",
  "を",
];

/** 分かち書きデモの例文。 */
export const JA_SENTENCES: readonly string[] = [
  "データサイエンスが好き",
  "機械学習は面白い",
  "統計と機械学習を学ぶ",
];

// ---------------------------------------------------------------------------
// 前処理: 分かち書き（日本語・辞書ベース前方最長一致法）
// ---------------------------------------------------------------------------

/**
 * 前方最長一致法（forward maximum matching）による貪欲な分かち書き。
 * 各位置で、辞書に含まれる語のうちその位置から始まる **最も長い一致** を選び、なければ1文字を
 * 未知語として切り出す。スペースを持たない日本語で「どこが単語の切れ目か」を決める、
 * 最も単純な形態素解析（の分かち書きの部分）の考え方。
 */
export function greedySegment(text: string, dictionary: readonly string[] = JA_DICTIONARY): string[] {
  const sorted = [...dictionary].sort((a, b) => b.length - a.length);
  const tokens: string[] = [];
  let i = 0;
  while (i < text.length) {
    const match = sorted.find((w) => text.startsWith(w, i));
    if (match) {
      tokens.push(match);
      i += match.length;
    } else {
      tokens.push(text[i]);
      i += 1;
    }
  }
  return tokens;
}

/** 位置 i で候補になり得た辞書項目（前方一致するもの、長い順）。分かち書きステッパーの近傍コールアウト用。 */
export function candidatesAt(text: string, position: number, dictionary: readonly string[] = JA_DICTIONARY): string[] {
  return [...dictionary]
    .filter((w) => text.startsWith(w, position))
    .sort((a, b) => b.length - a.length);
}

// ---------------------------------------------------------------------------
// 前処理: トークン化（英語）・ストップワード除去・ステミング
// ---------------------------------------------------------------------------

/** 英語の単純なトークン化: 小文字化してアルファベット以外で分割する。 */
export function tokenize(text: string): string[] {
  const matches = text.toLowerCase().match(/[a-z]+/g);
  return matches ?? [];
}

/** ストップワード除去。 */
export function removeStopWords(tokens: readonly string[], stopWords: readonly string[] = EN_STOP_WORDS): string[] {
  const stopSet = new Set(stopWords);
  return tokens.filter((t) => !stopSet.has(t));
}

/**
 * 単純な接尾辞除去ステミング（Porter法を簡略化したルールベース）。
 * 語尾のパターンを順に試し、最初に一致したものを適用する。
 * 見出し語化（lemmatization）と違い、辞書を引かず機械的に切るだけなので、
 * 例えば "programming" → "programm" のように **実在しない語幹** になることがある
 * ——これはバグではなく、ステミングと見出し語化の違いを示す典型例。
 */
export function stem(word: string): string {
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 5 && word.endsWith("ing")) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith("ed")) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith("ly")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

export function stemTokens(tokens: readonly string[]): string[] {
  return tokens.map(stem);
}

export type PreprocessTrace = {
  tokens: string[];
  noStop: string[];
  stemmed: string[];
};

/** 1文を「トークン化→ストップワード除去→ステミング」まで通した中間結果一式。 */
export function preprocessSentence(text: string, stopWords: readonly string[] = EN_STOP_WORDS): PreprocessTrace {
  const tokens = tokenize(text);
  const noStop = removeStopWords(tokens, stopWords);
  const stemmed = stemTokens(noStop);
  return { tokens, noStop, stemmed };
}

/** コーパス全体を前処理し、以降の tf-idf・共起・トピックモデルが使う「文書＝語のリスト」の配列にする。 */
export function preprocessCorpus(corpus: readonly string[] = EN_CORPUS): string[][] {
  return corpus.map((s) => preprocessSentence(s).stemmed);
}

// ---------------------------------------------------------------------------
// tf-idf
// ---------------------------------------------------------------------------

/** 文書中でのある語の出現割合（tf = 出現回数 / 文書の総語数）。 */
export function termFrequency(term: string, doc: readonly string[]): number {
  if (doc.length === 0) return 0;
  const count = doc.filter((w) => w === term).length;
  return count / doc.length;
}

/** その語を含む文書数。 */
export function documentFrequency(term: string, docs: readonly string[][]): number {
  return docs.filter((d) => d.includes(term)).length;
}

/** 逆文書頻度 idf = ln(N / df)。全文書に出る語（df=N）は 0 になり、tf-idf への寄与が消える。 */
export function inverseDocumentFrequency(term: string, docs: readonly string[][]): number {
  const df = documentFrequency(term, docs);
  if (df === 0) return 0;
  return Math.log(docs.length / df);
}

export function tfIdf(term: string, doc: readonly string[], docs: readonly string[][]): number {
  return termFrequency(term, doc) * inverseDocumentFrequency(term, docs);
}

/** コーパス全体の語彙（重複なし・辞書順）。 */
export function buildVocabulary(docs: readonly string[][]): string[] {
  const set = new Set<string>();
  docs.forEach((d) => d.forEach((w) => set.add(w)));
  return [...set].sort();
}

export type TfIdfMatrix = { vocabulary: string[]; matrix: number[][] };

/** 文書×語彙の tf-idf 行列。 */
export function tfIdfMatrix(docs: readonly string[][]): TfIdfMatrix {
  const vocabulary = buildVocabulary(docs);
  const matrix = docs.map((doc) => vocabulary.map((term) => tfIdf(term, doc, docs)));
  return { vocabulary, matrix };
}

// ---------------------------------------------------------------------------
// n-gram・言語モデル（条件付き確率）
// ---------------------------------------------------------------------------

export const BOS = "<s>";
export const EOS = "</s>";

/** 文の前後に (n-1) 個の文頭記号 <s> と1個の文末記号 </s> を付ける（文をまたいだ誤ったn-gramを防ぐ）。 */
export function withBoundaries(tokens: readonly string[], n: number): string[] {
  const pad = Math.max(0, n - 1);
  return [...Array(pad).fill(BOS), ...tokens, EOS];
}

/** トークン列から n-gram（長さ n の連続する部分列）をすべて取り出す。 */
export function ngrams(tokens: readonly string[], n: number): string[][] {
  const out: string[][] = [];
  for (let i = 0; i <= tokens.length - n; i++) out.push(tokens.slice(i, i + n));
  return out;
}

/** コーパス全体（文ごとに境界記号を付けてから連結）での n-gram 出現回数。 */
export function countNgrams(corpusTokens: readonly string[][], n: number): Map<string, number> {
  const counts = new Map<string, number>();
  for (const tokens of corpusTokens) {
    for (const gram of ngrams(withBoundaries(tokens, n), n)) {
      const key = gram.join(" ");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * ラプラススムージング付きの条件付き確率 P(word | context)。
 * n=1（ユニグラム）のときは context=[] として、全ユニグラム総数に対する頻度を返す。
 * P(w|c) = (count(c,w) + α) / (count(c) + α·V) — count(c) が 0 でも 0 除算にならない
 * （未知の文脈にも一様に確率を割り振る）。
 */
export function conditionalProbability(
  context: readonly string[],
  word: string,
  corpusTokens: readonly string[][],
  n: number,
  vocabSize: number,
  alpha = 1,
): number {
  const ngramCounts = countNgrams(corpusTokens, n);
  const ngramKey = [...context, word].join(" ");
  const ngramCount = ngramCounts.get(ngramKey) ?? 0;

  let contextTotal: number;
  if (n === 1) {
    contextTotal = corpusTokens.reduce((s, t) => s + withBoundaries(t, 1).length, 0);
  } else {
    const contextCounts = countNgrams(corpusTokens, n - 1);
    contextTotal = contextCounts.get(context.join(" ")) ?? 0;
  }
  return (ngramCount + alpha) / (contextTotal + alpha * vocabSize);
}

/** コーパス中に実際に出現する (n-1)-gram を文脈候補として列挙する（UIのドロップダウン用）。 */
export function contextOptions(corpusTokens: readonly string[][], n: number): string[][] {
  if (n <= 1) return [[]];
  const counts = countNgrams(corpusTokens, n - 1);
  return [...counts.keys()].sort().map((k) => k.split(" "));
}

/** 与えた語彙の中から、その文脈に続く確率が高い順に上位 topN 語を返す（ラボの棒グラフ用）。 */
export function topNextWords(
  context: readonly string[],
  corpusTokens: readonly string[][],
  n: number,
  vocabulary: readonly string[],
  alpha = 1,
  topN = 5,
): { word: string; prob: number }[] {
  const candidates = [...vocabulary, EOS];
  const scored = candidates.map((word) => ({
    word,
    prob: conditionalProbability(context, word, corpusTokens, n, candidates.length, alpha),
  }));
  return scored.sort((a, b) => b.prob - a.prob).slice(0, topN);
}

/** 文全体の確率を連鎖律の n-gram 近似で計算し、各ステップの条件付き確率も残す（導出の数値確認用）。 */
export function sentenceProbability(
  sentenceTokens: readonly string[],
  corpusTokens: readonly string[][],
  n: number,
  vocabulary: readonly string[],
  alpha = 1,
): { steps: { context: string[]; word: string; prob: number }[]; logProb: number } {
  const padded = withBoundaries(sentenceTokens, n);
  const steps: { context: string[]; word: string; prob: number }[] = [];
  const vocabWithEos = [...vocabulary, EOS];
  for (let i = n - 1; i < padded.length; i++) {
    const context = padded.slice(i - (n - 1), i);
    const word = padded[i];
    const prob = conditionalProbability(context, word, corpusTokens, n, vocabWithEos.length, alpha);
    steps.push({ context, word, prob });
  }
  const logProb = steps.reduce((s, step) => s + Math.log(step.prob), 0);
  return { steps, logProb };
}

// ---------------------------------------------------------------------------
// 共起（共起ネットワークの隣接行列）
// ---------------------------------------------------------------------------

/** 前後 windowSize 語以内に共に現れた語のペア回数（文書をまたがない）。 */
export function coOccurrenceCounts(docs: readonly string[][], windowSize: number): Map<string, number> {
  const counts = new Map<string, number>();
  for (const doc of docs) {
    for (let i = 0; i < doc.length; i++) {
      for (let j = i + 1; j <= Math.min(i + windowSize, doc.length - 1); j++) {
        const a = doc[i];
        const b = doc[j];
        if (a === b) continue;
        const key = a < b ? `${a}|${b}` : `${b}|${a}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }
  return counts;
}

export type CoOccurrenceMatrix = { vocabulary: string[]; matrix: number[][] };

/** 共起カウントを語彙×語彙の対称行列（共起ネットワークの隣接行列）にする。 */
export function coOccurrenceMatrix(docs: readonly string[][], windowSize: number): CoOccurrenceMatrix {
  const vocabulary = buildVocabulary(docs);
  const counts = coOccurrenceCounts(docs, windowSize);
  const index = new Map(vocabulary.map((w, i) => [w, i] as const));
  const matrix = vocabulary.map(() => vocabulary.map(() => 0));
  for (const [key, c] of counts) {
    const [a, b] = key.split("|");
    const ia = index.get(a);
    const ib = index.get(b);
    if (ia === undefined || ib === undefined) continue;
    matrix[ia][ib] = c;
    matrix[ib][ia] = c;
  }
  return { vocabulary, matrix };
}

// ---------------------------------------------------------------------------
// ベクトル演算・コサイン類似度（単語埋め込み・ベクトル空間モデル共通の道具）
// ---------------------------------------------------------------------------

export function dot(a: readonly number[], b: readonly number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

export function vecNorm(a: readonly number[]): number {
  return Math.sqrt(dot(a, a));
}

/** コサイン類似度 = a·b / (‖a‖‖b‖)。ゼロベクトルとの類似度は 0 と定義する（0除算を避ける）。 */
export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  const na = vecNorm(a);
  const nb = vecNorm(b);
  if (na === 0 || nb === 0) return 0;
  return dot(a, b) / (na * nb);
}

// ---------------------------------------------------------------------------
// 単語埋め込み（共起カウントに基づく簡易版）・ベクトル空間モデル（文書検索）
// ---------------------------------------------------------------------------

/**
 * 共起カウントの行をそのまま「単語ベクトル（簡易埋め込み）」として使う——
 * 「意味の近い語は同じような文脈（周囲の語）に現れる」という分布仮説を、
 * ニューラルな埋め込み層の学習なしに最も直接的な形で体感できる（LSA 等のカウントベース埋め込みの原型）。
 */
export function wordVectors(docs: readonly string[][], windowSize: number): CoOccurrenceMatrix {
  return coOccurrenceMatrix(docs, windowSize);
}

/** クエリ（語の集合）を、コーパスの idf を使って tf-idf ベクトル空間に射影する。 */
export function queryVector(queryTokens: readonly string[], docs: readonly string[][], vocabulary: readonly string[]): number[] {
  return vocabulary.map((term) => termFrequency(term, queryTokens) * inverseDocumentFrequency(term, docs));
}

/** ベクトル空間モデル: クエリと各文書の tf-idf ベクトルのコサイン類似度で文書を順位付けする。 */
export function rankDocumentsByQuery(
  queryTokens: readonly string[],
  docs: readonly string[][],
): { index: number; score: number }[] {
  const { vocabulary, matrix } = tfIdfMatrix(docs);
  const q = queryVector(queryTokens, docs, vocabulary);
  return matrix
    .map((docVec, index) => ({ index, score: cosineSimilarity(docVec, q) }))
    .sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// トピックモデル（簡易版: tf-idf 文書ベクトルの k=2 クラスタリング）
// ---------------------------------------------------------------------------

/** 初期中心の決め方: 乱数を使わず、コサイン類似度が最も低い（＝最も似ていない）2文書を選ぶ。 */
export function farthestPairInit(vectors: readonly number[][]): [number, number] {
  let best: [number, number] = [0, Math.min(1, vectors.length - 1)];
  let worstSim = Infinity;
  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      const sim = cosineSimilarity(vectors[i], vectors[j]);
      if (sim < worstSim) {
        worstSim = sim;
        best = [i, j];
      }
    }
  }
  return best;
}

/** 各ベクトルを、コサイン類似度が最大の中心のクラスタへ割り当てる。 */
export function assignByNearestCentroid(vectors: readonly number[][], centroids: readonly number[][]): number[] {
  return vectors.map((v) => {
    let bestK = 0;
    let bestSim = -Infinity;
    centroids.forEach((c, k) => {
      const sim = cosineSimilarity(v, c);
      if (sim > bestSim) {
        bestSim = sim;
        bestK = k;
      }
    });
    return bestK;
  });
}

/** クラスタごとの平均ベクトルへ中心を更新する（メンバーがいないクラスタは中心を据え置く）。 */
export function updateCentroidsMean(vectors: readonly number[][], assignment: readonly number[], k: number): number[][] {
  const dim = vectors[0]?.length ?? 0;
  const sums: number[][] = Array.from({ length: k }, () => new Array(dim).fill(0));
  const counts = new Array(k).fill(0);
  vectors.forEach((v, i) => {
    const c = assignment[i];
    counts[c] += 1;
    v.forEach((x, d) => {
      sums[c][d] += x;
    });
  });
  return sums.map((s, c) => (counts[c] > 0 ? s.map((x) => x / counts[c]) : s));
}

export type TopicModelStep = { assignment: number[]; centroids: number[][] };

/**
 * 「少数文書×少数語のトイデータでの LDA 的な直感」を示す簡易トピックモデル:
 * tf-idf 文書ベクトルを k=2 クラスタへ、割り当て→中心更新を iterations 回繰り返す
 * （k-means のコサイン類似度版）。本格的な LDA のギブスサンプリングは行わない。
 */
export function runSimpleTopicModel(vectors: readonly number[][], k = 2, iterations = 3): TopicModelStep[] {
  const [i0, i1] = farthestPairInit(vectors);
  let centroids: number[][] = k >= 2 ? [vectors[i0], vectors[i1]] : [vectors[i0]];
  const steps: TopicModelStep[] = [];
  for (let it = 0; it < iterations; it++) {
    const assignment = assignByNearestCentroid(vectors, centroids);
    steps.push({ assignment, centroids });
    centroids = updateCentroidsMean(vectors, assignment, k);
  }
  return steps;
}

/** クラスタに属する文書の tf-idf を合算し、上位 topN 語を「そのトピックらしい語」として返す。 */
export function topWordsPerTopic(
  vocabulary: readonly string[],
  matrix: readonly number[][],
  assignment: readonly number[],
  k: number,
  topN = 3,
): string[][] {
  const scores: number[][] = Array.from({ length: k }, () => new Array(vocabulary.length).fill(0));
  matrix.forEach((docVec, i) => {
    const c = assignment[i];
    docVec.forEach((v, d) => {
      scores[c][d] += v;
    });
  });
  return scores.map((s) =>
    s
      .map((v, d) => [v, d] as const)
      .sort((a, b) => b[0] - a[0])
      .filter(([v]) => v > 0)
      .slice(0, topN)
      .map(([, d]) => vocabulary[d]),
  );
}
