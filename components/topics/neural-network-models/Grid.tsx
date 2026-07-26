/**
 * 2次元配列を色付きセルのグリッドとして表示する、CNN セクション共通の描画部品（アルゴリズム図鑑スタイル）。
 * 入力画像・畳み込み出力（特徴マップ）・プーリング出力のいずれも同じ見た目で描画し、
 * ConvPoolStepper（コマ送り）と ConvLab（実時間操作）の両方から再利用する。
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

const defaultFormat = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2));

export function Grid({ values, highlighted = [], accent = "#2563eb", format = defaultFormat, cellSize = 40, label }: GridProps) {
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
                data-testid={`grid-cell-${label ?? "g"}-${r}-${c}`}
                className={`flex items-center justify-center rounded-md border font-mono text-[11px] transition-colors ${
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
