// Vitest 共通セットアップ。
// jest-dom のカスタムマッチャ（toBeInTheDocument / toBeDisabled など）を expect に登録する。
// 登録はマッチャ追加のみで DOM には触れないため node 環境のテストでも安全（実際の DOM 参照は
// jsdom 環境のテストでマッチャを呼んだときだけ発生する）。
//
// DOM レンダリングを伴うコンポーネントテストは、ファイル先頭に
//   // @vitest-environment jsdom
// を付けて jsdom に切り替える（計算層 lib/** は高速な node 環境のまま）。
import "@testing-library/jest-dom/vitest";
