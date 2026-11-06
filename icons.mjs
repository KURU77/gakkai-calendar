// アイコン生成（依存ライブラリなし・zlib だけで PNG を書く）
// 実行: node icons.mjs → icons/icon-192.png, icon-512.png, apple-touch-icon.png
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
mkdirSync(join(here, 'icons'), { recursive: true });

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
const NAVY = hex('#1F4E79');
const PAPER = hex('#F6F4EE');
const DIM = hex('#C9CFD8');
const MARK = hex('#D9902F');

// 月めくりの升目。1マスだけ色を付けて「大会のある日」を表す。
function draw(size) {
  const buf = Buffer.alloc(size * size * 4);
  const u = size / 100;
  const inRect = (x, y, r) => x >= r[0] && y >= r[1] && x < r[0] + r[2] && y < r[1] + r[3];
  const card = [20, 22, 60, 58];
  const head = [20, 22, 60, 13];
  const cells = [];
  for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) cells.push([27 + i * 12.2, 41 + j * 12.2, 9, 9, i === 2 && j === 1]);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const px = x / u, py = y / u;
    let c = NAVY;
    if (inRect(px, py, card)) {
      c = PAPER;
      if (inRect(px, py, head)) c = MARK;
      for (const k of cells) if (inRect(px, py, k)) c = k[4] ? MARK : DIM;
    }
    const i = (y * size + x) * 4;
    buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = 255;
  }
  return png(size, size, buf);
}

for (const s of [192, 512]) writeFileSync(join(here, 'icons', `icon-${s}.png`), draw(s));
writeFileSync(join(here, 'icons', 'apple-touch-icon.png'), draw(180));
console.log('built icons');
