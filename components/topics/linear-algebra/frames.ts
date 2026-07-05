/**
 * 「固有ベクトルを探す」ステッパーのフレーム列ビルダー（計算層・純関数）。
 * 探針ベクトル v を単位円上でぐるっと回し、像 A·v が «v と同じ向き» になる角度を探す
 * ——それが固有ベクトルで、伸び率が固有値（アルゴリズム図鑑スタイル）。副作用なし（Vitest 対象）。
 * 描画は EigenvectorStepper.tsx が購読する。
 */

import type { VizFrame } from "@/components/viz";
import { angleBetweenDeg, apply2, norm2, type Mat2, type Vec2 } from "@/lib/stats/linear-algebra";

/** 固定の対称行列 [[2,1],[1,2]]：固有値 3（45°方向）・1（135°方向）。 */
export const DEMO: Mat2 = { a: 2, b: 1, c: 1, d: 2 };

/** 探針を回す角度（度）。45° と 135°（固有方向）をちょうど含む 15° 刻み。 */
export const PROBE_ANGLES: number[] = Array.from({ length: 12 }, (_, i) => i * 15);

/** 像が探針と «同じ向き» とみなす許容角（度）。 */
const ALIGN_TOL = 1e-6;

function probeVec(deg: number): Vec2 {
  const t = (deg * Math.PI) / 180;
  return { x: Math.cos(t), y: Math.sin(t) };
}

export type EigenFramePayload = {
  /** −1=導入、0..=PROBE_ANGLES の index。 */
  stepIndex: number;
  /** 探針の角度（度）。導入では null。 */
  angleDeg: number | null;
  probe: Vec2;
  image: Vec2;
  /** 探針と像のなす角（度, 0〜180）。0 か 180 に近いほど «同じ直線»。 */
  imageAngle: number;
  /** 像／探針の伸び率（同じ向きのとき固有値）。 */
  scale: number;
  /** 固有方向（像が探針と平行）か。 */
  isEigen: boolean;
};

/** 探針と像が同一直線上（角度 ≈ 0° or 180°）なら固有方向。 */
function alignedEigenvalue(probe: Vec2, image: Vec2): { aligned: boolean; scale: number } {
  const ang = angleBetweenDeg(probe, image);
  const sameDir = ang <= ALIGN_TOL;
  const oppDir = Math.abs(ang - 180) <= ALIGN_TOL;
  const scale = (norm2(image) / norm2(probe)) * (oppDir ? -1 : 1);
  return { aligned: sameDir || oppDir, scale };
}

/** 固有ベクトル探索のフレーム列を作る。 */
export function buildEigenvectorFrames(): VizFrame<EigenFramePayload>[] {
  const intro: VizFrame<EigenFramePayload> = {
    payload: {
      stepIndex: -1,
      angleDeg: null,
      probe: { x: 1, y: 0 },
      image: apply2(DEMO, { x: 1, y: 0 }),
      imageAngle: angleBetweenDeg({ x: 1, y: 0 }, apply2(DEMO, { x: 1, y: 0 })),
      scale: norm2(apply2(DEMO, { x: 1, y: 0 })),
      isEigen: false,
    },
    highlights: ["intro"],
    callout: {
      title: "① 固有ベクトル＝«掛けても向きが変わらない» 方向",
      body: "行列 A=[[2,1],[1,2]] を、いろいろな向きの探針ベクトル v に掛けてみる。ふつうは像 A·v の «向き» が v からズレる。ズレが 0 になる特別な向きが固有ベクトル、そのときの伸び率が固有値 λ（A·v=λv）。",
      note: "探針を単位円上でゆっくり回し、青い探針と赤い像が «一直線» に重なる角度を探す。",
      kind: "explain",
    },
  };

  const steps: VizFrame<EigenFramePayload>[] = PROBE_ANGLES.map((deg, i) => {
    const probe = probeVec(deg);
    const image = apply2(DEMO, probe);
    const imageAngle = angleBetweenDeg(probe, image);
    const { aligned, scale } = alignedEigenvalue(probe, image);
    return {
      payload: { stepIndex: i, angleDeg: deg, probe, image, imageAngle, scale, isEigen: aligned },
      highlights: aligned ? ["probe", "eigen"] : ["probe"],
      callout: aligned
        ? {
            title: `★ ${deg}° で一直線！ここが固有ベクトル（λ=${scale.toFixed(1)}）`,
            body: `探針 v と像 A·v の «なす角» が 0° になった。向きが変わらず長さだけ ${scale.toFixed(1)} 倍——これが固有ベクトルで、伸び率 ${scale.toFixed(1)} が固有値 λ。この行列は 45° 方向（λ=3）と 135° 方向（λ=1）に2本の固有方向を持つ。`,
            note: "対称行列なので2本の固有ベクトルは直交する（45° と 135° は90°違い）。",
            kind: "supplement",
          }
        : {
            title: `${deg}° の探針：なす角 ${imageAngle.toFixed(0)}°（まだ固有方向でない）`,
            body: `探針 v を ${deg}° に置くと、像 A·v は v から ${imageAngle.toFixed(0)}° ズレている。向きが変わっているので、この方向は固有ベクトルではない。`,
            note: "なす角が 0° に近づく向きを探し続ける。",
            kind: "explain",
          },
    };
  });

  return [intro, ...steps];
}
