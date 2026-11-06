// 学会公式サイトを巡回して大会の候補を抽出する
// 使い方: node tools/crawl-societies.mjs <保存先フォルダ>  → <保存先>/review.txt に未収録の候補を出力
import fs from 'fs';
const OUT=process.argv[2];
const UA={headers:{'User-Agent':'Mozilla/5.0 (compatible; conference-calendar-research)'}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const pad=n=>String(n).padStart(2,'0');
const z2h=s=>s.replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xFEE0));
const strip=h=>z2h(h.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' '));
async function get(u){ try{ const r=await fetch(u,{...UA,signal:AbortSignal.timeout(15000)}); if(!/html|text/.test(r.headers.get('content-type')||'html')) return {s:415,t:''}; const b=Buffer.from(await r.arrayBuffer()); if(b.length>3e6) return {s:413,t:''}; let t=new TextDecoder('utf-8').decode(b); const cs=((r.headers.get('content-type')||'').match(/charset=([\w-]+)/i)?.[1])||t.slice(0,3000).match(/charset=["']?([\w-]+)/i)?.[1]||'utf-8'; if(/jis/i.test(cs)) t=new TextDecoder('shift_jis').decode(b); else if(/euc/i.test(cs)) t=new TextDecoder('euc-jp').decode(b); return {s:r.status,t,u:r.url}; }catch(e){return {s:0,t:''}} }
const links=(html,base)=>{const o=[];for(const m of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)){let u;try{u=new URL(m[1].replace(/&amp;/g,'&'),base).href}catch{continue} if(!/^https?:/.test(u))continue; o.push({u,a:strip(m[2]).trim()});}return o;};
const host=u=>{try{return new URL(u).hostname.replace(/^www\./,'')}catch{return ''}};
const SEED=new URL('./societies-seed.json',import.meta.url);
const list=JSON.parse(fs.readFileSync(SEED,'utf8')).slice(0,+process.env.LIMIT||undefined); console.log('targets',list.length);
const TODAY=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Tokyo'}); const LAST=(+TODAY.slice(0,4)+2)+'-12-31';
const KW=/大会|年次|学術集会|年会|総会|研究発表|講演会|学術講演|例会|行事|イベント|会合|催し|シンポジウム|meeting|conference|annual/i;
const DATE=/(20\d\d|令和\s*\d+)\s*[年./]\s*(\d{1,2})\s*[月./]\s*(\d{1,2})\s*日?\s*(?:[（(][^）)]{1,6}[）)])?\s*(?:[-‐―−–~～〜ー・、,]|から)?\s*(?:(?:(20\d\d)\s*年\s*)?(?:(\d{1,2})\s*月\s*)?(\d{1,2})\s*日?)?/g;
const GOOD=/大会|学術集会|年会|総会|研究発表会|例会|学術講演|講演会|討論会|シンポジウム|連合講演|フォーラム/;
const BAD=/締切|締め切|〆切|申込|受付|期限|応募|募集|投稿|公開日|更新|発行|掲載|刊行|理事会|委員会|選挙|公募|講習|セミナー|見学|表彰|スクール/;
const res=[],status=[]; let idx=0;
function save(){fs.writeFileSync(OUT+'/candidates.json',JSON.stringify(res));fs.writeFileSync(OUT+'/crawl_last_status.json',JSON.stringify(status));}
async function work(){ while(idx<list.length){ const [name,home]=list[idx++]; if(idx%50===0){console.log(idx,list.length,res.length);save();}
  const h=await get(home); const title=(h.t.match(/<title[^>]*>([^<]*)/i)||[])[1]?.trim().slice(0,50)||''; const nameOK=h.t.includes(name.replace(/^日本/,''))||h.t.includes(name);
  status.push([name,home,h.s,nameOK,title]); if(h.s!==200) continue;
  const base=h.u||home; const c=links(h.t,base).filter(l=>host(l.u)===host(base)&&KW.test(l.a)&&!/pdf$/i.test(l.u));
  const uniq=[...new Map(c.map(x=>[x.u,x])).values()].slice(0,6); const pages=[{u:base,t:h.t}];
  for(const x of uniq){ await sleep(700); const p=await get(x.u); if(p.s===200) pages.push({u:p.u||x.u,t:p.t}); }
  const seen=new Set();
  for(const p of pages){ const txt=strip(p.t);
    for(const m of txt.matchAll(DATE)){ let y=m[1]; if(/令和/.test(y)) y=2018+parseInt(y.replace(/\D/g,'')); y=+y; const mo=+m[2],d=+m[3]; if(mo<1||mo>12||d<1||d>31) continue;
      const start=`${y}-${pad(mo)}-${pad(d)}`; if(start<=TODAY||start>LAST) continue;
      const before=txt.slice(Math.max(0,m.index-80),m.index), after=txt.slice(m.index+m[0].length,m.index+m[0].length+60);
      if(!GOOD.test(before+after)) continue; if(BAD.test(before.slice(-20))) continue;
      if(seen.has(start)) continue; seen.add(start);
      res.push({society:name,nameOK,title,start,m:m[0].trim(),before,after,url:p.u}); } }
} }
await Promise.all(Array.from({length:8},work)); save();
console.log('done',res.length,'ok',status.filter(s=>s[2]===200).length,'of',status.length);

// ---- 確認用リスト: 既に events.json にある開始日＋学会の組み合わせは省く
const LABEL=/(会\s*期|日\s*時|日\s*程|開催日時?|期\s*日|開催期間|開催予定日|Date)\s*[:：]?\s*$/;
const NAME=/((?:第\s*\d+\s*回|20\d\d\s*年度?|令和\s*\d+\s*年度?)[^。、，,:：()（）「」\[\]■◆●]{0,38}?(?:全国大会|研究大会|学術大会|年次大会|春季大会|秋季大会|春季全国大会|秋季全国大会|学術集会|学術講演会|学術総会|研究発表会|講演大会|連合講演会|討論会|講演会|シンポジウム|総会|年会|大会|例会))/g;
const skipName=/社員総会|定時総会|通常総会|代議員|役員|評議員|理事|臨時総会|支部総会$/;
const norm=s=>s.replace(/[\s・･]/g,'');
const known=JSON.parse(fs.readFileSync(new URL('../events.json',import.meta.url),'utf8')).events;
const ordOf=s=>(s.match(/第\s*(\d+)\s*回/)||[])[1]||'';
const isKnown=(soc,name,start)=>known.some(e=>e.s===start&&(norm(e.n).includes(norm(soc).replace(/^日本/,''))||norm(e.n).includes(norm(name))||(ordOf(name)&&ordOf(name)===ordOf(e.n))));
const lines=[]; const seen2=new Set();
for(const x of res){ const label=LABEL.test(x.before.slice(-16)); const name0=[...x.before.matchAll(NAME)].map(m=>m[1]).pop(); let name=name0, tier=label&&name?'A':'';
  if(!name){ const a2=[...x.after.matchAll(NAME)].map(m=>m[1])[0]; if(a2&&x.after.indexOf(a2)<14){name=a2;tier='B';} }
  if(name&&!tier&&x.before.indexOf(name)+name.length>x.before.length-12) tier='B';
  if(!tier||skipName.test(name)) continue; const k=x.society+x.start; if(seen2.has(k)) continue; seen2.add(k);
  if(isKnown(x.society,name,x.start)) continue;
  lines.push([tier,x.society,name.replace(/\s+/g,' ').trim(),x.start,x.m,x.before.slice(-50),x.after.slice(0,50),x.url].join(' | '));
}
fs.writeFileSync(OUT+'/review.txt',lines.join('\n')+'\n');
console.log('review',lines.length);
