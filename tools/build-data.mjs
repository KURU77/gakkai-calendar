// 収集結果を統合して events.json を作る
// 使い方: node tools/build-data.mjs <収集データのフォルダ>
//  - 委員会・セミナー・講習会・展示会などを除く
//  - 大会の公式URLが不明なものは、学会の公式サイト、それも無ければ検索へのリンクにして区別する
//  - 分野・種別・地域を判定し、重複をまとめる
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = process.argv[2];
const read = (n) => { try { return JSON.parse(fs.readFileSync(path.join(dir, n + '.json'), 'utf8')); } catch { return []; } };
const curated = JSON.parse(fs.readFileSync(path.join(here, 'curated.json'), 'utf8')).map((e) => ({ ...e, src: 'curated' }));
const FROM = '2026-01-01';

const z2h = (s) => String(s || '').replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/　/g, ' ');
const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();

// ---- 除外
const NOT_MEETING = /委員会|講習会|勉強会|キャリア|招待|材料展|展 主催|セミナー|Seminar|講座|チュートリアル|入門|スクール|School|夏の学校|見学会|説明会|交流会|懇親会|コンテスト|認定試験|検定|研修|ハンズオン|実習|市民公開|一般公開|公開講演|ウェビナー|Webinar|展示会|見本市|EXPO|Expo|エキスポ|フェア|ジャパン展|高校生|中高生|小学生|子ども|キャンプ|大学\d{4}|第\d+回講義|テクノ|ショー|SHOW|Week$|ウィーク$|募集|表彰|授賞式|総会のお知らせ|社員総会|臨時総会|定時総会/;
const MEETING_WORD = /学会|大会|年会|学術集会|学術講演|講演会|討論会|研究発表|総会|シンポジウム|研究会|フォーラム|Conference|Symposium|Congress|Meeting|Workshop|ワークショップ/i;
const OVERSEAS = /韓国|台湾|米国|アメリカ|ドイツ|フランス|英国|イギリス|イタリア|スペイン|シンガポール|ベトナム|オーストラリア|カナダ|ハワイ|マレーシア|インドネシア|フィリピン|オランダ|スイス|オーストリア|ソウル|釜山|台北|高雄|上海|北京|香港|バンコク|ロンドン|パリ|ウィーン|ベルリン|ニューヨーク|サンフランシスコ|シカゴ|ボストン|シドニー|メルボルン|Korea|Taiwan|USA|U\.S\.A|Germany|France|Italy|Spain|China|Thailand|Singapore|Canada|Australia|Hawaii|\bUK\b/;

