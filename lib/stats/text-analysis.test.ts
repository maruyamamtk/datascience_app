import { describe, expect, it } from "vitest";
import {
  EN_CORPUS,
  JA_DICTIONARY,
  assignByNearestCentroid,
  buildVocabulary,
  candidatesAt,
  coOccurrenceCounts,
  coOccurrenceMatrix,
  conditionalProbability,
  contextOptions,
  cosineSimilarity,
  documentFrequency,
  farthestPairInit,
  greedySegment,
  inverseDocumentFrequency,
  ngrams,
  preprocessCorpus,
  preprocessSentence,
  queryVector,
  rankDocumentsByQuery,
  removeStopWords,
  runSimpleTopicModel,
  sentenceProbability,
  stem,
  termFrequency,
  tfIdf,
  tfIdfMatrix,
  tokenize,
  topNextWords,
  topWordsPerTopic,
  updateCentroidsMean,
  vecNorm,
  withBoundaries,
  wordVectors,
} from "./text-analysis";

describe("分かち書き（前方最長一致法）", () => {
  it("辞書内のより長い語を優先して選ぶ", () => {
    expect(greedySegment("データサイエンスが好き", JA_DICTIONARY)).toEqual(["データサイエンス", "が", "好き"]);
    expect(greedySegment("機械学習は面白い", JA_DICTIONARY)).toEqual(["機械学習", "は", "面白い"]);
    expect(greedySegment("統計と機械学習を学ぶ", JA_DICTIONARY)).toEqual(["統計", "と", "機械学習", "を", "学ぶ"]);
  });

  it("辞書に無い文字は1文字ずつ未知語として切り出す", () => {
    expect(greedySegment("猫が好き", JA_DICTIONARY)).toEqual(["猫", "が", "好き"]);
  });

  it("candidatesAt はその位置から前方一致する辞書項目を長い順に返す", () => {
    const cands = candidatesAt("データサイエンスが好き", 0, JA_DICTIONARY);
    expect(cands).toEqual(["データサイエンス", "データ"]);
  });
});

describe("前処理: トークン化・ストップワード除去・ステミング", () => {
  it("tokenize は小文字化してアルファベット以外で分割する", () => {
    expect(tokenize("Data Science, and Programming!")).toEqual(["data", "science", "and", "programming"]);
  });

  it("removeStopWords はストップワードだけを取り除く", () => {
    expect(removeStopWords(["machine", "learning", "is", "a", "part", "of", "data", "science"])).toEqual([
      "machine",
      "learning",
      "part",
      "data",
      "science",
    ]);
  });

  it("stem は接尾辞ルールを順に適用する（見出し語化ではなく機械的な切り詰め）", () => {
    expect(stem("combines")).toBe("combine");
    expect(stem("learning")).toBe("learn");
    expect(stem("programming")).toBe("programm"); // 実在しない語幹になる典型例
    expect(stem("statistics")).toBe("statistic");
    expect(stem("studies")).toBe("study");
    expect(stem("flies")).toBe("fly");
    expect(stem("data")).toBe("data"); // 変化させない
  });

  it("preprocessSentence は tokenize→removeStopWords→stem を順に通す", () => {
    const trace = preprocessSentence("machine learning is a part of data science");
    expect(trace.tokens).toEqual(["machine", "learning", "is", "a", "part", "of", "data", "science"]);
    expect(trace.noStop).toEqual(["machine", "learning", "part", "data", "science"]);
    expect(trace.stemmed).toEqual(["machine", "learn", "part", "data", "science"]);
  });

  it("preprocessCorpus はコーパス全体を前処理する", () => {
    const docs = preprocessCorpus();
    expect(docs).toHaveLength(EN_CORPUS.length);
    expect(docs[0]).toEqual(["data", "science", "combine", "statistic", "programm"]);
  });
});

describe("tf-idf", () => {
  const docs = preprocessCorpus();

  it("termFrequency は出現回数/文書長", () => {
    expect(termFrequency("data", docs[0])).toBeCloseTo(1 / 5, 10);
    expect(termFrequency("nonexistent", docs[0])).toBe(0);
  });

  it("documentFrequency はその語を含む文書数", () => {
    expect(documentFrequency("data", docs)).toBe(4); // D1,D2,D4,D5
    expect(documentFrequency("combine", docs)).toBe(1); // D1のみ
  });

  it("inverseDocumentFrequency = ln(N/df)", () => {
    expect(inverseDocumentFrequency("data", docs)).toBeCloseTo(Math.log(5 / 4), 10);
    expect(inverseDocumentFrequency("combine", docs)).toBeCloseTo(Math.log(5 / 1), 10);
  });

  it("全文書に出る語の idf は 0（tf-idf への寄与が消える）", () => {
    // "science" は5文書中4文書に出るので0にはならない。全文書共通語がない本コーパスでは
    // df=N相当の語が無いため、境界値の性質だけ df=N を直接与えて検証する。
    expect(inverseDocumentFrequency("science", [["science"], ["science"]])).toBeCloseTo(0, 10);
  });

  it("珍しい語（低頻度語）の方が tf-idf が高くなる（tf が同じでも）", () => {
    // D1 内では data と combine はどちらも tf=1/5 だが、combine の方が珍しい（df=1 < df=4）。
    expect(tfIdf("combine", docs[0], docs)).toBeGreaterThan(tfIdf("data", docs[0], docs));
  });

  it("tfIdfMatrix は文書×語彙の行列を作る", () => {
    const { vocabulary, matrix } = tfIdfMatrix(docs);
    expect(matrix).toHaveLength(docs.length);
    matrix.forEach((row) => expect(row).toHaveLength(vocabulary.length));
    const combineIdx = vocabulary.indexOf("combine");
    expect(matrix[0][combineIdx]).toBeCloseTo(tfIdf("combine", docs[0], docs), 10);
  });
});

