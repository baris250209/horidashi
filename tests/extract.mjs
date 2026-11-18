// index.html の中のスクリプトを取り出して app.js に書く（テスト用）
import fs from 'node:fs';
const [html, out] = process.argv.slice(2);
const h = fs.readFileSync(html, 'utf8');
fs.writeFileSync(out, h.slice(h.indexOf('<script>') + 8, h.lastIndexOf('</script>')));
