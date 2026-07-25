"use client";

import { useEffect, useMemo } from "react";
import { Callout, frameAt, StepPlayer, useFramePlayer } from "@/components/viz";
import { backwardInductionSteps } from "@/lib/stats/decision-analysis";
import { useDecisionAnalysisStore, useDecisionTreeStepperStore } from "@/lib/store/decision-analysis";
import { buildTreeFrames } from "./frames";
import { num, pct } from "./format";

const COLOR_DONE = "#2563eb";
const COLOR_CURRENT = "#f59e0b";
const COLOR_CHOSEN = "#16a34a";

const ROOT_X = 40;
const CHANCE_X = 230;
const LEAF_X = 470;
const LABEL_X = 486;
const TOP_PAD = 24;
const LEAF_GAP = 42;

type LeafPos = { x: number; y: number };

function DecisionSquare({ x, y, active }: { x: number; y: number; active: boolean }) {
  return (
    <rect
      x={x - 9}
      y={y - 9}
      width={18}
      height={18}
      rx={3}
      fill={active ? "#eff6ff" : "#f8fafc"}
      stroke={active ? COLOR_CURRENT : "#94a3b8"}
      strokeWidth={active ? 2.5 : 1.5}
    />
  );
}

function ChanceCircle({ x, y, state }: { x: number; y: number; state: "hidden" | "current" | "done" }) {
  const stroke = state === "current" ? COLOR_CURRENT : state === "done" ? COLOR_DONE : "#94a3b8";
  return <circle cx={x} cy={y} r={10} fill="#fff" stroke={stroke} strokeWidth={state === "hidden" ? 1.5 : 2.5} />;
}

/**
 * 決定木の後ろ向き帰納法(バックワードインダクション)ステッパー(L2)。
 * 末端の利得はすでに見えている状態から、確率ノード→決定ノードの順に値が1つずつ確定していく様子を
 * コマ送りで見せる(アルゴリズム図鑑スタイル)。最終的に決定ノードが選ぶ枝は、
 * ExpectedValueLabのESVが選ぶ行動と一致する。
 */
