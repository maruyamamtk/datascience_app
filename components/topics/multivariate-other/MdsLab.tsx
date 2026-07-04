"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { TRUE_CITIES, useMdsStore } from "@/lib/store/multivariate-other";

// ストレス。stress の項に id を付け、操作で差し込み＋ハイライト。
const FORMULA = `\\text{ストレス}=\\sqrt{\\dfrac{\\sum(d_{ij}-\\hat d_{ij})^2}{\\sum d_{ij}^2}}=${term("stress", "?")}`;

/** 距離 0..maxD を色に。 */
function heatColor(v: number, maxD: number): string {
  const t = Math.max(0, Math.min(1, v / maxD));
  return `hsl(${28 + t * 0} 85% ${94 - t * 54}%)`;
}

export function MdsLab() {
  const distortion = useMdsStore((s) => s.controls.distortion);
  const { distances, coords, stress } = useMdsStore((s) => s.derived);
  const setControl = useMdsStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("stress", formatNumber(stress, 3));
    m.setHighlight("stress", true, stress < 0.05 ? "#16a34a" : "#dc2626");
  }, [stress]);

  const n = TRUE_CITIES.length;
  const maxD = Math.max(...distances.flat(), 1);

  // 復元座標を中心化して表示レンジに収める。
  const cx = coords.reduce((a, c) => a + c[0], 0) / n;
  const cy = coords.reduce((a, c) => a + c[1], 0) / n;
  const span = Math.max(
    ...coords.map((c) => Math.max(Math.abs(c[0] - cx), Math.abs(c[1] - cy))),
    1,
  );
  const mapS = 60 / span;
  const toX = (x: number) => 90 + (x - cx) * mapS;
  const toY = (y: number) => 90 - (y - cy) * mapS;

  // 距離行列ヒートマップ。
  const cell = 22;
  const gridW = cell * n + 30;

  return (
    <div id="mds-operation" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="space-y-1">
        <label htmlFor="mds-dist" className="text-sm font-semibold text-slate-700">
          距離の歪み distortion = {formatNumber(distortion)}（0で正確、大きいほど地図が崩れる）
        </label>
        <input
          id="mds-dist"
          type="range"
          min={0}
          max={2}
          step={0.05}
          value={distortion}
          onChange={(e) => setControl("distortion", Number(e.target.value))}
          className="w-full accent-orange-600"
          aria-label="距離の歪み"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* 距離行列 */}
        <div className="space-y-1">
          <p className="text-center text-[10px] font-semibold text-slate-600">与えられた距離行列</p>
          <svg
            viewBox={`0 0 ${gridW} ${gridW}`}
            className="h-auto w-full"
            role="img"
            aria-label="距離行列"
            data-testid="distance-matrix"
          >
            {distances.map((row, i) =>
              row.map((v, j) => (
                <rect
                  key={`${i}-${j}`}
                  x={30 + j * cell}
                  y={30 + i * cell}
                  width={cell - 1}
                  height={cell - 1}
                  fill={heatColor(v, maxD)}
                  rx={2}
                />
              )),
            )}
            {TRUE_CITIES.map((c, i) => (
              <g key={c.name}>
                <text
                  x={26}
                  y={30 + i * cell + cell / 2 + 3}
                  textAnchor="end"
                  className="fill-slate-500 text-[8px]"
                >
                  {c.name}
                </text>
                <text
                  x={30 + i * cell + cell / 2}
                  y={26}
                  textAnchor="middle"
                  className="fill-slate-500 text-[8px]"
                >
                  {c.name}
                </text>
              </g>
            ))}
          </svg>
        </div>
        {/* MDS 復元地図 */}
        <div className="space-y-1">
          <p className="text-center text-[10px] font-semibold text-slate-600">
            MDS 復元地図（距離から）
          </p>
          <svg
            viewBox="0 0 180 180"
            className="h-auto w-full"
            role="img"
            aria-label="MDS復元地図"
            data-testid="mds-map"
          >
            {coords.map((c, i) => (
              <g key={i}>
                <circle cx={toX(c[0])} cy={toY(c[1])} r={4} fill="#ea580c" opacity={0.75} />
                <text
                  x={toX(c[0]) + 6}
                  y={toY(c[1]) + 3}
                  className="fill-slate-600 text-[9px] font-semibold"
                >
                  {TRUE_CITIES[i].name}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>
      <p className="text-center font-mono text-sm">
        ストレス = {formatNumber(stress, 3)}{" "}
        <span className={stress < 0.05 ? "text-green-700" : "text-red-600"}>
          → {stress < 0.05 ? "距離をよく再現" : "歪みあり"}
        </span>
      </p>

      <Callout
        title="多次元尺度構成法（MDS）：距離だけから地図を復元する"
        body={`点どうしの距離（非類似度）の表から、それを最もよく再現する低次元の配置を求める。歪み distortion=${formatNumber(
          distortion,
        )} を加えると復元がぼやけ、ストレス=${formatNumber(stress, 3)}（元の距離とのずれ）が上がる。`}
        note="座標が未知でも «近さ» さえあれば地図が描ける。数量化Ⅳ類・対応分析も «非類似度から布置» する仲間。回転・鏡映は自由（距離は保たれる）。"
        kind="explain"
      />
    </div>
  );
}