describe("n-gram・言語モデル", () => {
  const corpusTokens = EN_CORPUS.map(tokenize);
  const vocabulary = buildVocabulary(corpusTokens);

  it("ngrams は長さnの連続部分列をすべて返す", () => {
    expect(ngrams(["a", "b", "c", "d"], 2)).toEqual([
      ["a", "b"],
      ["b", "c"],
      ["c", "d"],
    ]);
  });

  it("withBoundaries は (n-1)個の<s>と1個の</s>を付ける", () => {
    expect(withBoundaries(["x", "y"], 3)).toEqual(["<s>", "<s>", "x", "y", "</s>"]);
  });

  it("bigram の条件付き確率 P(science|data) をラプラススムージングで計算する", () => {
    // count(data,science)=4（D1,D2,D4,D5）、count(data)=4、vocabSize=22（語彙21+</s>）。
    const vocabSize = vocabulary.length + 1;
    const p = conditionalProbability(["data"], "science", corpusTokens, 2, vocabSize, 1);
    expect(p).toBeCloseTo(5 / 26, 10);
  });

  it("topNextWords は確率が高い順に候補を返す", () => {
    const top = topNextWords(["data"], corpusTokens, 2, vocabulary, 1, 3);
    expect(top[0].word).toBe("science");
    expect(top[0].prob).toBeGreaterThan(top[1].prob);
  });

  it("contextOptions はコーパスに実在する(n-1)-gramだけを候補にする", () => {
    const opts2 = contextOptions(corpusTokens, 2);
    expect(opts2).toContainEqual(["data"]);
    opts2.forEach((o) => expect(o).toHaveLength(1));

    const opts3 = contextOptions(corpusTokens, 3);
    expect(opts3).toContainEqual(["<s>", "data"]); // 文頭記号+1語目（トライグラムの最初の文脈）
    expect(opts3).toContainEqual(["data", "science"]);
    opts3.forEach((o) => expect(o).toHaveLength(2));
  });

  it("sentenceProbability は連鎖律で各ステップの確率を積み上げる（対数確率が有限）", () => {
    const { steps, logProb } = sentenceProbability(["data", "science"], corpusTokens, 2, vocabulary, 1);
    expect(steps.length).toBeGreaterThan(0);
    expect(Number.isFinite(logProb)).toBe(true);
    // 各ステップの確率は0〜1の範囲。
    steps.forEach((s) => {
      expect(s.prob).toBeGreaterThan(0);
      expect(s.prob).toBeLessThanOrEqual(1);
    });
  });
});

describe("共起（共起ネットワークの隣接行列）", () => {
  const docs = preprocessCorpus();

  it("隣接する語のペアをカウントする（windowSize=2）", () => {
    const counts = coOccurrenceCounts(docs, 2);
    // data と science は D1,D2,D4,D5 の4文書すべてで隣接（距離1）して出現する。
    expect(counts.get("data|science")).toBe(4);
  });

  it("coOccurrenceMatrix は対称行列になる", () => {
    const { vocabulary, matrix } = coOccurrenceMatrix(docs, 2);
    for (let i = 0; i < vocabulary.length; i++) {
      for (let j = 0; j < vocabulary.length; j++) {
        expect(matrix[i][j]).toBe(matrix[j][i]);
      }
    }
    expect(matrix[0][0]).toBe(0); // 自己ループなし
  });

  it("windowSize を広げると共起ペア数（0でない要素数）は減らない", () => {
    const narrow = coOccurrenceMatrix(docs, 1);
    const wide = coOccurrenceMatrix(docs, 3);
    const countNonZero = (m: number[][]) => m.flat().filter((v) => v > 0).length;
    expect(countNonZero(wide.matrix)).toBeGreaterThanOrEqual(countNonZero(narrow.matrix));
  });
});

describe("ベクトル演算・コサイン類似度", () => {
  it("同じベクトル同士のコサイン類似度は1", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 10);
  });

  it("直交ベクトルのコサイン類似度は0", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 10);
  });

  it("ゼロベクトルとの類似度は0（0除算しない）", () => {
    expect(cosineSimilarity([0, 0], [1, 2])).toBe(0);
  });

  it("vecNorm はユークリッドノルム", () => {
    expect(vecNorm([3, 4])).toBeCloseTo(5, 10);
  });
});