export function DecisionTreeStepper() {
  const probGood = useDecisionAnalysisStore((s) => s.controls.probGood);
  const actions = useDecisionAnalysisStore((s) => s.derived.actions);
  const states = useDecisionAnalysisStore((s) => s.derived.states);
  const tree = useDecisionAnalysisStore((s) => s.derived.tree);

  const index = useDecisionTreeStepperStore((s) => s.frame.index);
  const count = useDecisionTreeStepperStore((s) => s.frame.count);
  const playing = useDecisionTreeStepperStore((s) => s.frame.playing);
  const nextFrame = useDecisionTreeStepperStore((s) => s.nextFrame);
  const prevFrame = useDecisionTreeStepperStore((s) => s.prevFrame);
  const goToFrame = useDecisionTreeStepperStore((s) => s.goToFrame);
  const setPlaying = useDecisionTreeStepperStore((s) => s.setPlaying);
  const setFrameCount = useDecisionTreeStepperStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildTreeFrames(tree), [tree]);
  const valueMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const step of backwardInductionSteps(tree)) map.set(step.node.id, step.value);
    return map;
  }, [tree]);

  useEffect(() => setFrameCount(frames.length), [frames.length, setFrameCount]);
  useFramePlayer({
    playing,
    index,
    count,
    onAdvance: nextFrame,
    onStop: () => setPlaying(false),
    intervalMs: 1600,
  });

  const frame = frameAt(frames, index);
  const payload = frame?.payload;
  const revealed = new Set(payload?.computedIds ?? []);
  const currentId = payload?.currentId ?? null;
  const chosenBranchId = payload?.chosenBranchId;

  const nActions = actions.length;
  const nStates = states.length;
  const height = TOP_PAD * 2 + nActions * nStates * LEAF_GAP;
  const rootY = height / 2;

  if (tree.kind !== "decision") return null;

  const leafPositions: LeafPos[][] = tree.branches.map((_, i) => {
    const base = TOP_PAD + i * nStates * LEAF_GAP;
    return Array.from({ length: nStates }, (_, j) => ({
      x: LEAF_X,
      y: base + j * LEAF_GAP + LEAF_GAP / 2,
    }));
  });
  const chanceY = leafPositions.map((leaves) => leaves.reduce((s, p) => s + p.y, 0) / leaves.length);

  const nodeState = (id: string): "hidden" | "current" | "done" =>
    id === currentId ? "current" : revealed.has(id) ? "done" : "hidden";

  return (
    <div
      id="decision-tree-stepper"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <p className="text-sm text-slate-600">
        □は<strong className="font-semibold text-slate-900">決定ノード</strong>(意思決定者が選ぶ)、○は
        <strong className="font-semibold text-slate-900">確率ノード</strong>(自然の状態が確率的に決まる)。
        末端(葉)の利得はすでに分かっているので、そこから根に向かって値を計算していく(後ろ向き帰納法)。
      </p>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 560 ${height}`}
          className="mx-auto h-auto w-full max-w-2xl"
          role="img"
          aria-label="決定木(後ろ向き帰納法)"
          data-testid="decision-tree-svg"
        >
          {tree.branches.map((branch, i) => {
            const cy = chanceY[i];
            const chId = branch.child.id;
            const isChosen = chosenBranchId === branch.id;
            return (
              <g key={branch.id}>
                <line
                  x1={ROOT_X}
                  y1={rootY}
                  x2={CHANCE_X}
                  y2={cy}
                  stroke={isChosen ? COLOR_CHOSEN : "#cbd5e1"}
                  strokeWidth={isChosen ? 3 : 1.5}
                  data-testid={`edge-root-${i}`}
                />
                <text x={(ROOT_X + CHANCE_X) / 2} y={(rootY + cy) / 2 - 6} textAnchor="middle" className="fill-slate-500 text-[9px]">
                  {branch.label}
                </text>
                <ChanceCircle x={CHANCE_X} y={cy} state={nodeState(chId)} />
                <text
                  x={CHANCE_X}
                  y={cy - 16}
                  textAnchor="middle"
                  className="fill-slate-700 text-[10px] font-semibold"
                  data-testid={`chance-value-${i}`}
                >
                  {revealed.has(chId) || currentId === chId ? num(valueMap.get(chId)) : "?"}
                </text>

                {branch.child.kind === "chance"
                  ? branch.child.branches.map((sb, j) => {
                      const leaf = leafPositions[i][j];
                      return (
                        <g key={sb.id}>
                          <line x1={CHANCE_X} y1={cy} x2={leaf.x} y2={leaf.y} stroke="#e2e8f0" strokeWidth={1.5} />
                          <circle cx={leaf.x} cy={leaf.y} r={3} fill="#475569" />
                          <text x={LABEL_X} y={leaf.y - 4} className="fill-slate-500 text-[9px]">
                            {sb.label}(p={pct(sb.probability)})
                          </text>
                          <text x={LABEL_X} y={leaf.y + 9} className="fill-slate-800 text-[10px] font-semibold">
                            {num(sb.child.kind === "terminal" ? sb.child.value : 0)}
                          </text>
                        </g>
                      );
                    })
                  : null}
              </g>
            );
          })}

          <DecisionSquare x={ROOT_X} y={rootY} active={currentId === "root"} />
          <text x={ROOT_X} y={rootY - 16} textAnchor="middle" className="fill-slate-700 text-[10px] font-semibold" data-testid="root-value">
            {revealed.has("root") || currentId === "root" ? num(valueMap.get("root")) : "?"}
          </text>
        </svg>
      </div>

      {frame?.callout ? <Callout {...frame.callout} /> : null}

      <StepPlayer
        count={count}
        index={index}
        playing={playing}
        onPrev={prevFrame}
        onNext={nextFrame}
        onSeek={goToFrame}
        onTogglePlay={() => setPlaying(!playing)}
      />

      <p className="text-xs text-slate-500">
        利得行列・確率pは上のラボと共有している(上の利得行列や確率スライダーを変えると、この決定木も連動して変わる)。現在の
        p(好況)={pct(probGood)}。
      </p>
    </div>
  );
}
