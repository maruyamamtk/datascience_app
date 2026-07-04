"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { DART_STEPS, useMonteCarloStore } from "@/lib/store/monte-carlo-methods";

// π ≈ 4·(円内 k)/(総数 n)。各項に id を付け、操作で数値を差し込み＋ハイライト。
const FORMULA = `\\hat\\pi=4\\cdot\\frac{${term("inside", "k")}}{${term("n", "n")}}=${term("pihat", "?")}`;

/** SVG のダーツ盤サイズ。 */
const S = 220;
const R = S / 2;

export function MonteCarloLab() {
  const levelIndex = useMonteCarloStore((s) => s.controls.levelIndex);
  const { darts, n, inside, piHat, error } = useMonteCarloStore((s) => s.derived);
  const setControl = useMonteCarloStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("inside", String(inside));
    m.setValue("n", String(n));
    m.setValue("pihat", formatNumber(piHat, 4));
    m.setHighlight("pihat", true, "#2563eb");
    m.setHighlight("inside", true, "#16a34a");
  }, [inside, n, piHat]);

  // 描画は最大1500点に間引く（多量のダーツで重くならないように）。
  const stride = Math.max(1, Math.floor(darts.length / 1500));
  const shown = darts.filter((_, i) => i % stride === 0);

  return (
    <div
      id="montecarlo-operation"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <div className="space-y-1">
        <label htmlFor="mc-n" className="text-sm font-semibold text-slate-700">
          投げるダーツ数 n = {n.toLocaleString()}（多いほど推定が安定）
        </label>
        <input
          id="mc-n"
          type="range"
          min={0}
          max={DART_STEPS.length - 1}
          step={1}
          value={levelIndex}
          onChange={(e) => setControl("levelIndex", Number(e.target.value))}
          className="w-full accent-blue-600"
          aria-label="ダーツ数"
        />
        <div className="flex justify-between px-1 text-[9px] text-slate-400">
          {DART_STEPS.map((d) => (
            <span key={d}>{d.toLocaleString()}</span>
          ))}
        </div>
      </div>

      {/* ダーツ盤 */}
      <svg
        viewBox={`0 0 ${S} ${S}`}
        className="mx-auto h-auto w-1/2 min-w-[180px]"
        role="img"
        aria-label="モンテカルロπのダーツ盤"
        data-testid="dart-board"
      >
        <rect x={0} y={0} width={S} height={S} fill="#f8fafc" stroke="#cbd5e1" rx={4} />
        <circle cx={R} cy={R} r={R} fill="#dbeafe" opacity={0.5} />
        {shown.map((d, i) => (
          <circle
            key={i}
            cx={R + d.x * R}
            cy={R - d.y * R}
            r={1.3}
            fill={d.inside ? "#16a34a" : "#f43f5e"}
            opacity={0.7}
          />
        ))}
      </svg>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-green-50 px-2 py-2">
          <div className="font-mono text-base text-green-700">{inside.toLocaleString()}</div>
          <div className="text-slate-500">円内 k</div>
        </div>
        <div className="rounded-lg bg-blue-50 px-2 py-2">
          <div className="font-mono text-base text-blue-700">{formatNumber(piHat, 4)}</div>
          <div className="text-slate-500">π 推定</div>
        </div>
        <div className="rounded-lg bg-slate-100 px-2 py-2">
          <div className="font-mono text-base text-slate-700">{formatNumber(error, 4)}</div>
          <div className="text-slate-500">|誤差|</div>
        </div>
      </div>

      <Callout
        title="モンテカルロ法：乱数で «面積» を数える"
        body={`正方形 [-1,1]² に n=${n.toLocaleString()} 個の点を一様に投げ、単位円の中に落ちた割合 k/n を数える。円と正方形の面積比は π/4 なので、π ≈ 4·k/n = ${formatNumber(
          piHat,
          4,
        )}。`}
        note={`n を増やすと誤差 |誤差|=${formatNumber(
          error,
          4,
        )} は «1/√n の速さで» 縮む。4倍のダーツで誤差はおよそ半分。解析的に解けない量も «たくさん試して数える» だけで近似できる。`}
        kind="explain"
      />
    </div>
  );
}
