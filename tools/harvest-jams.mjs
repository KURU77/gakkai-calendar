// 日本医学会: 分科会の公式サイト一覧 ＋ 分科会総会情報
import fs from 'fs';
const OUT=process.argv[2];
const UA={headers:{'User-Agent':'Mozilla/5.0 (compatible; conference-calendar-research)'}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const strip=h=>h.replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
async function get(u){ try{const r=await fetch(u,{...UA,signal:AbortSignal.timeout(25000)}); return {s:r.status,t:await r.text()};}catch{return {s:0,t:''}} }
const a=await get('https://jams.med.or.jp/members-a/index.html');
fs.writeFileSync(OUT+'/jams_a.html',a.t); console.log('members-a',a.s,a.t.length);
const i=a.t.indexOf('main_contents'); 
const idx=await get('https://jams.med.or.jp/members-s/index.html');
const list=[...idx.t.matchAll(/<a href="(\d+)\.html">No\.\d+\s*([^<]+)<\/a>/g)].map(m=>[m[1],m[2].trim()]);
console.log('societies',list.length);
const out=[];
for(const [n,name] of list){ const {t}=await get(`https://jams.med.or.jp/members-s/${n}.html`); const u=(t.match(/class="hp"><a href="([^"]+)"/)||[])[1]; if(u) out.push([name,u]); await sleep(700); }
fs.writeFileSync(OUT+'/jams_soc.json',JSON.stringify(out)); console.log('saved',out.length);
