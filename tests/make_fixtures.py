"""テスト用の架空データ（アーカイブzip・英語CSV・日本語Shift_JIS CSV）を作る。実在の投稿は使わない。"""
import json, random, zipfile, io, base64, sys, os, datetime as dt

OUT = sys.argv[1]
random.seed(7)
EPOCH = 1288834974657

def snow(ms):
    return str(((ms - EPOCH) << 22) | random.randint(0, 4194303))

def tw_date(d):
    return d.strftime('%a %b %d %H:%M:%S +0000 %Y')

partners = [('test_alpha', 'テスト甲'), ('test_beta', 'テスト乙'), ('test_gamma', 'テスト丙'), ('test_delta', 'テスト丁')]
owner = 'test_owner'
now = dt.datetime(2026, 11, 18, 12, 0, tzinfo=dt.timezone.utc)
tweets = []
for i in range(60):
    d = now - dt.timedelta(days=random.randint(0, 300), hours=random.randint(0, 23), minutes=random.randint(0, 59))
    ms = int(d.timestamp() * 1000)
    tid = snow(ms)
    kind = i % 6
    t = {"edit_info": {}, "retweeted": False, "source": "", "id_str": tid, "id": tid,
         "created_at": tw_date(d), "favorite_count": str(random.randint(0, 900)), "retweet_count": str(random.randint(0, 80)),
         "entities": {"hashtags": [], "symbols": [], "user_mentions": [], "urls": []}, "lang": "ja"}
    if kind in (0, 1, 2):  # 返信
        p = partners[0] if kind == 0 else partners[1] if kind == 1 else random.choice(partners)
        lat_min = {'test_alpha': 3, 'test_beta': 240}.get(p[0], 60)
        parent_ms = ms - int(lat_min * 60000 * random.uniform(0.5, 1.5))
        text = f"@{p[0]} 返信のテスト{i}"
        t.update({"full_text": text, "in_reply_to_status_id_str": snow(parent_ms), "in_reply_to_status_id": "x",
                  "in_reply_to_screen_name": p[0], "in_reply_to_user_id_str": "1",
                  "display_text_range": ["0" if False else str(len(p[0]) + 2), str(len(text))]})
        t["entities"]["user_mentions"].append({"name": p[1], "screen_name": p[0], "indices": ["0", str(len(p[0]) + 1)], "id_str": "1", "id": "1"})
        t["favorite_count"] = str(random.randint(0, 20))
    elif kind == 3:  # リポスト
        p = random.choice(partners)
        text = f"RT @{p[0]}: 元のポスト{i}"
        t.update({"full_text": text, "display_text_range": ["0", str(len(text))], "favorite_count": "0"})
        t["entities"]["user_mentions"].append({"name": p[1], "screen_name": p[0], "indices": ["3", str(4 + len(p[0]))], "id_str": "1", "id": "1"})
    elif kind == 4:  # 引用＋本文メンション
        p = random.choice(partners)
        text = f"これは引用のテスト{i} @{partners[3][0]} https://t.co/abc"
        t.update({"full_text": text, "display_text_range": ["0", str(len(text))]})
        t["entities"]["urls"].append({"url": "https://t.co/abc", "expanded_url": f"https://twitter.com/{p[0]}/status/{snow(ms - 100000)}", "display_url": "x"})
        t["entities"]["user_mentions"].append({"name": partners[3][1], "screen_name": partners[3][0], "indices": [str(text.index('@')), str(text.index('@') + 1 + len(partners[3][0]))], "id_str": "1", "id": "1"})
    else:  # ふつうのポスト
        text = f"ふつうのポスト{i}"
        t.update({"full_text": text, "display_text_range": ["0", str(len(text))]})
    # 自分のスレッド（自己返信）
    if i == 59:
        t.update({"in_reply_to_screen_name": owner, "in_reply_to_status_id_str": snow(ms - 60000), "full_text": "スレッドの続き"})
    tweets.append({"tweet": t})

tweets_js = "window.YTD.tweets.part0 = " + json.dumps(tweets, ensure_ascii=False, indent=2)
account_js = "window.YTD.account.part0 = " + json.dumps([{"account": {"username": owner, "accountId": "1", "accountDisplayName": "テスト"}}], ensure_ascii=False)

buf = io.BytesIO()
with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('Your archive.html', '<html></html>')
    z.writestr('data/account.js', account_js)
    z.writestr('data/deleted-tweets.js', 'window.YTD.deleted_tweets.part0 = []')
    z.writestr('data/tweet-headers.js', 'window.YTD.tweet_headers.part0 = []')
    z.writestr('data/tweets.js', tweets_js)
    z.writestr('data/tweets_media/dummy.jpg', b'\xff\xd8' + os.urandom(2000), compress_type=zipfile.ZIP_STORED)
zbytes = buf.getvalue()
open(os.path.join(OUT, 'archive-test.zip'), 'wb').write(zbytes)

# 英語見出しのCSV
rows = ["Post id,Date,Post text,Post Link,Impressions,Likes,Engagements,Bookmarks,Shares,New follows,Replies,Reposts,Profile visits"]
for i in range(40):
    d = now - dt.timedelta(days=i * 3, hours=i % 24)
    pid = snow(int(d.timestamp() * 1000))
    txt = f'"CSVのポスト{i}、カンマ入り, ""引用符""入り"' if i % 5 == 0 else (f"@test_alpha CSV返信{i}" if i % 4 == 0 else f"CSVのポスト{i}")
    imp = random.randint(100, 50000)
    rows.append(f"{pid},\"{d.strftime('%a, %b %d, %Y %H:%M')}\",{txt},https://x.com/{owner}/status/{pid},{imp},{imp//60},{imp//25},{imp//300},{imp//900},{imp//2000},{imp//500},{imp//400},{imp//150}")
open(os.path.join(OUT, 'analytics-en.csv'), 'w', encoding='utf-8-sig', newline='').write("\r\n".join(rows) + "\r\n")

# 日本語見出し・Shift_JIS（Excelで保存し直した想定）
rows = ["ポストID,日付,ポスト本文,インプレッション数,いいね,返信,リポスト,ブックマーク,エンゲージメント率"]
for i in range(30):
    d = now - dt.timedelta(days=i * 5, hours=(i * 7) % 24)
    pid = snow(int(d.timestamp() * 1000))
    imp = random.randint(100, 20000)
    rows.append(f"{pid},{d.strftime('%Y/%m/%d %H:%M')},日本語のポスト{i},{imp},{imp//50},{imp//600},{imp//500},{imp//250},{round(100*(imp//50+imp//600)/imp,2)}%")
open(os.path.join(OUT, 'analytics-ja-sjis.csv'), 'wb').write(("\r\n".join(rows) + "\r\n").encode('cp932'))

for n in ['archive-test.zip', 'analytics-en.csv', 'analytics-ja-sjis.csv']:
    p = os.path.join(OUT, n)
    open(p + '.b64', 'w').write(base64.b64encode(open(p, 'rb').read()).decode())
    print(n, os.path.getsize(p))
