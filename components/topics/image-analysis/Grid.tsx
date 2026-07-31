/**
 * 2次元配列を色付きセルのグリッドとして表示する、画像解析（Q-4）共通の描画部品（アルゴリズム図鑑スタイル）。
 * 元画像・フィルタ出力・二値化結果のいずれも同じ見た目で描画し、FilterLab（実時間操作）と
 * EdgeDetectionStepper（コマ送り）の両方から再利用する。
 * [NNモデル（CNN・RNN）]のGridコンポーネントと同型だが、トピック間の直接依存は避ける方針
 * （issue #98）のため本ファイルに独立実装する（コードの重複は許容）。
 */

export type GridCell = { row: number; col: number };

type GridProps = {
  values: readonly (readonly number[])[];
  /** ハイライトするセル（背景色を変える）。 */
  highlighted?: readonly GridCell[];
  /** ハイライト色。 */
  accent?: string;
  /** 数値のフォーマット（既定は小数1桁、整数はそのまま）。 */
  format?: (v: number) => string;
  cellSize?: number;
  label?: string;
};

const cellKey = (r: number, c: number) => `${r}-${c}`;

const defaultFormat = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

export function Grid({ values, highlighted = [], accent = "#2563eb", format = defaultFormat, cellSize = 36, label }: GridProps) {
  const activeSet = new Set(highlighted.map((h) => cellKey(h.row, h.col)));
  const cols = values[0]?.length ?? 0;

  return (
    <div className="inline-flex flex-col items-center gap-1">
      {label ? <span className="text-[10px] font-semibold text-slate-500">{label}</span> : null}
      <div className="inline-grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, ${cellSize}px)` }}>
        {values.map((row, r) =>
          row.map((v, c) => {
            const active = activeSet.has(cellKey(r, c));
            return (
              <div
                key={cellKey(r, c)}
                data-testid={`ia-grid-cell-${label ?? "g"}-${r}-${c}`}
                className={`flex items-center justify-center rounded-md border font-mono text-[10px] transition-colors ${
                  active ? "border-transparent font-semibold text-white shadow" : "border-slate-200 bg-white text-slate-600"
                }`}
                style={{ width: cellSize, height: cellSize, backgroundColor: active ? accent : undefined }}
              >
                {format(v)}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
