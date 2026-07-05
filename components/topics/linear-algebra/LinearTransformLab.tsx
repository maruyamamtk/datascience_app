"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { useLinearAlgebraStore } from "@/lib/store/linear-algebra";
import { type Vec2 } from "@/lib/stats/linear-algebra";

// det（面積拡大率）・trace・固有値を実時間で差し込み＋ハイライト。
const FORMULA = `A=\\begin{pmatrix}${term("a", "a")}&${term("b", "b")}\\\\${term("c", "c")}&${term("d", "d")}\\end{pmatrix},\\ \\det A=${term("det", "?")},\\ \\mathrm{tr}\\,A=${term("tr", "?")},\\ \\lambda=${term("l1", "?")},\\,${term("l2", "?")}`;

const SIZE = 300;
const CENTER = SIZE / 2;
const UNIT = 42; // 1単位あたりのピクセル。±3強を表示。
const round2 = (v: number) => Math.round(v * 100) / 100;
// データ座標 → SVG（y は下向きなので反転）。
const sx = (x: number) => round2(CENTER + x * UNIT);
const sy = (y: number) => round2(CENTER - y * UNIT);

function polyPoints(pts: readonly Vec2[]): string {
  return pts.map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ");
}

export function LinearTransformLab() {
  const controls = useLinearAlgebraStore((s) => s.controls);
  const { ellipse, columns, det, trace, eigen, rank } = useLinearAlgebraStore((s) => s.derived);
  const setControl = useLinearAlgebraStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("a", formatNumber(controls.a, 1));
    m.setValue("b", formatNumber(controls.b, 1));
    m.setValue("c", formatNumber(controls.c, 1));
    m.setValue("d", formatNumber(controls.d, 1));
    m.setValue("det", formatNumber(det, 2));
    m.setValue("tr", formatNumber(trace, 2));
    m.setValue("l1", eigen.real ? formatNumber(eigen.values[0], 2) : "\\text{複素}");
    m.setValue("l2", eigen.real ? formatNumber(eigen.values[1], 2) : "\\text{複素}");
    m.setHighlight("det", true, det < 0 ? "#dc2626" : "#7c3aed");
    m.setHighlight("tr", true, "#0891b2");
    m.setHighlight("l1", eigen.real, "#16a34a");
    m.setHighlight("l2", eigen.real, "#16a34a");
  }, [controls, det, trace, eigen]);

  const [e1, e2] = columns;
  // 固有ベクトルは両向きに直線として描く（長さ3単位）。
  const eigenLine = (v: Vec2) => ({ x1: sx(-3 * v.x), y1: sy(-3 * v.y), x2: sx(3 * v.x), y2: sy(3 * v.y) });

  return (
    <div id="linalg-operation" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        2×2 行列 <span className="font-mono">A</span> を «平面を動かす操作» として見る。4つの成分を動かすと、単位円（灰）が変換後の楕円（青）へ移り、基底ベクトルの行き先・固有ベクトル方向（緑）・行列式（面積）が同時に追従する。
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Slider id="la-a" label={`a = ${formatNumber(controls.a, 1)}`} value={controls.a} onChange={(v) => setControl("a", v)} accent="accent-blue-600" />
        <Slider id="la-b" label={`b = ${formatNumber(controls.b, 1)}`} value={controls.b} onChange={(v) => setControl("b", v)} accent="accent-blue-600" />
        <Slider id="la-c" label={`c = ${formatNumber(controls.c, 1)}`} value={controls.c} onChange={(v) => setControl("c", v)} accent="accent-rose-600" />
        <Slider id="la-d" label={`d = ${formatNumber(controls.d, 1)}`} value={controls.d} onChange={(v) => setControl("d", v)} accent="accent-rose-600" />
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto w-full max-w-xs" role="img" aria-label="線形変換：単位円から楕円へ">
          {/* グリッド */}
          {[-3, -2, -1, 1, 2, 3].map((g) => (
            <g key={g}>
              <line x1={sx(g)} y1={0} x2={sx(g)} y2={SIZE} className="stroke-slate-100" />
              <line x1={0} y1={sy(g)} x2={SIZE} y2={sy(g)} className="stroke-slate-100" />
            </g>
          ))}
          {/* 座標軸 */}
          <line x1={0} y1={CENTER} x2={SIZE} y2={CENTER} className="stroke-slate-300" />
          <line x1={CENTER} y1={0} x2={CENTER} y2={SIZE} className="stroke-slate-300" />
          {/* 単位円（変換前） */}
          <circle cx={CENTER} cy={CENTER} r={UNIT} fill="none" className="stroke-slate-300" strokeDasharray="3 3" />
          {/* 変換後の楕円 */}
          <polygon points={polyPoints(ellipse)} className="fill-blue-500/10 stroke-blue-500" strokeWidth={1.5} />
          {/* 固有ベクトル方向（実固有値のとき） */}
          {eigen.real
            ? eigen.vectors.map((v, i) => {
                const l = eigenLine(v);
                return <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} className="stroke-green-500/60" strokeWidth={1.5} strokeDasharray="5 3" />;
              })
            : null}
          {/* 基底ベクトルの行き先 */}
          <Arrow to={e1} color="#2563eb" label="e₁→" />
          <Arrow to={e2} color="#e11d48" label="e₂→" />
        </svg>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <Stat value={formatNumber(det, 2)} label="行列式（面積拡大率）" tone={det < 0 ? "red" : "violet"} />
        <Stat value={formatNumber(trace, 2)} label="トレース（固有値の和）" tone="cyan" />
        <Stat value={`${rank}`} label={rank < 2 ? "階数（つぶれる）" : "階数（正則）"} tone={rank < 2 ? "red" : "slate"} />
      </div>

      <Callout
        title="行列＝ベクトルを動かす操作。行列式はその «面積拡大率»"
        body={`いまの行列は単位円を面積 ${formatNumber(Math.abs(det), 2)} 倍の楕円へ移す。${det < 0 ? "det<0 なので «裏返し»（鏡像）が起きている。" : det === 0 ? "det=0 なので平面が線につぶれ、情報が失われる（逆行列なし）。" : "det>0 で向き（時計回り/反時計回り）は保たれる。"} 固有値は ${eigen.real ? `${formatNumber(eigen.values[0], 2)} と ${formatNumber(eigen.values[1], 2)}` : "複素（純粋な回転成分あり・実固有方向なし）"}。`}
        note={`緑の破線が固有ベクトル方向——この向きのベクトルだけは変換で «向きが変わらず» 固有値倍に伸縮する。a,d を大きくすると軸方向に伸び、b,c を入れるとせん断（傾き）。det=0（例 a·d=b·c）にすると楕円がつぶれて階数が1に落ちる。`}
        kind="explain"
      />
    </div>
  );
}

