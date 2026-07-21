/**
 * CriteriaStepper(Level1)の純粋なフレームビルダー。
 * 説明変数0個(切片のみ)から1個ずつ増やしたネストモデルを1つずつコマ送りで当てはめ、
 * RSS→対数尤度→AIC・BIC・Cpの表を少しずつ埋めていき、最後に3指標の«最小を選ぶモデル»が
 * 一致するとは限らないことをまとめて見せる(SPEC §3 J-5「情報量規準、AIC、BIC、Mallows の Cp」)。
 *
 * フレーム構成: [overview, model(0)..model(maxK), summary] = maxK+3 フレーム
 * (multiclass-metrics/frames.ts の buildOvrFrames と同じ構成パターン)。
 */
import type { VizFrame } from "@/components/viz";
import { argminBy, type ModelFit } from "@/lib/stats/model-selection-criteria";

export type CriteriaStepPayload = {
  step: "overview" | "model" | "summary";
  /** このフレームで当てはめているモデル(overview/summaryではundefined)。 */
  current?: ModelFit;
  /** ここまでに当てはめ終えたモデルの一覧(表を少しずつ埋めていく)。 */
  revealed: ModelFit[];
  /** 全モデル(常に一定、背景の完成形として使う)。 */
  all: ModelFit[];
  /** summaryフレームのみ: 各指標を最小にするモデル。 */
  aicBest?: ModelFit;
  bicBest?: ModelFit;
  cpBest?: ModelFit;
};

/** ネストモデル列からCriteriaStepperのフレーム列を作る純関数。 */
export function buildCriteriaFrames(models: readonly ModelFit[]): VizFrame<CriteriaStepPayload>[] {
  const all = [...models];
  const frames: VizFrame<CriteriaStepPayload>[] = [];

  frames.push({
    highlights: [],
    callout: {
      title: `説明変数0個(切片のみ)から${all.length - 1}個まで、1個ずつ増やしながら比較する`,
      body: "モデルを1つ当てはめるたびにRSS(残差平方和)が減り、対数尤度が増える——ここまでは «当てはまりの良さ» だけを見ている。",
      note: "AIC・BIC・Cpはこれに «複雑さへの罰則» を足し引きして、単純にRSS最小のモデル(=常に全変数入り)を選ばないようにする。",
      kind: "explain",
    },
    payload: { step: "overview", revealed: [], all },
  });

  for (let k = 0; k < all.length; k++) {
    const current = all[k];
    const revealed = all.slice(0, k + 1);
    frames.push({
      highlights: [`criteria-model-${k}`],
      callout: {
        title: `${k + 1}/${all.length}個目: k=${current.k}(パラメータ数${current.paramCount})`,
        body: `RSS=${current.rss.toFixed(2)} → 対数尤度=${current.logLik.toFixed(
          2,
        )} → AIC=${current.aic.toFixed(2)}, BIC=${current.bic.toFixed(2)}, Cp=${current.cp.toFixed(2)}。`,
        note:
          k === 0
            ? "切片のみのモデル(説明変数なし)を基準点として、ここから説明変数を増やすごとにAIC・BIC・Cpがどう動くか追っていく。"
            : "RSSは前のモデルより必ず減る(ネストモデルの性質)が、AIC・BIC・Cpは罰則が効くため必ずしも減るとは限らない。",
        kind: "supplement",
      },
      payload: { step: "model", current, revealed, all },
    });
  }

  const aicBest = argminBy(all, "aic");
  const bicBest = argminBy(all, "bic");
  const cpBest = argminBy(all, "cp");
  const agree = aicBest.k === bicBest.k && bicBest.k === cpBest.k;
  frames.push({
    highlights: all.map((_, k) => `criteria-model-${k}`),
    callout: {
      title: agree
        ? `全モデルそろった: AIC・BIC・Cpすべてk=${aicBest.k}を最小と判断`
        : `全モデルそろった: AICはk=${aicBest.k}、BIC・Cpはk=${bicBest.k}を最小と判断`,
      body: agree
        ? "この例では3つの指標が同じモデルサイズを選んだ——常に一致するとは限らない。"
        : "AICの罰則(パラメータ1個あたり2)はBIC(パラメータ1個あたりlog n)より緩いため、真には無関係な変数を含むより複雑なモデルをAICだけがわずかに«得»と判断してしまっている。",
      note: "BIC・Cpが選んだモデルが、実際にこのデータを生成した«真のモデル»(x1・x2だけを含む)と一致することを、下の操作ラボで確認しよう。",
      kind: "explain",
    },
    payload: { step: "summary", revealed: all, all, aicBest, bicBest, cpBest },
  });

  return frames;
}
