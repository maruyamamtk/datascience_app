"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import {
  BITS_MAX,
  BITS_MIN,
  FS_MAX,
  FS_MIN,
  LAB_NYQUIST,
  SIG_FREQ,
  SIG_MAX,
  SIG_MIN,
  T_MAX,
  useDigitalInformationBasicsStore,
} from "@/lib/store/digital-information-basics";

// L=2ⁿ 段・段幅 Δ・SN 比を実時間で差し込み＋ハイライト。
const FORMULA = `L=2^{${term("bits", "?")}}=${term("levels", "?")}\\,\\text{段},\\ \\ \\Delta=\\frac{2}{L}=${term("step", "?")},\\ \\ \\mathrm{SNR}\\approx6.02n{+}1.76=${term("snr", "?")}\\,\\mathrm{dB}`;

const W = 360;
const H = 240;
const PADL = 30;
const PADR = 12;
const PADT = 12;
const PADB = 26;
const round2 = (v: number) => Math.round(v * 100) / 100;
const sx = (t: number) => round2(PADL + (t / T_MAX) * (W - PADL - PADR));
const sy = (v: number) =>
  round2(PADT + ((SIG_MAX - v) / (SIG_MAX - SIG_MIN)) * (H - PADT - PADB));

export function SamplingQuantizationLab() {
  const { fs, bits, levels, step, snrDb, nyquist, aliased, curve, samples } =
    useDigitalInformationBasicsStore((s) => s.derived);
  const setControl = useDigitalInformationBasicsStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("bits", String(bits));
    m.setValue("levels", String(levels));
    m.setValue("step", formatNumber(step, 3));
    m.setValue("snr", formatNumber(snrDb, 1));
    m.setHighlight("levels", true, "#2563eb");
    m.setHighlight("step", true, "#7c3aed");
    m.setHighlight("snr", true, "#059669");
  }, [bits, levels, step, snrDb]);

  // アナログ原信号の滑らかな曲線。
  const analog = curve.map((p) => `${sx(p.t)},${sy(p.value)}`).join(" ");

  // 量子化した標本の sample-and-hold 階段（各標本値を次の標本まで保持）。
  const stair: string[] = [];
  samples.forEach((s, i) => {
    const tNext = i + 1 < samples.length ? samples[i + 1].t : T_MAX;
    stair.push(`${sx(s.t)},${sy(s.value)}`, `${sx(tNext)},${sy(s.value)}`);
  });
  const stairPts = stair.join(" ");

  // 量子化の «段» の境界線（bits が小さいときだけ描く。多すぎると読めない）。
  const showLevels = bits <= 4;
  const boundaries = showLevels
    ? Array.from({ length: levels + 1 }, (_, i) => SIG_MIN + i * step)
    : [];

  const sampleColor = aliased ? "#dc2626" : "#2563eb";

  return (
    <div id="adc-lab" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        アナログの正弦波（<span className="font-mono">{SIG_FREQ}Hz</span>）を «デジタル化» する。横は{" "}
        <span className="font-mono">fs</span>（1 秒あたりの標本点数）で刻み、縦は{" "}
        <span className="font-mono">n bit</span>（<span className="font-mono">2ⁿ</span> 段階）に丸める。
        横が標本化、縦が量子化。<span className="font-mono">fs</span> を下げすぎると波形が化ける（エイリアシング）。
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="dig-fs" className="font-mono text-xs font-semibold text-slate-700">
            fs = {fs} Hz（標本化）
          </label>
          <input
            id="dig-fs"
            type="range"
            min={FS_MIN}
            max={FS_MAX}
            step={1}
            value={fs}
            onChange={(e) => setControl("fs", Number(e.target.value))}
            className="w-full accent-blue-600"
          />
          <div className="font-mono text-[10px] text-slate-400">
            ナイキスト下限 2·f_max = {LAB_NYQUIST} Hz
          </div>
        </div>
        <div className="space-y-1">
          <label htmlFor="dig-bits" className="font-mono text-xs font-semibold text-slate-700">
            n = {bits} bit → {levels} 段階（量子化）
          </label>
          <input
            id="dig-bits"
            type="range"
            min={BITS_MIN}
            max={BITS_MAX}
            step={1}
            value={bits}
            onChange={(e) => setControl("bits", Number(e.target.value))}
            className="w-full accent-violet-600"
          />
          <div className="font-mono text-[10px] text-slate-400">段幅 Δ = 2/{levels} = {formatNumber(step, 3)}</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-lg" role="img" aria-label="標本化と量子化の波形">
          {/* 量子化の段の境界 */}
          {boundaries.map((b, i) => (
            <line key={`b${i}`} x1={PADL} y1={sy(b)} x2={W - PADR} y2={sy(b)} className="stroke-violet-100" />
          ))}
          {/* 振幅目盛 */}
          {[SIG_MIN, 0, SIG_MAX].map((v) => (
            <text key={`v${v}`} x={PADL - 4} y={sy(v) + 3} textAnchor="end" className="fill-slate-400 text-[8px]">
              {v}
            </text>
          ))}
          <line x1={PADL} y1={sy(0)} x2={W - PADR} y2={sy(0)} className="stroke-slate-200" />
          {/* 量子化後の階段（sample-and-hold） */}
          <polyline points={stairPts} fill="none" className="stroke-violet-500" strokeWidth={1.8} />
          {/* アナログ原信号 */}
          <polyline points={analog} fill="none" className="stroke-slate-800" strokeWidth={1.6} opacity={0.7} />
          {/* 標本点（アナログ上） */}
          {samples.map((s, i) => (
            <circle key={`s${i}`} cx={sx(s.t)} cy={sy(s.raw)} r={2.6} fill={sampleColor} />
          ))}
          <text x={(PADL + W - PADR) / 2} y={H - 2} textAnchor="middle" className="fill-slate-500 text-[9px]">
            時間 t（秒）／ 点=標本, 紫=量子化後
          </text>
        </svg>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <Stat value={`${fs} Hz`} label="標本化 fs" tone={aliased ? "red" : "blue"} />
        <Stat value={`${levels} 段`} label={`量子化 ${bits}bit`} tone="violet" />
        <Stat value={`${formatNumber(snrDb, 1)} dB`} label="量子化 SN 比" tone="emerald" />
      </div>

      <Callout
        title={aliased ? `fs=${fs}Hz はナイキスト下限 ${nyquist}Hz 未満 → エイリアシング` : `fs=${fs}Hz・${bits}bit でデジタル化`}
        body={
          aliased
            ? `標本化定理は «原信号の最高周波数 f_max の 2 倍以上» で標本化せよと言う。いまは fs=${fs} < 2·${SIG_FREQ}=${nyquist} なので、標本点が波を追い切れず、復元波が本来と違う «偽の周波数» に化ける（折り返し／エイリアシング）。fs を ${nyquist}Hz 以上に上げると波形が正しく追える。`
            : `fs=${fs}Hz は下限 ${nyquist}Hz 以上なので波形を追えている（横方向）。縦方向は ${bits}bit=${levels} 段に丸めるので、階段（紫）と原波（黒）の差が量子化誤差。誤差は最大でも Δ/2=${formatNumber(step / 2, 3)}。bit を 1 増やすと段が 2 倍細かくなり SN 比が約 6 dB 改善する。`
        }
        note={`デジタル化＝ 横（時間）を標本化・縦（振幅）を量子化。標本化は fs≥2·f_max（ナイキスト）、量子化は n bit で 2ⁿ 段階・SN比≈6.02n+1.76 dB。両方を細かくするほど原信号に近いが、その分ビット数（データ量）が増える。`}
        kind={aliased ? "supplement" : "explain"}
      />
    </div>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone: "slate" | "blue" | "violet" | "emerald" | "red" }) {
  const bg = {
    slate: "bg-slate-50 text-slate-700",
    blue: "bg-blue-50 text-blue-700",
    violet: "bg-violet-50 text-violet-700",
    emerald: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
  }[tone];
  return (
    <div className={`rounded-lg px-2 py-2 ${bg}`}>
      <div className="font-mono text-sm">{value}</div>
      <div className="text-slate-500">{label}</div>
    </div>
  );
}
