// 公開カレンダーから「名称・日程・会場・公式URL」だけを取得する（代表者名・連絡先は取らない）
import fs from 'fs';
const OUT = process.argv[2];
const UA={headers:{'User-Agent':'Mozilla/5.0 (compatible; conference-calendar-research)'}};
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const dec = s => s.replace(/&amp;/g,'&').replace(/&#0?38;/g,'&').replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#8211;/g,'–');
const strip = h => dec(h.replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
async function get(u){ for(let i=0;i<3;i++){ try{ const r=await fetch(u,{...UA,signal:AbortSignal.timeout(30000)}); return {s:r.status,t:await r.text()}; }catch(e){ await sleep(3000);} } return {s:0,t:''}; }
const save=(n,d)=>{fs.writeFileSync(`${OUT}/${n}.json`,JSON.stringify(d,null,0)); console.log(n,d.length);};
const pad=n=>String(n).padStart(2,'0');
const which = process.argv[3]||'all';

// --- 科学カレンダー（理工系）
if(which==='all'||which==='kagaku'){
  const {t}=await get('https://www.kagaku.com/calendar.php');
  const rows=[...t.matchAll(/<tr><td><input type="checkbox" name="idcheck\[\]"[^>]*><\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>(\d{4})<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/g)];
  const out=[];
  for(const m of rows){
    const name=strip(m[1]); const a=[...m[1].matchAll(/href="(https?:[^"]+)"[^>]*target="_blank"/g)].pop(); const org=m[1].match(/title="主催：([^\n"]*)/);
    const d=strip(m[3]).match(/(\d+)\/\s*(\d+)[^\d−-]*(?:[−-]\s*(?:(\d+)\/\s*)?(\d+))?/);
    if(!d) continue; const y=+m[2]; const sm=+d[1], sd=+d[2]; const em=d[4]?+(d[3]||d[1]):sm, ed=d[4]?+d[4]:sd; const ey=em<sm?y+1:y;
    out.push({src:'kagaku',name,org:org?dec(org[1]).trim():'',start:`${y}-${pad(sm)}-${pad(sd)}`,end:`${ey}-${pad(em)}-${pad(ed)}`,venue:strip(m[4]),url:a?dec(a[1]):''});
  }
  save('kagaku',out);
}
// --- 医学書院 学会・研究会カレンダー
if(which==='all'||which==='igaku'){
  const out=[];
  for(let p=1;p<=94;p++){
    const {s,t}=await get(`https://www.igaku-shoin.co.jp/society?ccm_paging_p=${p}&ccm_order_by=&ccm_order_by_direction=`);
    if(s!==200) {console.log('stop',p,s);break;}
    const items=t.split('<div class="c-seminar-lists-inner">').slice(1);
    if(!items.length) break;
    for(const it of items){
      const dates=[...it.split('c-seminar-lists-block detail')[0].matchAll(/(\d{4})年(\d+)月(\d+)日/g)].map(x=>`${x[1]}-${pad(+x[2])}-${pad(+x[3])}`);
      const raw=strip(it.split('c-seminar-lists-block detail')[0]);
      const name=strip((it.match(/<span class="big">([\s\S]*?)<\/span>/)||[])[1]||'');
      const venue=strip((it.match(/icon-address">([\s\S]*?)<\/span>/)||[])[1]||'');
      const url=(it.match(/URL<\/h4>[\s\S]*?href="([^"]+)"/)||[])[1]||'';
      out.push({src:'igaku',name,start:dates[0]||'',end:dates[dates.length-1]||dates[0]||'',rawdate:raw,venue,url:dec(url)});
    }
    if(p%10===0) console.log('igaku page',p,out.length);
    await sleep(1500);
  }
  save('igaku',out);
}
// --- サイサチ
if(which==='all'||which==='saisachi'){
  const out=[]; const seen=new Set();
  for(let p=1;p<=15;p++){
    const {s,t}=await get(p===1?'https://saisachi.com/conference/':`https://saisachi.com/conference/page/${p}/`);
    if(s!==200) break;
    const body=strip(t.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,''));
    const re=/([^ ].{3,90}?) (20\d\d)年(\d+)月(\d+)日[～~]\s*(20\d\d)年(\d+)月(\d+)日 (.{0,60}?) (https?:\/\/\S+) Googleカレンダー登録/g;
    let m,n=0; while((m=re.exec(body))){ const name=m[1].replace(/^.*?(20\d\d年\d+月 )/,'').trim(); const k=name+m[2]+m[3]+m[4]; if(seen.has(k))continue; seen.add(k); n++;
      out.push({src:'saisachi',name,start:`${m[2]}-${pad(+m[3])}-${pad(+m[4])}`,end:`${m[5]}-${pad(+m[6])}-${pad(+m[7])}`,venue:m[8].trim(),url:m[9]}); }
    console.log('saisachi',p,n); if(!n) break; await sleep(1500);
  }
  save('saisachi',out);
}
// --- 日本母体胎児医学会 産科関連学術集会一覧はサイズが小さいので別途
// --- これからの学会.com 学会カレンダー
if(which==='all'||which==='kore'){
  const sm=(await get('https://korekaranogakkai.com/calendarlist-sitemap.xml')).t;
  const locs=[...sm.matchAll(/<loc>([^<]+)/g)].map(m=>m[1]).filter(x=>/calendarlist\/.+/.test(x));
  const out=[];
  for(const [i,u] of locs.entries()){
    const {s,t}=await get(u); if(s!==200) continue;
    const main=t.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'');
    const title=strip((main.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)||main.match(/<title>([\s\S]*?)<\/title>/)||[])[1]||'').replace(/ *[–|-] *これからの学会.*/,'');
    const txt=strip(main); const k=txt.indexOf(title,txt.indexOf('学会サーチ'));
    const seg=txt.slice(Math.max(0,txt.indexOf('登録期間')-700), txt.indexOf('大会サイトURL')+220);
    const url=(main.match(/大会サイトURL[\s\S]{0,300}?href="([^"]+)"/)||[])[1]||(seg.match(/大会サイトURL\s*(https?:\/\/\S+)/)||[])[1]||'';
    out.push({src:'kore',name:title,seg,url:dec(url)});
    if(i%50===0) {console.log('kore',i,locs.length); fs.writeFileSync(`${OUT}/kore.part.json`,JSON.stringify(out));}
    await sleep(1000);
  }
  save('kore',out);
}