// ---- 分野（上から順に判定）
const RULES = [
  ['dent', '歯学', /歯(?!車)|口腔|顎|咬合|補綴|インプラント/],
  ['pharm', '薬学', /薬学|薬剤|医薬品|薬物動態|TDM|臨床薬|医療薬|生薬|創薬|薬理|製剤|くすり/],
  ['nurse', '看護', /看護|助産|保健師|ケアマネ|訪問看護/],
  ['nurse', 'リハビリ・療法', /理学療法|作業療法|言語聴覚|リハビリテーション|義肢装具|柔道整復|鍼灸|あん摩/],
  ['nurse', '検査・放射線技術', /臨床検査技師|放射線技師|放射線技術|医学検査|臨床工学|細胞検査士|視能/],
  ['nurse', '栄養', /栄養士|臨床栄養|栄養治療|栄養改善|病態栄養|静脈経腸/],
  ['info', '人工知能', /人工知能|機械学習|言語処理|ディープラーニング|\bAI\b|JSAI|ロボカップ/],
  ['info', '情報・通信', /情報処理学会|電子情報通信|情報学|情報科学|ソフトウェア|コンピュータ|プログラミング|光ネットワーク|セキュリティ|進化計算|暗号|データベース|データ工学|ヒューマンインタフェース|ヒューマンインターフェース|FIT20|DICOMO|画像の認識|VR学会|バーチャルリアリティ|映像情報メディア|図書館情報|情報知識|医療情報/],
  ['edu', '心理学', /心理|認知科学|行動分析|カウンセリング|発達障害|臨床動作|感情/],
  ['edu', 'スポーツ', /体育|スポーツ|運動学|武道|ダンス|(?<!流)体力/],
  ['edu', '教育学', /教育工学|教育学|教育方法|教育社会|教科教育|保育|特殊教育|特別支援|科学教育|理科教育|数学教育|語教育|英語教育|大学教育|高等教育|工学教育|教師|教職|学校|カリキュラム|美術科教育/],
  ['soc', '法学', /(?<![療方技手航替])法学|法哲学|法社会|私法|公法|刑法|民事訴訟|労働法/],
  ['soc', '政治・国際', /政治学|国際政治|行政学|国際関係|公共政策|国際開発|平和学/],
  ['soc', '経済学', /経済学|経済理論|金融学|財政|行動経済|環境経済|農業経済|計量経済/],
  ['soc', '経営・会計', /経営|会計|マーケティング|組織学会|商業|ファイナンス|労務|観光/],
  ['soc', '社会学・福祉', /社会学|社会福祉|地域福祉|社会政策|メディア学会|マス・コミュニケーション|ジェンダー|人類学|民俗|社会情報/],
  ['soc', '地理・都市', /人文地理|日本地理学|地理学会|都市学|地域学/],
  ['hum', '言語・文学', /言語学|日本語学|語学|語用論|言語科学|文学|英文|独文|仏文|国語|音声学|通訳|翻訳|比較文/],
  ['hum', '哲学・宗教', /哲学|倫理|宗教|美学|思想/],
  ['hum', '歴史・考古', /歴史|(?<!環境)史学|考古|日本史|西洋史|東洋史/],
  ['hum', '芸術・デザイン', /音楽学|美術|演劇|映像学|(?<!腸内|エコ|材料)デザイン|芸術|映画/],
  ['eng', '建築・土木', /建築|土木|都市計画|地盤|コンクリート|構造工学|橋梁|トンネル|防災|地震工学|耐震|空気調和|衛生工学|水環境|廃棄物|自然災害/],
  ['eng', '機械・ロボット', /機械学会|機械|ロボット|精密工学|自動車|トライボロジー|伝熱|流体|ターボ|塑性加工|溶接|計測自動制御|制御|振動|生産|設計工学|可視化|ガスタービン/],
  ['eng', '電気・電子', /電気学会|電気|電子|半導体|照明|磁気|プラズマ|超電導|超伝導|パワーエレ|エレクトロニクス|光学|レーザ/],
  ['eng', '材料・金属', /材料|マテリアル|金属|鉄鋼|セラミック|高分子|ゴム|繊維|表面|腐食|防食|複合|ガラス|粉体|粉末|顕微鏡|炭素|薄膜|真空/],
  ['eng', '化学工学・エネルギー', /化学工学|エネルギー|原子力|電池|水素|燃料|石油|燃焼|触媒|環境工学|資源|ガス/],
  ['eng', '航空宇宙・船舶', /航空|宇宙工学|宇宙技術|ロケット|船舶|海洋工学|造船|交通|鉄道/],
  ['eng', '人間工学・医工学', /人間工学|生体医工学|医工学|医用|感性工学|福祉工学|ライフサポート|バイオメカニズム/],
  ['life', '農学・獣医', /(?<!経済|業)農学|農業(?!経済)|農芸|作物|育種|園芸|畜産|獣医|森林|林学|水産|土壌|造園|肥料|植物病理|応用動物|昆虫|雑草|草地|造園|蚕糸|木材/],
  ['life', '食品', /食品|栄養・食糧|調理|醸造|食物繊維|栄養学|食生活|家政/],
  ['life', '生物学', /(?<!古)生物|生化学|分子生物|細胞生物|ゲノム|遺伝学|進化|生態|動物学|植物|微生物|発生|バイオ|タンパク質|蛋白質|酵素|糖質|脂質|生理学会|霊長類|哺乳類|鳥学|魚類/],
  ['sci', '数学・統計', /数学|統計|応用数理|計算力学|オペレーションズ/],
  ['sci', '物理学', /物理|高圧|熱測定|放射光|中性子|加速器|結晶|分光/],
  ['sci', '化学', /(?<![硬老])化学|イオン液体|吸着|ゼオライト|希土類|酸化反応|錯体|有機|無機|質量分析|コロイド|界面|クロマトグラフィー|光化学/],
  ['sci', '地球・宇宙', /地質|地球|古生物|地震|火山|気象|海洋|天文|測地|測位|活断層|物理探査|古生物|第四紀|地熱|リモートセンシング|雪氷|水文|陸水|地形|鉱物/],
];
const MED = [
  ['がん・腫瘍', /がん|癌|腫瘍|肉腫|骨髄腫|リンパ腫|乳腺|緩和/],
  ['循環器', /循環器|心臓|心血管|不整脈|動脈|血管|高血圧|脳卒中|心不全|心エコー|超音波心/],
  ['消化器', /消化器|肝臓|肝胆膵|胃|大腸|食道|内視鏡|膵臓|胆道|肛門/],
  ['呼吸器', /呼吸器|肺|結核|気管|睡眠/],
  ['腎・泌尿器', /腎|透析|泌尿器|排尿|アンドロロジー/],
  ['内分泌・代謝', /糖尿病|内分泌|甲状腺|肥満|動脈硬化|骨代謝|痛風|代謝/],
  ['血液・免疫・感染', /血液|輸血|造血|血栓|免疫|化学療法|細胞療法|アレルギー|リウマチ|感染|ウイルス|細菌|真菌|寄生虫|臨床微生物|移植/],
  ['小児・周産期', /小児|新生児|周産期|胎児|産科|婦人科|生殖|母性|女性医学|思春期|更年期/],
  ['脳・神経・精神', /脳|神経|精神|てんかん|認知症|老年精神|児童青年|頭痛|自律神経|司法精神|ストレス|うつ/],
  ['外科系', /外科|整形|脊椎|脊髄|股関節|膝|肩関節|手外科|足の|関節|骨折|骨粗鬆|形成外科|美容|ヘルニア|創傷|褥瘡|運動器/],
  ['感覚器・皮膚', /眼|網膜|緑内障|角膜|白内障|耳鼻|咽喉|頭頸部|めまい|聴覚|嚥下|皮膚|研究皮膚/],
  ['救急・麻酔・集中治療', /救急|麻酔|集中治療|ペインクリニック|蘇生|災害医|中毒|熱傷/],
  ['画像・病理・検査', /放射線|医学放射|画像|核医学|超音波|病理|細胞学|臨床検査|臨床細胞|磁気共鳴|IVR|インターベンショナル/],
  ['公衆衛生・社会医学', /公衆衛生|老化|疫学|産業衛生|産業医|衛生学|医史|医学教育|医療安全|医療の質|医療マネジメント|病院|プライマリ|総合診療|在宅|老年|高齢|地域医療|医療社会|遠隔/],
  ['東洋医学・統合医療', /東洋医学|漢方|統合医療|温泉|ホメオパシー/],
  ['基礎医学', /解剖|生理|生化|薬理|遺伝|再生医療|人類遺伝|法医|先天異常|平滑筋|人工臓器/],
  ['内科一般', /内科/],
];
const MEDICAL_HINT = /医学|医療|臨床|診療|内科|外科|疾患|病|治療|手術/;

