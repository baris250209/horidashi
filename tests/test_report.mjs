// 通知表の計算を試す（DOMの代わりに空オブジェクト）
import fs from 'node:fs';
const [appJs] = process.argv.slice(2);
const stub = () => new Proxy(function () {}, { get(t, p) { if (p === Symbol.toPrimitive) return () => ''; if (p === 'then') return undefined; if (p === 'length') return 0; return stub(); }, set() { return true; }, apply() { return stub(); } });
const doc = stub();
globalThis.document = new Proxy({}, { get(t, p) { if (p === 'querySelectorAll') return () => []; if (p === 'fonts') return undefined; return doc[p]; } });
globalThis.window = globalThis; globalThis.addEventListener = () => {}; globalThis.scrollTo = () => {};
globalThis.location = { hash: '' }; globalThis.history = { replaceState() {} };
new Function(fs.readFileSync(appJs, 'utf8'))();
const H = globalThis.__horidashi;
let fail = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };

const s = H.makeSample();
for (const p of ['year', 'y1', 'all']) {
  const r = H.computeReport(s, p);
  ok(r && r.rows.length === 6 && r.rows.every(x => x.g >= 1 && x.g <= 5), `サンプル ${p}: ${r.posts}件 ` + r.rows.map(x => x.s + x.g + '（' + x.d + '）').join(' / '));
  ok(r.words.length > 0, `口ぐせ ${p}: ` + r.words.map(w => w.w + '×' + w.c).join(' '));
  console.log('   ひとこと: ' + r.comment + ' / はんこ: ' + r.stamp.join(''));
}
// 連続日数と夜ふかしの手計算と照合
const d0 = new Date(2026, 4, 1, 23, 0);
const mk = (dayOff, h, text, replyTo = '') => ({ id: 'x' + dayOff + h, date: new Date(2026, 4, 1 + dayOff, h, 0), text, replyTo, isRT: false, m: { like: dayOff } });
const t = { owner: 'me', posts: [mk(0, 23, '会議が長い'), mk(1, 2, '会議の夢'), mk(2, 12, '@a 会議です', 'a'), mk(3, 12, '会議'), mk(5, 12, '休み'), mk(6, 1, '会議'), mk(7, 12, '@me スレッド', 'me')] };
const r = H.computeReport(t, 'all');
const row = n => r.rows.find(x => x.s === n);
ok(row('かいきん').d === '最長 4日連続', '連続日数（5/1〜5/4の4日）: ' + row('かいきん').d);
ok(row('せいかつ').d === '0〜5時のポストが 29%', '夜ふかし（7件中2件）: ' + row('せいかつ').d);
ok(row('なかよし').d === 'ポストの 14% が返信', '返信の割合（自分宛てスレッドは除く・7件中1件）: ' + row('なかよし').d);
ok(row('こくご').d === '23字（原稿用紙1枚分）', '書いた文字数（先頭の@は数えない・7件で23字）: ' + row('こくご').d);
ok(r.words[0] && r.words[0].w === '会議', '口ぐせの1位が「会議」: ' + JSON.stringify(r.words));
ok(r.busy && r.busy.n === 1, 'いちばん喋った日');
ok(H.computeReport({ owner: 'me', posts: t.posts.slice(0, 3) }, 'all') === null, '5件未満なら出さない');
console.log(fail ? `\n${fail} 件 失敗` : '\nすべて成功');
process.exit(fail ? 1 : 0);
