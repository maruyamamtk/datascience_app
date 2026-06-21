"use client";

import {
  Callout,
  Highlight,
  StepPlayer,
  VizPanel,
  frameAt,
  useFramePlayer,
  type VizFrame,
} from "@/components/viz";
import { createTopicStore } from "@/lib/store/topicStore";

// ── ダミーのフレーム列（受け入れ条件: ダミーのフレーム列でコマ送り等が動作） ──
// 題材は「線形探索で配列の最大値を求める」。アルゴリズム図鑑スタイルで、
// 小さな具体例（要素 6 個）を 1 コマずつ走査して原理を見せる。

const ARRAY = [5, 3, 8, 1, 9, 4] as const;

type ScanPayload = { cur: number; best: number };

/** 配列を左から走査し、各ステップを 1 フレームに展開する純粋なビルダー。 */
function buildScanFrames(arr: readonly number[]): VizFrame<ScanPayload>[] {
  const frames: VizFrame<ScanPayload>[] = [];
  let best = 0;
  arr.forEach((_, i) => {
    const updated = i === 0 || arr[i] > arr[best];
    if (updated) best = i;
    const last = i === arr.length - 1;
    frames.push({
      payload: { cur: i, best },
      highlights: [`box-${i}`, `box-${best}`],
      callout: {
        title: `ステップ ${i + 1}：a[${i}] = ${arr[i]} を見る`,
        body: updated
          ? `これまでの最大を更新。a[${best}] = ${arr[best]} が新しい最大候補です。`
          : `a[${i}] = ${arr[i]} は現在の最大 a[${best}] = ${arr[best]} 以下なので、最大は変わりません。`,
        note: last
          ? `走査終了。最大値は a[${best}] = ${arr[best]} です。`
          : "1 要素ずつ左から比較していくのが線形探索です。",
        kind: updated ? "explain" : "supplement",
      },
    });
  });
  return frames;
}

const FRAMES = buildScanFrames(ARRAY);
const LABELS = FRAMES.map((f) => f.callout?.title ?? "");

const COLOR_CUR = "#2563eb"; // blue: いま見ている要素
const COLOR_BEST = "#16a34a"; // green: これまでの最大

// フレーム位置だけを管理する最小トピックストア（操作値・派生値は無し）。
// Issue #3 の topicStore の frame 状態を single source of truth として使い回す。
const useScanStore = createTopicStore<Record<string, never>, Record<string, never>>({
  initialControls: {},
  derive: () => ({}),
  initialFrameCount: FRAMES.length,
});

/**
 * Issue #4 可視化共通部品の実証 PoC。
 * StepPlayer（コマ送り）/ Highlight（色ハイライト）/ Callout（近傍コールアウト）/ VizPanel
 * （レイアウト規約）を、Issue #3 のトピックストアの frame 状態に配線して動かす。
 */
export function VizPoc() {
  const index = useScanStore((s) => s.frame.index);
  const count = useScanStore((s) => s.frame.count);
  const playing = useScanStore((s) => s.frame.playing);
  const nextFrame = useScanStore((s) => s.nextFrame);
  const prevFrame = useScanStore((s) => s.prevFrame);
  const goToFrame = useScanStore((s) => s.goToFrame);
  const setPlaying = useScanStore((s) => s.setPlaying);

  // 自動再生のタイマー（副作用は hook に隔離）。末尾で自動停止。
  useFramePlayer({
    playing,
    index,
    count,
    onAdvance: nextFrame,
    onStop: () => setPlaying(false),
  });

  const frame = frameAt(FRAMES, index);
  const { cur, best } = frame?.payload ?? { cur: 0, best: 0 };

  return (
    <VizPanel
      number={1}
      title="配列の最大値を探す（線形探索）"
      description="左から 1 要素ずつ見ていき、これまでの最大（緑）といま見ている要素（青）を強調します。再生・前後送り・スライダーで動かしてください。"
    >
      {/* 図: 配列の各要素。Highlight で「いま」「最大」を色分け強調。 */}
      <div className="flex flex-wrap justify-center gap-3 py-4" data-testid="scan-array">
        {ARRAY.map((v, p) => {
          const isCur = p === cur;
          const isBest = p === best;
          const active = isCur || isBest;
          const color = isBest ? COLOR_BEST : COLOR_CUR;
          return (
            <Highlight key={p} active={active} color={color}>
              <div className="flex h-16 w-16 flex-col items-center justify-center bg-white">
                <span className="text-2xl font-bold text-slate-900">{v}</span>
                <span className="font-mono text-xs text-slate-400">a[{p}]</span>
              </div>
            </Highlight>
          );
        })}
      </div>

      {/* 凡例 */}
      <div className="flex justify-center gap-6 text-sm text-slate-600">
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: COLOR_CUR }} />
          いま見ている要素
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: COLOR_BEST }} />
          これまでの最大
        </span>
      </div>

      {/* 近傍コールアウト: いま・何が・なぜ */}
      {frame?.callout ? <Callout {...frame.callout} /> : null}

      {/* コマ送りプレイヤー */}
      <StepPlayer
        count={count}
        index={index}
        playing={playing}
        onPrev={prevFrame}
        onNext={nextFrame}
        onSeek={goToFrame}
        onTogglePlay={() => setPlaying(!playing)}
        labels={LABELS}
      />
    </VizPanel>
  );
}
