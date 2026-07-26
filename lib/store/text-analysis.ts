import {
  EN_CORPUS,
  EN_STOP_WORDS,
  JA_DICTIONARY,
  JA_SENTENCES,
  buildVocabulary,
  candidatesAt,
  coOccurrenceMatrix,
  contextOptions,
  cosineSimilarity,
  greedySegment,
  inverseDocumentFrequency,
  preprocessCorpus,
  preprocessSentence,
  queryVector,
  rankDocumentsByQuery,
  runSimpleTopicModel,
  sentenceProbability,
  tfIdfMatrix,
  tokenize,
  topNextWords,
  topWordsPerTopic,
  wordVectors,
  type PreprocessTrace,
  type TopicModelStep,
} from "@/lib/stats/text-analysis";
import { createTopicStore } from "./topicStore";

// ---------------------------------------------------------------------------
// トピック共有の定数（コーパス・語彙・行列は controls に依らず一定なので、ストアの外で1回だけ計算する）
// ---------------------------------------------------------------------------

/** ストップワード除去＋ステミングまで済ませた文書集合（tf-idf・共起・トピックモデルが使う）。 */
export const DOCS = preprocessCorpus(EN_CORPUS);
export const { vocabulary: TFIDF_VOCAB, matrix: TFIDF_MATRIX } = tfIdfMatrix(DOCS);

/** n-gram 言語モデル用のトークン列（ストップワード除去なし——文の並びをそのまま使う）。 */
export const NGRAM_TOKENS = EN_CORPUS.map(tokenize);
export const NGRAM_VOCAB = buildVocabulary(NGRAM_TOKENS);

/** クエリのプリセット（ベクトル空間モデルの文書検索デモ用）。 */
export const QUERY_PRESETS: readonly string[] = [
  "machine learning",
  "data programming",
  "statistics models",
];

/** 簡易トピックモデル（k=2）は controls に依存しないので固定で3イテレーション分計算しておく。 */
export const TOPIC_MODEL_STEPS: TopicModelStep[] = runSimpleTopicModel(TFIDF_MATRIX, 2, 3);

/**
 * n=2 の文脈候補には "</s>"（文末記号のみが続く=常に一様分布）も含まれ、これが辞書順で先頭に
 * 来てしまう。初期表示では意味のある予測が見える「data」から始める方が分かりやすいので、
 * その index を初期値に使う（見つからなければ0にフォールバック）。
 */
const INITIAL_NGRAM_CONTEXT_INDEX = Math.max(
  0,
  contextOptions(NGRAM_TOKENS, 2).findIndex((ctx) => ctx[0] === "data"),
);

/** 単語ベクトル比較の初期選択は「data」「machine」——共起の窓に重なりがあり類似度が0にならない例。 */
const INITIAL_WORD_A_INDEX = Math.max(0, TFIDF_VOCAB.indexOf("data"));
const INITIAL_WORD_B_INDEX = Math.max(0, TFIDF_VOCAB.indexOf("machine"));

const clampIndex = (value: number, max: number): number => Math.max(0, Math.min(max, Math.round(value)));

export type TaControls = {
  /** L0: 分かち書きデモで見せる日本語の例文（JA_SENTENCES の index）。 */
  jaSentenceIndex: number;
  /** L0/L1: ストップワード除去・ステミング・tf-idf で見せる英語の例文（EN_CORPUS の index）。 */
  enSentenceIndex: number;
  /** L1: n-gram のオーダー（2=バイグラム, 3=トライグラム）。 */
  ngramN: 2 | 3;
  /** L1: contextOptions(NGRAM_TOKENS, ngramN) の何番目を選んでいるか。 */
  ngramContextIndex: number;
  /** L2: 共起ネットワーク・単語ベクトルの窓幅。 */
  windowSize: number;
  /** L2: 単語埋め込みの類似度比較で選んでいる語ペア（TFIDF_VOCAB の index を流用した共起語彙の index）。 */
  wordAIndex: number;
  wordBIndex: number;
  /** L2: ベクトル空間モデルの文書検索デモで選んでいるクエリ（QUERY_PRESETS の index）。 */
  queryPresetIndex: number;
};

export type TaDerived = {
  jaSentence: string;
  jaTokens: string[];
  enSentence: string;
  preprocessTrace: PreprocessTrace;

  vocabulary: string[];
  selectedDocWords: { term: string; tf: number; idf: number; tfidf: number }[];

  ngramN: 2 | 3;
  ngramContextOptions: string[][];
  ngramContext: string[];
  nextWordCandidates: { word: string; prob: number }[];
  sentenceProb: ReturnType<typeof sentenceProbability>;

  windowSize: number;
  coVocabulary: string[];
  coMatrix: number[][];
  wordVocabulary: string[];
  wordVectorMatrix: number[][];
  wordAIndex: number;
  wordBIndex: number;
  wordSimilarity: number;

  queryPreset: string;
  rankedDocs: { index: number; score: number }[];

  topicSteps: TopicModelStep[];
  topicTopWords: string[][];
};

/**
 * テキスト解析（Q-3）トピックの Zustand ストア（single source of truth）。
 * Control 層（各ラボの select/slider）は setControl を呼び、Render 層（各 Lab/Stepper）は
 * controls・derived を購読するだけ——1つの操作変更が対応するグラフ・数式へ一貫して反映される。
 */
