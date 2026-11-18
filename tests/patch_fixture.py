"""テスト用zipに、本物のアーカイブにある形を足す：末尾の ; と BOM、編集前後の2版、community-tweet.js"""
import zipfile, json, sys, os, io
src = sys.argv[1]
z = zipfile.ZipFile(src)
files = {n: z.read(n) for n in z.namelist()}
z.close()
t = files['data/tweets.js'].decode('utf-8')
arr = json.loads(t[t.index('['):])
base = arr[-2]['tweet']
a = dict(base); b = dict(base)
a.update({"id_str": "1990000000000000001", "id": "1990000000000000001", "full_text": "編集前の版", "edit_info": {"initial": {"editTweetIds": ["1990000000000000001", "1990000000000000002"]}}})
b.update({"id_str": "1990000000000000002", "id": "1990000000000000002", "full_text": "編集後の版", "edit_info": {"edit": {"initialTweetId": "1990000000000000001", "editControlInitial": {"editTweetIds": ["1990000000000000001", "1990000000000000002"]}}}})
arr += [{"tweet": a}, {"tweet": b}]
files['data/tweets.js'] = ('﻿window.YTD.tweets.part0 = ' + json.dumps(arr, ensure_ascii=False) + ';\n').encode('utf-8')
dup = arr[0]['tweet']
new = dict(arr[5]['tweet']); new.update({"id_str": "1990000000000000009", "id": "1990000000000000009", "full_text": "コミュニティ投稿", "community_id": "1"})
files['data/community-tweet.js'] = ('window.YTD.community_tweet.part0 = ' + json.dumps([{"tweet": dup}, {"tweet": new}], ensure_ascii=False) + ';').encode('utf-8')
buf = io.BytesIO()
with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as out:
    for n, d in files.items():
        out.writestr(n, d)
open(src, 'wb').write(buf.getvalue())
print('patched', len(files), 'files')
