// PWA アイコン生成（外部依存なし）。
// 統計テーマに合わせ「釣鐘型ヒストグラム（CLT の標本平均分布）」を意匠にする。
// Node 標準の zlib だけで PNG(RGBA/8bit) をエンコードするため、ネイティブ依存ビルドは不要。
// 使い方: `node scripts/gen-icons.mjs` → public/ に各サイズの PNG を出力。
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public");
mkdirSync(OUT, { recursive: true });

// ブランド色（slate-900 背景 / indigo→sky のバー）。
const BG = [15, 23, 42, 255]; // #0f172a
const BAR_TOP = [129, 140, 248]; // indigo-400 #818cf8
const BAR_BOTTOM = [56, 189, 248]; // sky-400 #38bdf8
const BASELINE = [148, 163, 184]; // slate-400

// --- 最小 PNG エンコーダ（RGBA, 8bit, フィルタ0） -------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // 10..12: compression/filter/interlace = 0
  // 各スキャンラインの先頭にフィルタ種別(0)を付与する。
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// --- 描画ヘルパ ----------------------------------------------------------
function makeIcon(size, { maskable = false } = {}) {
  const buf = Buffer.alloc(size * size * 4);
  const setPx = (x, y, [r, g, b, a]) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    // 単純なアルファ合成（背景は不透明前提）。
    const af = a / 255;
    buf[i] = Math.round(r * af + buf[i] * (1 - af));
    buf[i + 1] = Math.round(g * af + buf[i + 1] * (1 - af));
    buf[i + 2] = Math.round(b * af + buf[i + 2] * (1 - af));
    buf[i + 3] = 255;
  };
  // 背景（不透明）。
  for (let i = 0; i < size * size; i++) {
    buf[i * 4] = BG[0];
    buf[i * 4 + 1] = BG[1];
    buf[i * 4 + 2] = BG[2];
    buf[i * 4 + 3] = 255;
  }

  // maskable は外周がトリミングされ得るので中央の安全域(約 64%)に収める。
  const safe = maskable ? 0.64 : 0.78;
  const content = size * safe;
  const ox = (size - content) / 2;
  const oy = (size - content) / 2;

  // 釣鐘型のバー（ガウス）。本数は size に応じて調整。
  const bars = size >= 256 ? 9 : 7;
  const gap = content * 0.06;
  const barW = (content - gap * (bars - 1)) / bars;
  const baseY = oy + content * 0.86; // バーの底
  const maxBarH = content * 0.72;
  const sigma = bars / 3.2;
  const lerp = (a, b, t) => Math.round(a + (b - a) * t);

  for (let bi = 0; bi < bars; bi++) {
    const xc = bi - (bars - 1) / 2;
    const h = Math.exp(-(xc * xc) / (2 * sigma * sigma)) * maxBarH;
    const x0 = Math.round(ox + bi * (barW + gap));
    const x1 = Math.round(x0 + barW);
    const y0 = Math.round(baseY - h);
    const y1 = Math.round(baseY);
    for (let y = y0; y < y1; y++) {
      const t = (y - y0) / Math.max(1, y1 - y0);
      const col = [
        lerp(BAR_TOP[0], BAR_BOTTOM[0], t),
        lerp(BAR_TOP[1], BAR_BOTTOM[1], t),
        lerp(BAR_TOP[2], BAR_BOTTOM[2], t),
        255,
      ];
      for (let x = x0; x < x1; x++) setPx(x, y, col);
    }
  }

  // ベースライン（軸）。
  const axisY = Math.round(baseY) + Math.max(1, Math.round(size * 0.012));
  const axisH = Math.max(1, Math.round(size * 0.018));
  for (let y = axisY; y < axisY + axisH; y++) {
    for (let x = Math.round(ox); x < Math.round(ox + content); x++) setPx(x, y, [...BASELINE]);
  }

  return encodePng(size, size, buf);
}

const targets = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "icon-maskable-512.png", size: 512, maskable: true },
  { name: "apple-icon-180.png", size: 180 },
];

for (const t of targets) {
  const png = makeIcon(t.size, { maskable: t.maskable });
  writeFileSync(join(OUT, t.name), png);
  console.log(`wrote public/${t.name} (${png.length} bytes)`);
}
