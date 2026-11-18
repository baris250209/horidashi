// index.html の中のスクリプトを、DOMの代わりの空オブジェクトで動かして、読み込み処理だけを試す
import fs from 'node:fs';
import path from 'node:path';
const [appJs, fixDir] = process.argv.slice(2);
const src = fs.readFileSync(appJs, 'utf8');

const stub = () => new Proxy(function () {}, {
  get(t, p) {
    if (p === Symbol.toPrimitive) return () => '';
    if (p === 'then') return undefined;
    if (p === 'length') return 0;
    return stub();
  },
  set() { return true; },
  apply() { return stub(); }
});
const doc = stub();
globalThis.document = new Proxy({}, {
  get(t, p) {
    if (p === 'querySelectorAll') return () => [];
    if (p === 'fonts') return undefined;
    return doc[p];
  }
});
globalThis.window = globalThis;
globalThis.addEventListener = () => {};
globalThis.scrollTo = () => {};
globalThis.location = { hash: '' };
globalThis.history = { replaceState() {} };
new Function(src)();
const H = globalThis.__horidashi;

let fail = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fail++; };
const file = n => new File([fs.readFileSync(path.join(fixDir, n))], n);

// 1. アーカイブzip
const zipEntries = await H.zipEntries(file('archive-test.zip'));
ok(zipEntries.length === 7, 'zipの中身を7件読めた: ' + zipEntries.map(e => e.name).join(', '));
const a = await H.loadFiles([file('archive-test.zip')]);
ok(a.posts.length === 62 && !a.posts.some(p => p.id === '1990000000000000001') && a.posts.some(p => p.id === '1990000000000000002') && a.posts.some(p => p.text === 'コミュニティ投稿'), '末尾の;・BOM付きでも読め、編集前の版を除き、コミュニティ投稿を足して62件: ' + a.posts.length);
ok(a.owner === 'test_owner', 'account.js から持ち主のIDを読めた: ' + a.owner);
ok(a.posts.every(p => p.date instanceof Date && !isNaN(p.date)), '全件の日時を読めた');
ok(a.posts.filter(p => p.isRT).length === 10, 'リポストを10件と判定: ' + a.posts.filter(p => p.isRT).length);
ok(a.names.test_alpha === 'テスト甲', '表示名を拾えた');
const ban = H.computeBanzuke(a, 'all');
ok(ban.length === 4 && !ban.some(e => e.h === 'test_owner'), '番付は相手4人・自分（スレッド）を含まない: ' + ban.map(e => e.h + ':' + e.score).join(' '));
const ex = ban.find(e => e.h === 'test_delta');
ok(ex && ex.mention >= 10, '本文のメンションを数えた（test_delta）: ' + (ex && ex.mention));
ok(ban.reduce((s, e) => s + e.quote, 0) === 11, '引用を11件数えた（編集後の版の1件を含む）: ' + ban.reduce((s, e) => s + e.quote, 0));
const ai = H.computeAisho(a, 'all');
const al = ai.find(e => e.h === 'test_alpha'), be = ai.find(e => e.h === 'test_beta');
ok(al && be && al.latMed < 10 && be.latMed > 120, '返信までの時間をポストIDから計算: alpha ' + (al && al.latMed.toFixed(1)) + '分 / beta ' + (be && be.latMed.toFixed(1)) + '分');
ok(al.s.speed > be.s.speed, '早く返す相手ほど即レスが高い');
ok(ai.every(e => e.met instanceof Date), '出会った日が全員に入った');
ok(H.snowflakeTime('1400000000000000000') instanceof Date && H.snowflakeTime('1400000000000000000').getUTCFullYear() === 2021, 'ポストIDから年を出せた（2021年のID）');

// 2. 英語見出しのCSV（カンマ・引用符入り、BOM付き）
const e = await H.loadFiles([file('analytics-en.csv')]);
ok(e.posts.length === 40, '英語CSVを40件読めた: ' + e.posts.length);
const info = e.csvInfo;
ok(['id', 'date', 'text', 'url', 'imp', 'like', 'eng', 'bm', 'share', 'follow', 'reply', 'rt', 'prof'].every(k => info.map[k] != null), '英語の列をすべて対応づけた: ' + JSON.stringify(info.map));
ok(e.posts.some(p => p.text.includes('"引用符"入り') && p.text.includes(',')), '引用符とカンマ入りの本文を正しく読めた');
ok(e.posts.every(p => p.date && !isNaN(p.date)), '英語の日付（Mon, Nov 10, 2025 12:00）を読めた');
ok(e.posts.filter(p => p.replyTo === 'test_alpha').length === 8, '@で始まる本文を返信と判定: ' + e.posts.filter(p => p.replyTo === 'test_alpha').length);
ok(typeof e.posts[0].m.imp === 'number', 'インプを数字で読めた');

// 3. 日本語見出し・Shift_JIS
const j = await H.loadFiles([file('analytics-ja-sjis.csv')]);
ok(j.posts.length === 30, 'Shift_JISのCSVを30件読めた: ' + j.posts.length);
ok(j.posts[0].text.startsWith('日本語のポスト'), '文字化けしていない: ' + j.posts[0].text);
ok(['id', 'date', 'text', 'imp', 'like', 'reply', 'rt', 'bm'].every(k => j.csvInfo.map[k] != null), '日本語の列を対応づけた: ' + JSON.stringify(j.csvInfo.map));
ok(j.csvInfo.map.eng == null, 'エンゲージメント率をエンゲージ数と取り違えない');
ok(j.posts.every(p => p.date && p.date.getFullYear() >= 2024), '2026/11/18 12:00 形式の日付を読めた');

// 4. アーカイブとCSVを一緒に読むと、同じIDはまとまる
const both = await H.loadFiles([file('archive-test.zip'), file('analytics-en.csv')]);
ok(both.posts.length === 102 && both.kinds.join() === 'archive,csv', '2種類を一緒に読めた: ' + both.posts.length + '件 ' + both.kinds);

// 5. サンプル
const s = H.makeSample();
const sa = H.computeAisho(s, 'all');
ok(sa.length >= 3, 'サンプルで相性ベスト3が出る: ' + sa.slice(0, 3).map(x => x.name + ' ' + x.score + '%').join(' / '));

console.log(fail ? `\n${fail} 件 失敗` : '\nすべて成功');
process.exit(fail ? 1 : 0);
