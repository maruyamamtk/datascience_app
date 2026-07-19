"use client";

import { formatNumber } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { manhattanOptimalSteps } from "@/lib/stats/reinforcement-learning";
import { useReinforcementLearningStore } from "@/lib/store/reinforcement-learning";

const W = 320;
const H = 160;
const PAD_L = 28;
const PAD_B = 18;
const PAD_T = 8;
const PAD_R = 8;
const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * 学習曲線（Level2）: 上の GridWorldLab と **同じメインストア** を購読するので、
 * ε・α・γ・学習エピソード数を動かすとこのグラフも即座に連動する（single source of truth）。
 * エピソードごとの歩数（ゴールまでの早さ）が学習とともに短くなり、最短経路（点線）に
 * 近づいていく収束の様子を折れ線で見せる。
 */
export function LearningCurveChart() {
  const lengths = useReinforcementLearningStore((s) => s.derived.episodeLengths);
  const rewards = useReinforcementLearningStore((s) => s.derived.episodeRewards);
  const optimal = manhattanOptimalSteps();

  if (lengths.length === 0) {
    return (
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-600">
          まだ学習エピソードがない。上のラボ（
          <a href="#grid-world-lab" className="text-blue-700 underline underline-offset-2">
            GridWorldLab
          </a>
          ）で «+10エピソード学習» を押すと、ここに学習曲線が現れる。
        </p>
      </div>
    );
  }

  const maxLen = Math.max(optimal, ...lengths);
  const n = lengths.length;
  const scaleX = (i: number) => round2(PAD_L + (n <= 1 ? 0 : (i / (n - 1)) * (W - PAD_L - PAD_R)));
  const scaleY = (v: number) => round2(H - PAD_B - (v / maxLen) * (H - PAD_B - PAD_T));

  const points = lengths.map((len, i) => `${scaleX(i)},${scaleY(len)}`).join(" ");
  const optimalY = scaleY(optimal);

  const chunkSize = Math.max(1, Math.ceil(n * 0.2));
  const firstAvg = lengths.slice(0, chunkSize).reduce((s, v) => s + v, 0) / chunkSize;
  const lastAvg = lengths.slice(-chunkSize).reduce((s, v) => s + v, 0) / chunkSize;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        横軸=学習エピソード番号、縦軸=そのエピソードでゴール（または落とし穴）に着くまでの歩数。点線は「壁を無視した最短歩数」（マンハッタン距離
        = {optimal} 歩）。学習が進むほど折れ線が下がり、最短歩数に近づいていく——これがQ学習の «収束» を歩数という目に見える形で表したもの。
      </p>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-md" role="img" aria-label="エピソードごとの歩数の学習曲線">
          <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={round2(H - PAD_B)} stroke="#cbd5e1" />
          <line x1={PAD_L} y1={round2(H - PAD_B)} x2={round2(W - PAD_R)} y2={round2(H - PAD_B)} stroke="#cbd5e1" />
          <line x1={PAD_L} y1={optimalY} x2={round2(W - PAD_R)} y2={optimalY} stroke="#059669" strokeDasharray="3 3" />
          <text x={round2(W - PAD_R)} y={round2(optimalY - 3)} textAnchor="end" className="fill-emerald-700 text-[8px]">
            最短 {optimal} 歩
          </text>
          <polyline points={points} fill="none" stroke="#2563eb" strokeWidth={1.5} />
          <text x={2} y={PAD_T + 6} className="fill-slate-400 text-[8px]">
            歩数
          </text>
          <text x={round2(W - PAD_R - 14)} y={round2(H - 4)} className="fill-slate-400 text-[8px]">
            episode →
          </text>
        </svg>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <Stat label="序盤2割の平均歩数" value={formatNumber(firstAvg, 1)} />
        <Stat label="直近2割の平均歩数" value={formatNumber(lastAvg, 1)} />
        <Stat label="最終エピソード報酬" value={formatNumber(rewards[rewards.length - 1], 1)} />
      </div>

      <Callout
        title={lastAvg < firstAvg ? "収束が進んでいる" : "まだ収束していない"}
        body={
          lastAvg < firstAvg
            ? `序盤（平均${formatNumber(firstAvg, 1)}歩）に比べ、直近のエピソードは平均${formatNumber(lastAvg, 1)}歩とゴールまで速くなった——Qテーブルが «どちらへ進めば得か» を正しく学習しつつある証拠。`
            : "エピソード数がまだ少ない、またはεが高すぎて探索に歩数を使いすぎている可能性がある。エピソード数を増やすか、εを下げて試してみよう。"
        }
        note="歩数が最短歩数（点線）ぴったりに揃わなくても正常——εを0より大きくしている限り、一定確率でランダムな行動（探索）を挟むため、学習が収束した後もときどき遠回りする。"
        kind="supplement"
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-2">
      <div className="font-mono text-sm text-slate-900">{value}</div>
      <div className="text-slate-500">{label}</div>
    </div>
  );
}