const STRONG_MED = /医学|医療|臨床|診療|内科|外科|疾患/;
const FIRST = new Set(['dent', 'pharm', 'nurse']);
function byRules(text, only) {
  for (const [f, sf, re] of RULES) if (only(f) && re.test(text)) return [f, sf];
  return null;
}
function byMed(text) {
  for (const [sf, re] of MED) if (re.test(text)) return ['med', sf];
  return null;
}
function classifyText(text, medical) {
  const first = byRules(text, (f) => FIRST.has(f));
  if (first) return first;
  // 医学系カレンダー由来や臨床の語を含むものは、医学の語彙を先に当てる
  if (medical || STRONG_MED.test(text)) { const m = byMed(text); if (m) return m; }
  return byRules(text, (f) => !FIRST.has(f)) || (medical ? byMed(text) : null);
}
function classify(name, org, src, area) {
  const medical = src === 'igaku' || area === '医学関連';
  const r = classifyText(name, medical) || (org ? classifyText(org, medical) : null);
  if (r) return r;
  if (medical || STRONG_MED.test(name)) return ['med', 'その他の医学'];
  if (src === 'saisachi') return ['life', '生物学'];
  if (src === 'kagaku' || area === '理学・工学') return ['eng', 'その他の工学'];
  return ['soc', 'その他'];
}

function typeOf(n) {
  if (/国際|International|Congress of|World|Asia|Pacific|Asian|\bI[A-Z]{2,}20\d\d/.test(n)) return '国際会議';
  if (/地方会|支部|地区|ブロック|連合大会|北海道|東北|関東|甲信越|東海|北陸|近畿|関西|中国四国|中国・四国|中四国|四国|九州|沖縄|西日本|東日本/.test(n)) return '地方会・支部';
  if (/研究会|シンポジウム|フォーラム|ワークショップ|懇話会|Symposium|Forum|Workshop/i.test(n)) return '研究会・シンポジウム';
  return '全国大会';
}

