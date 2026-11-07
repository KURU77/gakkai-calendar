// 有斐閣Online「学会予定一覧」から法学系学会の開催日・会場・URLを取得する
// 使い方: node tools/harvest-law.mjs <保存先フォルダ> [記事URL ...]
// 記事URLを省くと、既知の記事を読む（新しい号が出たら引数で渡す）
import fs from 'node:fs';
const OUT = process.argv[2];
const ARTICLES = process.argv.slice(3).length ? process.argv.slice(3) : [
  'https://yuhikaku.com/articles/-/58505', // 2026年秋季・冬季
  'https://yuhikaku.com/articles/-/57796', // 2026年春季・夏季
  'https://yuhikaku.com/articles/-/28361', // 2025年秋季・冬季
  'https://yuhikaku.com/articles/-/12976',
];
const UA = { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; conference-calendar-research)' } };
const pad = (n) => String(n).padStart(2, '0');
const z2h = (s) => s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
const strip = (h) => z2h(h.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim());
const events = [], societies = [];
for (const u of ARTICLES) {
  const t = await (await fetch(u, UA)).text();
  const title = (t.match(/<title>([^<]*)/) || [])[1] || '';
  const year = +(title.match(/(20\d\d)年/) || [])[1];
  if (!year) continue;
  const autumn = /秋季|冬季/.test(title);
  for (const row of t.split(/<tr[\s>]/i).slice(1)) {
    const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => m[1]);
    if (cells.length < 4) continue;
    const name = strip(cells[0]);
    const date = strip(cells[1]);
    const url = (row.match(/href="(https?:[^"]+)"/) || [])[1] || (strip(cells[cells.length - 1]).match(/https?:\/\/\S+/) || [])[0] || '';
    if (!/学会|研究会|協会|学会議/.test(name)) continue;
    if (url) societies.push([name, url]);
    const d = date.match(/(\d{1,2})月(\d{1,2})日(?:[^～〜・、]*[～〜・、]\s*(?:(\d{1,2})月)?\s*(\d{1,2})日)?/);
    if (!d) continue;
    const sm = +d[1], sd = +d[2], em = d[3] ? +d[3] : sm, ed = d[4] ? +d[4] : sd;
    // 秋冬号に翌年1〜3月の開催が載ることがある
    const y = autumn && sm <= 3 ? year + 1 : year;
    events.push({ src: 'yuhikaku', name: `${name} 研究大会`, org: name, start: `${y}-${pad(sm)}-${pad(sd)}`, end: `${em < sm ? y + 1 : y}-${pad(em)}-${pad(ed)}`, venue: strip(cells[2]), url });
  }
  await new Promise((r) => setTimeout(r, 1500));
}
fs.writeFileSync(`${OUT}/yuhikaku.json`, JSON.stringify(events));
fs.writeFileSync(`${OUT}/law_societies.json`, JSON.stringify(societies));
console.log('events', events.length, 'societies', new Set(societies.map((s) => s[0])).size);
for (const e of events.filter((e) => e.start >= '2026-11-01')) console.log(e.start, e.end, e.org, '|', e.venue, '|', e.url);
