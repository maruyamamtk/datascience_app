# コンテンツ網羅バックログ — SPEC §3 全領域（A〜S）

目標: **仕様書 §3 のチェックリスト全項目をサイトに反映**する（CLAUDE.md §0-1 / SPEC §3「欠落ゼロ」）。
各行 = 1 Level制トピックページ。GitHub issue として全件起票済み（#27〜#108）。
**依存の浅い順（準1級 確率基礎 → 分布 → 推定 → 検定 → 回帰 …）に1本ずつフル実装**する。

実装パターン（既存トピック踏襲・tasks/lessons.md）:
計算層 `lib/stats/*.ts`（純関数＋Vitest）→ 状態層 `lib/store/*.ts`（createTopicStore）→
描画層 `components/topics/*/`（操作→グラフ→数式の強連動・アルゴリズム図鑑スタイル）→ MDX → 用語ノード。

## 実装済み（MVP, §7）
- ✅ B-5 中心極限定理 `central-limit-theorem`（#6）
- ✅ C-2 正規分布 `normal-distribution`（#20）
- ✅ D-5 信頼区間 `confidence-interval`（#21）
- ✅ E-1 仮説検定 `hypothesis-testing`（#22）
- ✅ F-1 単回帰 `simple-regression`（#23）
- ✅ B-1 事象と確率 `probability-basics`（#27, PR #109）
- ✅ B-3 分布の特性値 `distribution-characteristics`（#28）
- ✅ B-2 確率分布と母関数 `probability-distributions-mgf`（#29）
- ✅ B-4 変数変換と線形結合 `variable-transformation`（#30）
- ✅ C-1 離散型確率分布 `discrete-distributions`（#31）
- ✅ C-2 連続型確率分布 `continuous-distributions`（#32）
- ✅ B-5 大数の法則と正規近似 `law-of-large-numbers`（#33）
- ✅ C-3 標本分布（t・カイ二乗・F） `sampling-distributions`（#34）
- ✅ D-1 統計量と十分性 `statistics-sufficiency`（#35）
- ✅ D-2 推定法 `estimation-methods`（#36）
- ✅ D-3 点推定の性質 `point-estimation-properties`（#37）
- ✅ D-4 推定量の漸近的性質 `asymptotic-properties`（#38）
- ✅ E-2 検定法の導出 `test-derivation`（#39）
- ✅ E-3 正規分布に関する検定 `normal-tests`（#40）
- ✅ E-4 一般の分布に関する検定（適合度検定） `goodness-of-fit-tests`（#41）
- ✅ E-5 ノンパラメトリック法 `nonparametric-tests`（#42）
- ✅ F-2 重回帰分析 `multiple-regression`（#43）
- ✅ F-3 回帰診断 `regression-diagnostics`（#44）
- ✅ F-4 質的回帰（ロジスティック回帰） `qualitative-regression`（#45）
- ✅ F-5 一般化線形モデルと発展 `generalized-linear-models`（#46）
- ✅ G-1 分散分析・実験計画法 `analysis-of-variance`（#47）
- ✅ G-2 標本調査法 `sampling-survey`（#48）
- ✅ H-1 主成分分析 `principal-component-analysis`（#49）
- ✅ H-2 判別分析 `discriminant-analysis`（#50）
- ✅ H-3 クラスター分析 `cluster-analysis`（#51）
- ✅ H-4 共分散構造分析・因子分析 `covariance-structure-analysis`（#52）
- ✅ H-5 その他の多変量解析 `multivariate-other`（#53）
- ✅ H-6 カーネル密度推定 `kernel-density-estimation`（#54）
- ✅ L-1 マルコフ連鎖 `markov-chains`（#55）
- ✅ L-2 確率過程 `stochastic-processes`（#56）

## キュー（優先順）