const PREF = {
  '北海道・東北': /北海道|札幌|函館|旭川|帯広|青森|弘前|八戸|岩手|盛岡|宮城|仙台|秋田|山形|福島|郡山|いわき|東北大学|東北学院|東北福祉/,
  関東: /東京|千代田|新宿|渋谷|品川|港区|一橋講堂|有楽町|お台場|ビッグサイト|東京大学|早稲田|慶應|明治大学|日本大学|中央大学|立教|学習院|上智|大田区|江戸川|神奈川|横浜|パシフィコ|川崎|相模原|藤沢|箱根|千葉|幕張|柏|成田|埼玉|さいたま|大宮|川越|茨城|つくば|水戸|栃木|宇都宮|群馬|前橋|高崎|ライトキューブ/,
  中部: /新潟|朱鷺メッセ|富山|石川|金沢|福井|勝山|山梨|甲府|長野|松本|軽井沢|岐阜|静岡|浜松|沼津|三島|愛知|名古屋|豊田|豊橋|中京大学|名城大学|ウインクあいち|三重|津市|四日市/,
  近畿: /滋賀|大津|京都|同志社|立命館|大阪|グランキューブ|堺|吹田|兵庫|神戸|姫路|西宮|奈良|和歌山/,
  '中国・四国': /鳥取|米子|島根|松江|岡山|倉敷|広島|山口|下関|徳島|香川|高松|愛媛|松山|高知/,
  '九州・沖縄': /福岡|博多|北九州|久留米|アクロス|佐賀|長崎|熊本|大分|別府|宮崎|鹿児島|沖縄|那覇|宜野湾/,
};
function regionOf(v) {
  const s = z2h(v);
  if (!s) return '';
  for (const [r, re] of Object.entries(PREF)) if (re.test(s)) return r;
  if (/オンライン|Web開催|WEB開催|web開催|Zoom/i.test(s)) return 'オンライン';
  return '';
}

// ---- これからの学会.com の本文から日付などを取り出す
function parseKore(x) {
  const seg = z2h(x.seg || '');
  const m = seg.match(/大会開催期間\s*(20\d\d)年(\d{1,2})月(\d{1,2})日(?:\s*～\s*(?:(20\d\d)年)?(\d{1,2})月(\d{1,2})日)?/);
  if (!m) return null;
  const p = (n) => String(n).padStart(2, '0');
  const start = `${m[1]}-${p(m[2])}-${p(m[3])}`;
  const end = m[6] ? `${m[4] || m[1]}-${p(m[5])}-${p(m[6])}` : start;
  const venue = (seg.match(/会場\s*(.{1,50}?)\s*大会サイトURL/) || [])[1] || '';
  const org = (seg.match(/学会名\s*(.{2,40}?)\s*大会開催期間/) || [])[1] || '';
  const title = (seg.match(/大会名\s*(.{2,90}?)\s*学会名/) || [])[1] || '';
  const name = org && !norm(title).includes(norm(org)) ? `${org} ${title}` : title;
  const area = (seg.match(/分野\s*(医学関連|理学・工学|人文・社会科学)/) || [])[1] || '';
  return { ...x, name, start, end, venue, org, area };
}

const norm = (s) => z2h(s).toLowerCase().replace(/[\s・･,、。.．「」『』（）()\[\]【】\-‐―–—:：/]/g, '').replace(/一般社団法人|公益社団法人|特定非営利活動法人|ハイブリッド開催|現地開催|web開催/g, '');
const ord = (s) => (z2h(s).match(/第\s*(\d+)\s*回/) || [])[1] || '';
const bigrams = (s) => { const o = new Set(); for (let i = 0; i < s.length - 1; i++) o.add(s.slice(i, i + 2)); return o; };
function similar(a, b) {
  const key = (e) => norm(e.src === 'jams' ? e.org : e.name);
  const x = key(a), y = key(b);
  if (x === y || x.includes(y) || y.includes(x)) return true;
  if (ord(a.name) && ord(b.name) && ord(a.name) !== ord(b.name)) return false;
  const A = bigrams(x), B = bigrams(y); let c = 0; for (const g of A) if (B.has(g)) c++;
  return c / Math.min(A.size || 1, B.size || 1) >= 0.7;
}

