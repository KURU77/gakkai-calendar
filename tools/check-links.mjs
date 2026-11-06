// events.json のリンクを点検し、確実に切れているURLを <フォルダ>/dead.json に保存する
// 使い方: node tools/check-links.mjs <収集データのフォルダ>
// 403 やタイムアウトは「ボット拒否」の可能性があるので切れた扱いにしない
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = process.argv[2];
const cacheFile = path.join(dir, 'linkcheck.json');
const cache = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : {};
const { events } = JSON.parse(fs.readFileSync(path.join(here, '..', 'events.json'), 'utf8'));
const urls = [...new Set(events.filter((e) => !e.l).map((e) => e.u))].filter((u) => !(u in cache));
const headers = { 'User-Agent': 'Mozilla/5.0 (compatible; conference-calendar-linkcheck)' };

async function check(u) {
  try {
    const r = await fetch(u, { headers, redirect: 'follow', signal: AbortSignal.timeout(15000) });
    r.body?.cancel().catch(() => {});
    return r.status;
  } catch (e) {
    const c = e.cause?.code || e.name;
    return /ENOTFOUND|EAI_AGAIN/.test(c) ? 'dns' : 'err:' + c;
  }
}
let i = 0;
async function work() {
  while (i < urls.length) {
    const u = urls[i++];
    cache[u] = await check(u);
    if (i % 100 === 0) { console.log(i, urls.length); fs.writeFileSync(cacheFile, JSON.stringify(cache)); }
    await new Promise((r) => setTimeout(r, 150));
  }
}
await Promise.all(Array.from({ length: 8 }, work));
fs.writeFileSync(cacheFile, JSON.stringify(cache));
const dead = Object.entries(cache).filter(([, s]) => s === 404 || s === 410 || s === 'dns').map(([u]) => u);
fs.writeFileSync(path.join(dir, 'dead.json'), JSON.stringify(dead));
const tally = {};
for (const s of Object.values(cache)) { const k = String(s).replace(/^err:.*/, 'err'); tally[k] = (tally[k] || 0) + 1; }
console.log(tally, 'dead', dead.length);
