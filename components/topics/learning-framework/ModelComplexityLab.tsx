"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import {
  DEG_MAX,
  DEG_MIN,
  NTRAIN_MAX,
  NTRAIN_MIN,
  useLearningFrameworkStore,
} from "@/lib/store/learning-framework";

// 経験誤差（訓練）・汎化誤差（テスト）・次数 d を実時間で差し込み＋ハイライト。
const FORMULA = `\\underbrace{\\hat R(\\hat f)}_{\\text{経験誤差}}=${term("etrain", "?")}\\quad \\underbrace{R(\\hat f)}_{\\text{汎化誤差}}=${term("etest", "?")}\\quad d=${term("deg", "?")}`;

const round2 = (v: number) => Math.round(v * 100) / 100;

// フィット曲線パネル（左）。
const W = 300;
const H = 220;
const PADL = 28;
const PADR = 10;
const PADT = 12;
const PADB = 24;
const Y_LO = -1.7;
const Y_HI = 1.7;
const fx = (x: number) => round2(PADL + x * (W - PADL - PADR));
const fy = (v: number) => {
  const c = Math.max(Y_LO, Math.min(Y_HI, v)); // 大暴れするフィットを枠内にクリップ
  return round2(PADT + ((Y_HI - c) / (Y_HI - Y_LO)) * (H - PADT - PADB));
};

// 誤差 U 字曲線パネル（右）。
const ERR_YMAX = 1.0;
const ex = (d: number) => round2(PADL + ((d - DEG_MIN) / (DEG_MAX - DEG_MIN)) * (W - PADL - PADR));
const ey = (r: number) => {
  const c = Math.min(ERR_YMAX, r);
  return round2(PADT + (1 - c / ERR_YMAX) * (H - PADT - PADB));
};

const REGIME_LABEL = {
  underfit: { text: "適合不足（高バイアス）", tone: "amber" as const },
  good: { text: "ちょうどよい複雑さ", tone: "emerald" as const },
  overfit: { text: "過学習（高分散）", tone: "red" as const },
};