// ---- 統合
// 日本医学会 分科会総会一覧（公式）
function parseJams() {
  let t = ''; try { t = fs.readFileSync(path.join(dir, 'jams_a.html'), 'utf8'); } catch { return []; }
  const p = (n) => String(n).padStart(2, '0');
  const out = [];
  for (const m of t.matchAll(/<dt class="name"[^>]*><a[^>]*>No\.\d+\s*([^<]+)<\/a><\/dt>\s*<dd class="dp">([\s\S]*?)<\/dd>/g)) {
    const live = m[2].replace(/<!--[\s\S]*?-->/g, '');
    const txt = z2h(live.replace(/<[^>]+>/g, ' ')).replace(/総会サイト/g, '');
    const d = txt.match(/(20\d\d)年(\d{1,2})月(\d{1,2})日[^～]*(?:～\s*(?:(20\d\d)年)?(\d{1,2})月(\d{1,2})日)?/);
    if (!d) continue;
    const start = `${d[1]}-${p(d[2])}-${p(d[3])}`;
    const end = d[6] ? `${d[4] || d[1]}-${p(d[5])}-${p(d[6])}` : start;
    const url = (live.match(/href="(https?:[^"]+)"/) || [])[1] || '';
    out.push({ src: 'jams', name: `${m[1].trim()} 総会・学術集会`, org: m[1].trim(), start, end, venue: clean((txt.split('／')[1] || '')), url });
  }
  return out;
}
// 学会名 → 学会公式サイト
const socMap = [...read('jams_soc'), ...read('societies')]
  .map(([n, u]) => [n.replace(/^(一般|公益)(社団|財団)法人\s*|^特定非営利活動法人/g, ''), u])
  .filter(([n]) => n.length >= 4)
  .sort((a, b) => b[0].length - a[0].length);
const societyUrl = (text) => { const t = norm(text); for (const [n, u] of socMap) if (t.includes(norm(n))) return u; return ''; };

const sources = [
  curated,
  parseJams(),
  read('igaku').map((e) => ({ ...e, name: clean(e.name), startOnly: true })),
  read('saisachi'),
  read('kagaku'),
  read('kore').map(parseKore).filter(Boolean),
];
const dead = new Set(read('dead'));
const stat = { input: 0, deadLink: 0, societyLink: 0, searchLink: 0, excluded: 0, overseas: 0, old: 0, badDate: 0, dup: 0 };
const kept = [];
const byStart = new Map();
for (const list of sources) for (const raw of list) {
  stat.input++;
  const e = { ...raw, name: clean(z2h(raw.name).replace(/\s*\(※.*?\)\s*$/, '').replace(/^20\d\d年\d+月 .*?\bTOP\s+/, '').replace(/&#\d+;/g, '〜')), venue: clean(z2h(raw.venue)) };
  if (dead.has(e.url)) { e.url = ''; stat.deadLink++; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.start || '') || !/^\d{4}-\d{2}-\d{2}$/.test(e.end || '') || e.end < e.start) { stat.badDate++; continue; }
  if (e.end < FROM) { stat.old++; continue; }
  if (e.src !== 'curated') {
    if (NOT_MEETING.test(e.name) || !MEETING_WORD.test(e.name + (e.src === 'igaku' ? '学会' : ''))) { stat.excluded++; continue; }
    if (OVERSEAS.test(e.venue)) { stat.overseas++; continue; }
  }
  const same = byStart.get(e.start) || [];
  const hit = same.find((k) => similar(k, e));
  if (hit) {
    stat.dup++;
    if (!hit.venue && e.venue) hit.venue = e.venue;
    if (!hit.org && e.org) hit.org = e.org;
    if (!hit.url && e.url) hit.url = e.url;
    if (hit.src === 'jams' && e.name.length > hit.name.length) hit.name = e.name;
    if (hit.startOnly && !e.startOnly) { hit.end = e.end; hit.startOnly = false; }
    continue;
  }
  same.push(e); byStart.set(e.start, same); kept.push(e);
}
const events = kept.map((e) => {
  const text = z2h(`${e.name} ${e.org || ''}`);
  const [f, sf] = classify(z2h(e.name), z2h(e.org), e.src === 'jams' ? 'igaku' : e.src, e.area);
  let u = e.url, l = '';
  if (!/^https?:\/\//.test(u || '')) {
    u = societyUrl(text);
    if (u) { l = 's'; stat.societyLink++; } else { u = 'https://www.google.com/search?q=' + encodeURIComponent(e.name); l = 'q'; stat.searchLink++; }
  }
  const o = {
    id: crypto.createHash('sha1').update(norm(e.name) + e.start).digest('hex').slice(0, 10),
    n: e.name, s: e.start, e: e.end, v: e.venue, u, f, sf, t: typeOf(e.name), r: regionOf(e.venue),
  };
  if (l) o.l = l;
  if (e.startOnly) o.x = 1;
  if (e.org) o.o = clean(z2h(e.org));
  return o;
}).sort((a, b) => (a.s < b.s ? -1 : a.s > b.s ? 1 : a.n < b.n ? -1 : 1));

const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
fs.writeFileSync(path.join(here, '..', 'events.json'), JSON.stringify({ updated: today, events }));
const by = (k) => events.reduce((m, e) => ((m[e[k]] = (m[e[k]] || 0) + 1), m), {});
console.log(stat);
console.log('events', events.length, 'upcoming', events.filter((e) => e.e >= today).length);
console.log(by('f'), by('t'), by('r'));
