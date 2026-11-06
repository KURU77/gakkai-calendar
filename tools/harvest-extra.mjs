// 日本物理学会 学術的会合情報 / くろしお出版 学会・研究会情報
import fs from 'fs';
const OUT=process.argv[2];
const UA={headers:{'User-Agent':'Mozilla/5.0 (compatible; conference-calendar-research)'}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const pad=n=>String(n).padStart(2,'0');
const dec=s=>s.replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&#8211;/g,'–');
const strip=h=>dec(h.replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
const get=async u=>{try{return await (await fetch(u,{...UA,signal:AbortSignal.timeout(20000)})).text()}catch{return ''}};
// 物理学会
{ const t=await get('https://www.jps.or.jp/keijiban/e-bulletin.php'); const out=[];
  for(const sec of t.split(/<h5>/).slice(1)){ const ym=sec.match(/^(20\d\d)年(\d+)月/); if(!ym) continue; const y=+ym[1];
    for(const m of sec.matchAll(/<tr>\s*<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/g)){
      const d=strip(m[1]).match(/(\d+)\/(\d+)(?:\s*[-‐–~～]\s*(?:(\d+)\/)?(\d+))?/); if(!d) continue;
      const sm=+d[1],sd=+d[2],em=d[4]?+(d[3]||d[1]):sm,ed=d[4]?+d[4]:sd; const yy=sm<+ym[2]-6?y+1:y;
      const a=m[2].match(/href="(https?:[^"]+)"/);
      out.push({src:'jps',name:strip(m[2]),start:`${yy}-${pad(sm)}-${pad(sd)}`,end:`${em<sm?yy+1:yy}-${pad(em)}-${pad(ed)}`,venue:strip(m[3]),url:a?dec(a[1]):''});
    } }
  fs.writeFileSync(OUT+'/jps.json',JSON.stringify(out)); console.log('jps',out.length,out.filter(e=>e.start>='2026-11-07').length,JSON.stringify(out.slice(-1)));
}
// くろしお
{ const t=await get('https://www.9640.jp/topics/gakkai/'); const out=[];
  for(const m of t.matchAll(/<li>\s*(20\d\d)年(\d+)月(\d+)日[^<]*?(?:～\s*(20\d\d)年(\d+)月(\d+)日[^<]*)?<br\s*\/?>\s*<strong><a href="([^"]+)">([\s\S]*?)<\/a><\/strong>\s*([^<]*)<\/li>/g)){
    const start=`${m[1]}-${pad(+m[2])}-${pad(+m[3])}`; if(start<'2026-11-07') continue;
    const end=m[6]?`${m[4]}-${pad(+m[5])}-${pad(+m[6])}`:start;
    out.push({src:'kuroshio',name:strip(m[8].replace(/<b[\s\S]*?<\/b>/,'')),start,end,venue:strip(m[9]),detail:m[7],url:''});
  }
  console.log('kuroshio',out.length);
  for(const e of out){ const d=await get(e.detail); const body=(d.split('edit_area')[1]||d).split('<footer')[0];
    const ext=[...body.matchAll(/href="(https?:[^"]+)"/g)].map(x=>dec(x[1])).filter(u=>!/9640\.jp|twitter|facebook|x\.com|line\.me|google\.com\/calendar|calendar\.google/.test(u));
    e.url=ext[0]||''; delete e.detail; await sleep(600); }
  fs.writeFileSync(OUT+'/kuroshio.json',JSON.stringify(out)); console.log('with url',out.filter(e=>e.url).length); console.log(out.slice(0,60).map(e=>e.start+' '+e.name.slice(0,34)+' '+e.url.slice(0,44)).join('\n'));
}