function Arrow({ to, color, label }: { to: Vec2; color: string; label: string }) {
  const tipX = sx(to.x);
  const tipY = sy(to.y);
  // 矢じり（先端の小三角）。
  const ang = Math.atan2(sy(to.y) - CENTER, sx(to.x) - CENTER);
  const size = 6;
  const p1x = round2(tipX - size * Math.cos(ang - 0.4));
  const p1y = round2(tipY - size * Math.sin(ang - 0.4));
  const p2x = round2(tipX - size * Math.cos(ang + 0.4));
  const p2y = round2(tipY - size * Math.sin(ang + 0.4));
  return (
    <g>
      <line x1={CENTER} y1={CENTER} x2={tipX} y2={tipY} stroke={color} strokeWidth={2} />
      <polygon points={`${tipX},${tipY} ${p1x},${p1y} ${p2x},${p2y}`} fill={color} />
      <text x={round2(tipX + 6)} y={round2(tipY - 4)} fill={color} className="text-[10px] font-semibold">{label}</text>
    </g>
  );
}

function Slider({ id, label, value, onChange, accent }: { id: string; label: string; value: number; onChange: (v: number) => void; accent: string }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="font-mono text-xs font-semibold text-slate-700">{label}</label>
      <input id={id} type="range" min={-2} max={2} step={0.1} value={value} onChange={(e) => onChange(Number(e.target.value))} className={`w-full ${accent}`} />
    </div>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone: "violet" | "red" | "cyan" | "slate" }) {
  const bg = {
    violet: "bg-violet-50 text-violet-700",
    red: "bg-red-50 text-red-700",
    cyan: "bg-cyan-50 text-cyan-700",
    slate: "bg-slate-100 text-slate-700",
  }[tone];
  return (
    <div className={`rounded-lg px-2 py-2 ${bg}`}>
      <div className="font-mono text-base">{value}</div>
      <div className="text-slate-500">{label}</div>
    </div>
  );
}