| # | issue | §3 | トピック | slug | 前提 | 状態 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | #27 | B-1 | 事象と確率（条件付き確率・ベイズの定理） | probability-basics | （なし） | ✅ done |
| 2 | #28 | B-3 | 分布の特性値（期待値・分散・モーメント） | distribution-characteristics | probability-basics | ✅ done |
| 3 | #29 | B-2 | 確率分布と母関数 | probability-distributions-mgf | distribution-characteristics | ✅ done |
| 4 | #30 | B-4 | 変数変換と確率変数の線形結合 | variable-transformation | probability-distributions-mgf | ✅ done |
| 5 | #31 | C-1 | 離散型確率分布（二項・ポアソン他） | discrete-distributions | probability-distributions-mgf | ✅ done |
| 6 | #32 | C-2 | 連続型確率分布（指数・ガンマ・ベータ他） | continuous-distributions | discrete-distributions, normal-distribution | ✅ done |
| 7 | #33 | B-5 | 大数の法則と正規近似 | law-of-large-numbers | central-limit-theorem | ✅ done |
| 8 | #34 | C-3 | 標本分布（t・カイ二乗・F） | sampling-distributions | continuous-distributions | ✅ done |
| 9 | #35 | D-1 | 統計量と十分性 | statistics-sufficiency | sampling-distributions | ✅ done |
| 10 | #36 | D-2 | 推定法（最尤法・モーメント法・最小二乗法） | estimation-methods | statistics-sufficiency | ✅ done |
| 11 | #37 | D-3 | 点推定の性質 | point-estimation-properties | estimation-methods | ✅ done |
| 12 | #38 | D-4 | 推定量の漸近的性質 | asymptotic-properties | point-estimation-properties | ✅ done |
| 13 | #39 | E-2 | 検定法の導出（ネイマン・ピアソン） | test-derivation | hypothesis-testing, point-estimation-properties | ✅ done |
| 14 | #40 | E-3 | 正規分布に関する検定（t検定・2標本） | normal-tests | test-derivation, sampling-distributions | ✅ done |
| 15 | #41 | E-4 | 一般の分布に関する検定（適合度検定） | goodness-of-fit-tests | normal-tests | ✅ done |
| 16 | #42 | E-5 | ノンパラメトリック法 | nonparametric-tests | goodness-of-fit-tests | ✅ done |
| 17 | #43 | F-2 | 重回帰分析 | multiple-regression | simple-regression | ✅ done |
| 18 | #44 | F-3 | 回帰診断 | regression-diagnostics | multiple-regression | ✅ done |
| 19 | #45 | F-4 | 質的回帰（ロジスティック回帰） | qualitative-regression | multiple-regression | ✅ done |
| 20 | #46 | F-5 | 一般化線形モデルと発展 | generalized-linear-models | qualitative-regression | ✅ done |
| 21 | #47 | G-1 | 分散分析・実験計画法 | analysis-of-variance | normal-tests | ✅ done |
| 22 | #48 | G-2 | 標本調査法 | sampling-survey | estimation-methods | ✅ done |
| 23 | #49 | H-1 | 主成分分析 | principal-component-analysis | multiple-regression | ✅ done |
| 24 | #50 | H-2 | 判別分析 | discriminant-analysis | principal-component-analysis | ✅ done |
| 25 | #51 | H-3 | クラスター分析 | cluster-analysis | principal-component-analysis | ✅ done |
| 26 | #52 | H-4 | 共分散構造分析・因子分析 | covariance-structure-analysis | principal-component-analysis | ✅ done |
| 27 | #53 | H-5 | その他の多変量解析 | multivariate-other | principal-component-analysis | ✅ done |
| 28 | #54 | H-6 | カーネル密度推定 | kernel-density-estimation | continuous-distributions | ✅ done |
| 29 | #55 | L-1 | マルコフ連鎖 | markov-chains | probability-basics | ✅ done |
| 30 | #56 | L-2 | 確率過程 | stochastic-processes | markov-chains | ✅ done |
| 31 | #57 | L-3 | 計算多用手法（ブートストラップ・モンテカルロ） | monte-carlo-methods | markov-chains, estimation-methods | ✅ done |
| 32 | #58 | M-1 | 時系列解析の基礎 | time-series-basics | distribution-characteristics | ✅ done |
| 33 | #59 | M-2 | 時系列モデル（ARIMA・状態空間） | time-series-models | time-series-basics | ✅ done |
| 34 | #60 | M-3 | 時系列予測と評価 | time-series-forecasting | time-series-models | ✅ done |
| 35 | #61 | N-5 | 分割表の解析 | contingency-tables | goodness-of-fit-tests | ✅ done |
| 36 | #62 | N-1 | 因果推論の枠組み | causal-inference-models | multiple-regression | ✅ done |
| 37 | #63 | N-2 | 識別戦略（DID・IV・RDD） | causal-identification | causal-inference-models | ✅ done |
| 38 | #64 | N-3 | A/Bテスト実務 | ab-testing | causal-inference-models | ✅ done |
| 39 | #65 | N-4 | グラフィカルモデリング | graphical-models | contingency-tables | ✅ done |
| 40 | #66 | N-6 | 質的データ解析 | qualitative-data-analysis | contingency-tables | ✅ done |
| 41 | #67 | O-1 | 欠測値の処理 | missing-data | estimation-methods | ✅ done |
| 42 | #68 | O-2 | 生存時間解析 | survival-analysis | continuous-distributions | pending |
| 43 | #69 | A-1 | 線形代数 | linear-algebra | （なし） | pending |
| 44 | #70 | A-2 | 微分積分 | calculus | （なし） | pending |
| 45 | #71 | A-3 | 最適化 | optimization | calculus, linear-algebra | pending |
| 46 | #72 | A-4 | 数値計算 | numerical-computation | calculus | pending |
| 47 | #73 | A-5 | デジタル情報の基礎 | digital-information-basics | （なし） | pending |
| 48 | #74 | I-1 | 機械学習の枠組み | learning-framework | point-estimation-properties | pending |
| 49 | #75 | I-2 | 正則化・スパースモデリング | regularization-sparse | multiple-regression, learning-framework | pending |
| 50 | #76 | I-3 | 決定木・アンサンブル（LightGBM） | decision-trees-ensembles | learning-framework | pending |
| 51 | #77 | I-4 | 単純ベイズ・k近傍法 | naive-bayes-knn | probability-basics, learning-framework | pending |
| 52 | #78 | I-5 | 強化学習 | reinforcement-learning | markov-chains, learning-framework | pending |
| 53 | #79 | I-6 | 不均衡データ・異常検知 | imbalanced-anomaly | learning-framework | pending |
| 54 | #80 | J-1 | 評価指標とKPI設計 | metrics-and-kpi | learning-framework | pending |
| 55 | #81 | J-2 | 回帰の評価指標 | regression-metrics | simple-regression | pending |
| 56 | #82 | J-3 | 二値分類の評価指標 | binary-classification-metrics | qualitative-regression | pending |
| 57 | #83 | J-4 | 多クラス分類の評価指標 | multiclass-metrics | binary-classification-metrics | pending |
| 58 | #84 | J-5 | モデル選択基準（AIC・BIC） | model-selection-criteria | estimation-methods, learning-framework | pending |
| 59 | #85 | K-1 | ベイズ統計の基礎 | bayesian-basics | probability-basics, distribution-characteristics | pending |
| 60 | #86 | K-2 | ベイズ計算法（MCMC） | mcmc-methods | bayesian-basics, monte-carlo-methods | pending |
| 61 | #87 | K-3 | 階層ベイズモデル | hierarchical-bayes | mcmc-methods | pending |
| 62 | #88 | K-4 | ベイズ応用（A/Bテスト・IRT） | bayesian-applications | bayesian-basics | pending |
| 63 | #89 | P-1 | 決定分析 | decision-analysis | probability-basics | pending |
| 64 | #90 | P-2 | 情報理論 | information-theory | probability-basics | pending |
| 65 | #91 | P-3 | 情報の価値 | value-of-information | decision-analysis, bayesian-basics | pending |
| 66 | #92 | P-4 | 効用理論 | utility-theory | decision-analysis | pending |
| 67 | #93 | P-5 | 確率予測の評価 | probabilistic-forecasting | binary-classification-metrics | pending |
| 68 | #94 | P-6 | 逐次決定 | sequential-decision | markov-chains, decision-analysis | pending |
| 69 | #95 | Q-1 | ニューラルネットワークの仕組み | neural-network-basics | optimization, learning-framework | pending |
| 70 | #96 | Q-2 | NNモデル（CNN・RNN） | neural-network-models | neural-network-basics | pending |
| 71 | #97 | Q-3 | テキスト解析 | text-analysis | neural-network-basics | pending |
| 72 | #98 | Q-4 | 画像解析 | image-analysis | neural-network-models | pending |
| 73 | #99 | Q-5 | 生成AI | generative-ai | neural-network-models | pending |
| 74 | #100 | R-1 | アルゴリズム | algorithms | （なし） | pending |
| 75 | #101 | R-2 | データ構造 | data-structures | algorithms | pending |
| 76 | #102 | R-3 | 暗号・圧縮 | cryptography-compression | algorithms | pending |
| 77 | #103 | R-4 | データ基盤 | data-infrastructure | （なし） | pending |
| 78 | #104 | S-1 | データサイエンスのサイクル | data-science-cycle | （なし） | pending |
| 79 | #105 | S-2 | データリテラシー | data-literacy | distribution-characteristics | pending |
| 80 | #106 | S-3 | 倫理・法・セキュリティ | ethics-law-security | （なし） | pending |
| 81 | #107 | S-4 | 実務エンジニアリング | practical-engineering | （なし） | pending |
| 82 | #108 | S-5 | オープンデータ | open-data | （なし） | pending |

## 凡例 / 運用
- 状態: pending → in-progress → done（PR マージ時に done、issue クローズ）。
- 1〜16 = 準1級 確率〜検定コア（最優先・必達）。17〜42 = 準1級 回帰〜欠測。43〜47 = 数学土台A。
  48〜82 = ML(I)/評価(J)/ベイズ(K)/意思決定(P)/DL(Q)/アルゴリズム(R)/リテラシー(S)（後続フェーズ）。
- 重い計算（MCMC・LightGBM 学習・DL 学習）は MVP では JS で軽量な可視化に留め、本格実行は将来 Pyodide/サーバ（SPEC §4.4・CLAUDE.md §3）。
