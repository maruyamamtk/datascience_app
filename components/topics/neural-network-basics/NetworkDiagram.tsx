/**
 * 小さなネットワーク（入力2→隠れ2→出力1）の図（描画層・純粋な表示コンポーネント）。
 * ForwardLab（常時ハイライトなし・値を表示するだけ）と BackpropStepper（フレームごとに
 * ノード/エッジをハイライト）の両方から再利用する（アルゴリズム図鑑スタイル: 色ハイライト＋近傍）。
 */

export type DiagramValues = {
  x0: number;
  x1: number;
  z1: [number, number];
  a1: [number, number];
  yhat: number;
  loss?: number;
};

type NetworkDiagramProps = {
  values: DiagramValues;
  /** ハイライトするノード id（"x0","x1","h0","h1","out","loss"）。 */
  activeNodes?: readonly string[];
  /** ハイライトするエッジ id（"e-x0-h0" 等）。 */
  activeEdges?: readonly string[];
  /** ハイライト色（順伝播=青系、逆伝播=橙系など呼び出し側で指定）。 */
  accent?: string;
};

const W = 380;
const H = 220;
const POS = {
  x0: { x: 34, y: 56 },
  x1: { x: 34, y: 164 },
  h0: { x: 168, y: 38 },
  h1: { x: 168, y: 182 },
  out: { x: 280, y: 110 },
  loss: { x: 346, y: 110 },
} as const;

const EDGES: Array<{ id: string; from: keyof typeof POS; to: keyof typeof POS }> = [
  { id: "e-x0-h0", from: "x0", to: "h0" },
  { id: "e-x1-h0", from: "x1", to: "h0" },
  { id: "e-x0-h1", from: "x0", to: "h1" },
  { id: "e-x1-h1", from: "x1", to: "h1" },
  { id: "e-h0-out", from: "h0", to: "out" },
  { id: "e-h1-out", from: "h1", to: "out" },
  { id: "e-out-loss", from: "out", to: "loss" },
];

const fmt = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : "—");

export function NetworkDiagram({ values, activeNodes = [], activeEdges = [], accent = "#2563eb" }: NetworkDiagramProps) {
  const isNodeActive = (id: string) => activeNodes.includes(id);
  const isEdgeActive = (id: string) => activeEdges.includes(id);

  const nodeLabel: Record<string, string> = {
    x0: `x₀=${fmt(values.x0)}`,
    x1: `x₁=${fmt(values.x1)}`,
    h0: `a₁⁽⁰⁾=${fmt(values.a1[0])}`,
    h1: `a₁⁽¹⁾=${fmt(values.a1[1])}`,
    out: `ŷ=${fmt(values.yhat)}`,
    loss: values.loss !== undefined ? `L=${fmt(values.loss)}` : "L",
  };

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-md" role="img" aria-label="ネットワーク図">
        {EDGES.map((e) => {
          const p1 = POS[e.from];
          const p2 = POS[e.to];
          const active = isEdgeActive(e.id);
          return (
            <line
              key={e.id}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke={active ? accent : "#cbd5e1"}
              strokeWidth={active ? 3 : 1.5}
            />
          );
        })}
        {(Object.keys(POS) as Array<keyof typeof POS>).map((id) => {
          const p = POS[id];
          const active = isNodeActive(id);
          const isInput = id === "x0" || id === "x1";
          const isOutput = id === "out";
          const isLoss = id === "loss";
          const fill = active ? accent : isInput ? "#94a3b8" : isOutput ? "#16a34a" : isLoss ? "#f59e0b" : "#7c3aed";
          return (
            <g key={id}>
              <circle cx={p.x} cy={p.y} r={active ? 20 : 17} fill={fill} opacity={active ? 1 : 0.85} />
              <text x={p.x} y={p.y + 32} textAnchor="middle" className="fill-slate-700 text-[10px] font-mono">
                {nodeLabel[id]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