export const useTextAnalysisStore = createTopicStore<TaControls, TaDerived>({
  initialControls: {
    jaSentenceIndex: 0,
    enSentenceIndex: 0,
    ngramN: 2,
    ngramContextIndex: INITIAL_NGRAM_CONTEXT_INDEX,
    windowSize: 2,
    wordAIndex: INITIAL_WORD_A_INDEX,
    wordBIndex: INITIAL_WORD_B_INDEX,
    queryPresetIndex: 0,
  },
  derive: ({ jaSentenceIndex, enSentenceIndex, ngramN, ngramContextIndex, windowSize, wordAIndex, wordBIndex, queryPresetIndex }) => {
    const jaSentence = JA_SENTENCES[clampIndex(jaSentenceIndex, JA_SENTENCES.length - 1)];
    const jaTokens = greedySegment(jaSentence, JA_DICTIONARY);

    const enSentence = EN_CORPUS[clampIndex(enSentenceIndex, EN_CORPUS.length - 1)];
    const preprocessTrace = preprocessSentence(enSentence, EN_STOP_WORDS);

    const docIdx = clampIndex(enSentenceIndex, DOCS.length - 1);
    const doc = DOCS[docIdx];
    const selectedDocWords = [...new Set(doc)]
      .map((term) => {
        const tf = doc.filter((w) => w === term).length / doc.length;
        const idf = inverseDocumentFrequency(term, DOCS);
        return { term, tf, idf, tfidf: tf * idf };
      })
      .sort((a, b) => b.tfidf - a.tfidf);

    const nOrder = ngramN === 3 ? 3 : 2;
    const options = contextOptions(NGRAM_TOKENS, nOrder);
    const ctxIdx = clampIndex(ngramContextIndex, Math.max(0, options.length - 1));
    const ngramContext = options[ctxIdx] ?? [];
    const nextWordCandidates = topNextWords(ngramContext, NGRAM_TOKENS, nOrder, NGRAM_VOCAB, 1, 5);
    const sentenceProb = sentenceProbability(["data", "science"], NGRAM_TOKENS, nOrder, NGRAM_VOCAB, 1);

    const win = clampIndex(windowSize, 3);
    const { vocabulary: coVocabulary, matrix: coMatrix } = coOccurrenceMatrix(DOCS, Math.max(1, win));
    const { vocabulary: wordVocabulary, matrix: wordVectorMatrix } = wordVectors(DOCS, Math.max(1, win));
    const wa = clampIndex(wordAIndex, wordVocabulary.length - 1);
    const wb = clampIndex(wordBIndex, wordVocabulary.length - 1);
    const wordSimilarity = cosineSimilarity(wordVectorMatrix[wa] ?? [], wordVectorMatrix[wb] ?? []);

    const qIdx = clampIndex(queryPresetIndex, QUERY_PRESETS.length - 1);
    const queryPreset = QUERY_PRESETS[qIdx];
    const queryDoc = preprocessSentence(queryPreset, EN_STOP_WORDS).stemmed;
    const rankedDocs = rankDocumentsByQuery(queryDoc, DOCS);

    const finalStep = TOPIC_MODEL_STEPS[TOPIC_MODEL_STEPS.length - 1];
    const topicTopWords = topWordsPerTopic(TFIDF_VOCAB, TFIDF_MATRIX, finalStep.assignment, 2, 3);

    return {
      jaSentence,
      jaTokens,
      enSentence,
      preprocessTrace,
      vocabulary: TFIDF_VOCAB,
      selectedDocWords,
      ngramN: nOrder,
      ngramContextOptions: options,
      ngramContext,
      nextWordCandidates,
      sentenceProb,
      windowSize: win,
      coVocabulary,
      coMatrix,
      wordVocabulary,
      wordVectorMatrix,
      wordAIndex: wa,
      wordBIndex: wb,
      wordSimilarity,
      queryPreset,
      rankedDocs,
      topicSteps: TOPIC_MODEL_STEPS,
      topicTopWords,
    };
  },
});

// query 用のヘルパ（コンポーネント側で使う純粋な補助。副作用なし）
export function buildQueryVector(queryTokens: string[]): number[] {
  return queryVector(queryTokens, DOCS, TFIDF_VOCAB);
}

/** 分かち書きステッパーが位置ごとの候補集合を出すためのヘルパ（再エクスポート）。 */
export { candidatesAt };

/** MorphSegmentStepper（分かち書きのコマ送り）専用の空フレームストア。 */
export const useMorphFrameStore = createTopicStore<Record<string, never>, Record<string, never>>({
  initialControls: {},
  derive: () => ({}),
});

/** PreprocessStepper（トークン化→ストップワード除去→ステミングのコマ送り）専用の空フレームストア。 */
export const usePreprocessFrameStore = createTopicStore<Record<string, never>, Record<string, never>>({
  initialControls: {},
  derive: () => ({}),
});

/** TopicModelStepper（k=2クラスタリングの反復のコマ送り）専用の空フレームストア。 */
export const useTopicModelFrameStore = createTopicStore<Record<string, never>, Record<string, never>>({
  initialControls: {},
  derive: () => ({}),
});
