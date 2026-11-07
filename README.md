# 学会大会カレンダー

日本国内の学会大会を分野別に探し、大会名から公式ページへ移動できるカレンダーです。

公開ページ: https://kuru77.github.io/gakkai-calendar/

## できること

- **分野で絞り込む**: 7グループ（医療・健康／生命・農・食／理学・宇宙・地球／工学・情報／人文学／社会科学／教育・心理）と24分野、さらに分野ごとの細分野（例：法学なら憲法・行政法、民事法、刑事法、国際法など）
- **詳しく検索する**: 期間の指定、大会ページへ直接飛べるものだけ、終了日が分かるものだけ、並び順（開催日・名前・分野）。検索語は「A|B」でどちらか、「-語」で除外
- **公式ページへ移動する**: 大会名を押すと、そのまま公式ページが開きます
- **リスト・月カレンダー・学会一覧を切り替える**: 学会一覧では、大会日程が未発表の学会も分野別に探せます
- **種別・地域で絞り込む**: 全国大会／地方会・支部／研究会・シンポジウム／国際会議
- **検索する**: 学会名・大会名・会場
- **★を付ける**: 気になる大会に印を付け、まとめて `.ics` で書き出せます。同じ予定の二重登録を防ぐため、書き出し済みの大会には ✓ が付きます
- **自分で追加する**: 載っていない大会を、公式URLつきで登録できます（この端末のブラウザーにのみ保存）

iPhone では Safari で開き、「ホーム画面に追加」するとアプリとして使えます。

## 収録範囲の注意

**日本のすべての学会大会を網羅しているわけではありません。** 特に人文・社会系は横断的な情報源がなく、学会サイトを1つずつ巡回して集めているため、医学系より収録が少なくなっています。翌年度の日程をまだ発表していない学会も多くあります。

委員会、セミナー、講習会、展示会、市民公開講座は対象外です。

リンク先は次の3種類で、アプリの画面で区別しています。

| 表示 | リンク先 |
| --- | --- |
| 表示なし | 大会の公式ページ、または学会が案内するページ |
| 学会サイトへ移動 | 学会の公式サイト（大会ページは未確認） |
| 公式ページ不明・検索で開く | Google の検索結果 |

「終了日は公式で確認」と出る大会は、情報源に開始日しか載っていなかったものです。日程や会場は変更されることがあるので、参加前に公式ページで確認してください。

## データの出どころ

大会の名称、日程、会場、URLという事実情報だけを集めています。代表者名や連絡先は収録していません。

- 各学会の公式サイト（`tools/curated.json` に、ページの記載を確認して手入力）
- [日本医学会 分科会総会一覧](https://jams.med.or.jp/members-a/index.html)
- [医学書院 学会・研究会カレンダー](https://www.igaku-shoin.co.jp/society)
- [科学カレンダー（理工系）](https://www.kagaku.com/calendar.php)
- [サイサチ 学会情報](https://saisachi.com/conference/)
- [日本物理学会 学術的会合情報](https://www.jps.or.jp/keijiban/e-bulletin.php)
- [くろしお出版 学会・研究会情報](https://www.9640.jp/topics/gakkai/)
- [これからの学会.com 学会カレンダー](https://korekaranogakkai.com/)
- [有斐閣Online 学会予定一覧](https://yuhikaku.com/articles/-/58505)（法学系）
- [日本会計研究学会 会計関連学会の開催日程](https://jaa-net.jp/conference-network/eventschedule/)
- [日本農学会 加盟学協会一覧](https://ajass.jp/20_10.html)

## データの更新

`.cache/` を保存先にして実行します。

```bash
node tools/harvest.mjs .cache kagaku
node tools/harvest.mjs .cache igaku
node tools/harvest.mjs .cache saisachi
node tools/harvest-extra.mjs .cache
node tools/harvest-jams.mjs .cache
node tools/harvest-law.mjs .cache
node tools/crawl-societies.mjs .cache
```

`crawl-societies.mjs` は、`tools/societies-seed.json` の学会サイトを巡回し、未収録の候補を `.cache/review.txt` に出します。自動抽出には締切日などの誤りが混ざるので、文脈を読んで正しいものだけ `tools/curated.json` に追加します。

```bash
node tools/build-data.mjs .cache
node tools/check-links.mjs .cache
node tools/build-data.mjs .cache
```

動作確認は `node tools/serve.mjs` で起動し、http://localhost:8790/ を開きます。

分野の体系（グループ・分野・細分野）は `tools/taxonomy.mjs` で定義しています。

## ライセンス

MIT（アプリのコード）。収録情報の正確性は保証しません。