export function ModelComplexityLab() {
  const d = useLearningFrameworkStore((s) => s.derived);
  const setControl = useLearningFrameworkStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("etrain", formatNumber(d.trainRmse, 3));
    m.setValue("etest", formatNumber(d.testRmse, 3));
    m.setValue("deg", String(d.effDegree));
    m.setHighlight("etrain", true, "#059669");
    m.setHighlight("etest", true, "#e11d48");
    m.setHighlight("deg", true, "#2563eb");
  }, [d.trainRmse, d.testRmse, d.effDegree]);

  const fitPts = d.fitCurve.map((p) => `${fx(p.x)},${fy(p.y)}`).join(" ");
  const truePts = d.trueCurve.map((p) => `${fx(p.x)},${fy(p.y)}`).join(" ");
  const trainErrPts = d.errorCurve.map((e) => `${ex(e.degree)},${ey(e.trainRmse)}`).join(" ");
  const testErrPts = d.errorCurve.map((e) => `${ex(e.degree)},${ey(e.testRmse)}`).join(" ");

  const regime = REGIME_LABEL[d.regime];
  const capped = d.effDegree < d.degree;

  return (
    <div id="complexity-lab" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        黒い破線が «真の関数»（未知）、点が «ノイズ入りの訓練データ»。次数{" "}
        <span className="font-mono">d</span> の多項式（青）をこの点に最小二乗でフィットする。
        <span className="font-mono">d</span> を上げると訓練点にはよく合う（経験誤差 ↓）が、点の間で暴れて
        «別データ»（テスト）では外す（汎化誤差 ↑）。データ点数 <span className="font-mono">n</span> も動かせる。
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="lf-deg" className="font-mono text-xs font-semibold text-slate-700">
            d = {d.degree}（モデルの複雑さ＝多項式の次数）
          </label>
          <input
            id="lf-deg"
            type="range"
            min={DEG_MIN}
            max={DEG_MAX}
            step={1}
            value={d.degree}
            onChange={(e) => setControl("degree", Number(e.target.value))}
            className="w-full accent-blue-600"
          />
          <div className="font-mono text-[10px] text-slate-400">
            {capped ? `点数 ${d.nTrain} なので実効次数は ${d.effDegree}（n−1 で頭打ち）` : `実効次数 ${d.effDegree}`}
          </div>
        </div>
        <div className="space-y-1">
          <label htmlFor="lf-n" className="font-mono text-xs font-semibold text-slate-700">
            n = {d.nTrain}（訓練データの点数）
          </label>
          <input
            id="lf-n"
            type="range"
            min={NTRAIN_MIN}
            max={NTRAIN_MAX}
            step={1}
            value={d.nTrain}
            onChange={(e) => setControl("nTrain", Number(e.target.value))}
            className="w-full accent-slate-500"
          />
          <div className="font-mono text-[10px] text-slate-400">データが増えると過学習しにくい</div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {/* 左: データとフィット */}
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="訓練データと多項式フィット">
            {[-1, 0, 1].map((v) => (
              <g key={`g${v}`}>
                <line x1={PADL} y1={fy(v)} x2={W - PADR} y2={fy(v)} className="stroke-slate-100" />
                <text x={PADL - 4} y={fy(v) + 3} textAnchor="end" className="fill-slate-400 text-[8px]">
                  {v}
                </text>
              </g>
            ))}
            {/* 真の関数（未知） */}
            <polyline points={truePts} fill="none" className="stroke-slate-800" strokeWidth={1.4} strokeDasharray="4 3" opacity={0.6} />
            {/* フィット多項式 */}
            <polyline points={fitPts} fill="none" className="stroke-blue-600" strokeWidth={2} />
            {/* 訓練点 */}
            {d.trainPoints.map((p, i) => (
              <circle key={`p${i}`} cx={fx(p.x)} cy={fy(p.y)} r={3} className="fill-amber-500" stroke="#fff" strokeWidth={0.8} />
            ))}
            <text x={(PADL + W - PADR) / 2} y={H - 2} textAnchor="middle" className="fill-slate-500 text-[9px]">
              破線=真の関数, 点=訓練データ, 青=フィット
            </text>
          </svg>
        </div>

        {/* 右: 誤差の U 字曲線 */}
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="次数に対する経験誤差と汎化誤差">
            {[0, 0.5, 1].map((v) => (
              <g key={`eg${v}`}>
                <line x1={PADL} y1={ey(v)} x2={W - PADR} y2={ey(v)} className="stroke-slate-100" />
                <text x={PADL - 4} y={ey(v) + 3} textAnchor="end" className="fill-slate-400 text-[8px]">
                  {v}
                </text>
              </g>
            ))}
            {/* 最適次数の縦線 */}
            <line x1={ex(d.bestDegree)} y1={PADT} x2={ex(d.bestDegree)} y2={H - PADB} className="stroke-emerald-300" strokeDasharray="3 3" />
            {/* 現在の次数の縦線 */}
            <line x1={ex(d.effDegree)} y1={PADT} x2={ex(d.effDegree)} y2={H - PADB} className="stroke-blue-400" strokeWidth={1.4} />
            {/* 汎化誤差（テスト） */}
            <polyline points={testErrPts} fill="none" className="stroke-rose-500" strokeWidth={1.8} />
            {d.errorCurve.map((e) => (
              <circle key={`te${e.degree}`} cx={ex(e.degree)} cy={ey(e.testRmse)} r={2} className="fill-rose-500" />
            ))}
            {/* 経験誤差（訓練） */}
            <polyline points={trainErrPts} fill="none" className="stroke-emerald-500" strokeWidth={1.8} />
            {d.errorCurve.map((e) => (
              <circle key={`tr${e.degree}`} cx={ex(e.degree)} cy={ey(e.trainRmse)} r={2} className="fill-emerald-500" />
            ))}
            <text x={(PADL + W - PADR) / 2} y={H - 2} textAnchor="middle" className="fill-slate-500 text-[9px]">
              次数 d →　緑=経験誤差, 赤=汎化誤差
            </text>
          </svg>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <Stat value={formatNumber(d.trainRmse, 3)} label="経験誤差（訓練）" tone="emerald" />
        <Stat value={formatNumber(d.testRmse, 3)} label="汎化誤差（テスト）" tone="red" />
        <Stat value={formatNumber(d.gap, 3)} label="汎化ギャップ" tone="blue" />
      </div>

      <Callout
        title={`次数 d=${d.effDegree}：${regime.text}（汎化誤差が最小なのは d=${d.bestDegree}）`}
        body={
          d.regime === "overfit"
            ? `訓練点にはよく合う（経験誤差 ${formatNumber(d.trainRmse, 3)}）のに、テストでは ${formatNumber(d.testRmse, 3)} と大きい。フィット（青）が点の «間» で暴れ、訓練データのノイズまで覚えてしまった＝過学習。汎化ギャップ ${formatNumber(d.gap, 3)} が広い。次数を下げるか、データ（n）を増やすと収まる。`
            : d.regime === "underfit"
              ? `モデルが単純すぎて真の曲線のうねりを表せず、訓練でもテストでも誤差が大きい＝適合不足（高バイアス）。次数 d を ${d.bestDegree} あたりまで上げるとどちらの誤差も下がる。`
              : `経験誤差と汎化誤差がともに小さく、汎化ギャップも狭い «ちょうどよい» 複雑さ。真の関数（破線）にフィット（青）がよく重なっている。ここより複雑にすると汎化誤差が増える（過学習）。`
        }
        note={`機械学習の目標は «見たデータ» への当てはめ（経験誤差）ではなく «まだ見ぬデータ» での誤差（汎化誤差）の最小化。訓練誤差は複雑さとともに単調に下がるが、汎化誤差は «バイアス² + 分散» の和なので U 字を描き、最小点＝最良の複雑さ。`}
        kind={d.regime === "good" ? "explain" : "supplement"}
      />
    </div>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone: "emerald" | "red" | "blue" }) {
  const bg = {
    emerald: "bg-emerald-50 text-emerald-700",
    red: "bg-rose-50 text-rose-700",
    blue: "bg-blue-50 text-blue-700",
  }[tone];
  return (
    <div className={`rounded-lg px-2 py-2 ${bg}`}>
      <div className="font-mono text-sm">{value}</div>
      <div className="text-slate-500">{label}</div>
    </div>
  );
}