describe("単語埋め込み（共起ベース）・ベクトル空間モデル", () => {
  const docs = preprocessCorpus();

  it("wordVectors は共起行列そのもの", () => {
    const wv = wordVectors(docs, 2);
    const com = coOccurrenceMatrix(docs, 2);
    expect(wv.matrix).toEqual(com.matrix);
  });

  it("窓の範囲内で近傍を一切共有しない語同士は単語ベクトルのコサイン類似度が0になる", () => {
    // combine は D1（idx: data,science,combine,statistic,programm）で
    // data・science・statistic・programm と window=2 以内に共起するが、
    // modern は D5（idx: data,science,machine,learn,drive,modern,analytic）の後半にあり、
    // window=2 以内の近傍が learn・drive・analytic で combine の近傍と一切重ならない
    // →分布仮説的に「文脈が全く違う語」として類似度0になる。
    const { vocabulary, matrix } = wordVectors(docs, 2);
    const combineVec = matrix[vocabulary.indexOf("combine")];
    const modernVec = matrix[vocabulary.indexOf("modern")];
    expect(cosineSimilarity(combineVec, modernVec)).toBe(0);
  });

  it("直接共起する語同士は単語ベクトルの対応する成分が正になる", () => {
    const { vocabulary, matrix } = wordVectors(docs, 2);
    const dataVec = matrix[vocabulary.indexOf("data")];
    expect(dataVec[vocabulary.indexOf("science")]).toBeGreaterThan(0);
  });

  it("queryVector はコーパスのidfでtf-idf空間へ射影する", () => {
    const vocabulary = buildVocabulary(docs);
    const q = queryVector(["data", "data", "combine"], docs, vocabulary);
    expect(q[vocabulary.indexOf("data")]).toBeCloseTo((2 / 3) * inverseDocumentFrequency("data", docs), 10);
  });

  it("rankDocumentsByQuery は関連語を含む文書ほど上位に並べる", () => {
    const ranked = rankDocumentsByQuery(["machine", "learn"], docs);
    const zeroScoreIdx = ranked.filter((r) => r.score === 0).map((r) => r.index);
    // D1(0)・D4(3) は machine も learn も含まないのでスコア0。
    expect(zeroScoreIdx.sort()).toEqual([0, 3]);
    expect(ranked[0].score).toBeGreaterThan(0);
  });
});

describe("トピックモデル（簡易 k=2 クラスタリング）", () => {
  const docs = preprocessCorpus();
  const { matrix } = tfIdfMatrix(docs);

  it("farthestPairInit は最もコサイン類似度が低い2文書を選ぶ（決定的）", () => {
    const [i, j] = farthestPairInit(matrix);
    expect(i).not.toBe(j);
    let minSim = Infinity;
    for (let a = 0; a < matrix.length; a++) {
      for (let b = a + 1; b < matrix.length; b++) {
        minSim = Math.min(minSim, cosineSimilarity(matrix[a], matrix[b]));
      }
    }
    expect(cosineSimilarity(matrix[i], matrix[j])).toBeCloseTo(minSim, 10);
  });

  it("assignByNearestCentroid は各ベクトルを最もコサイン類似度が高い中心へ割り当てる", () => {
    const assignment = assignByNearestCentroid(matrix, [matrix[0], matrix[1]]);
    expect(assignment).toHaveLength(matrix.length);
    assignment.forEach((c) => expect([0, 1]).toContain(c));
    expect(assignment[0]).toBe(0); // 自分自身が中心なら必ずそのクラスタ
  });

  it("updateCentroidsMean はクラスタ内の平均ベクトルになる", () => {
    const assignment = [0, 0, 1, 1, 1];
    const centroids = updateCentroidsMean(matrix, assignment, 2);
    const dim = matrix[0].length;
    for (let d = 0; d < dim; d++) {
      expect(centroids[0][d]).toBeCloseTo((matrix[0][d] + matrix[1][d]) / 2, 10);
    }
  });

  it("runSimpleTopicModel は決定的（同じ入力なら同じ結果）で、各ステップの割り当て長が文書数と一致する", () => {
    const stepsA = runSimpleTopicModel(matrix, 2, 3);
    const stepsB = runSimpleTopicModel(matrix, 2, 3);
    expect(stepsA).toEqual(stepsB);
    stepsA.forEach((step) => {
      expect(step.assignment).toHaveLength(matrix.length);
      expect(step.centroids).toHaveLength(2);
    });
  });

  it("topWordsPerTopic はクラスタ内で tf-idf 合計が高い語を返す", () => {
    const { vocabulary, matrix: m } = tfIdfMatrix(docs);
    const assignment = [0, 0, 1, 1, 1];
    const top = topWordsPerTopic(vocabulary, m, assignment, 2, 3);
    expect(top).toHaveLength(2);
    top.forEach((words) => expect(words.length).toBeLessThanOrEqual(3));
  });
});
