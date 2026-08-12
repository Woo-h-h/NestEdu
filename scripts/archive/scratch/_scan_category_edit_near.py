import re
import sys
import requests

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

text = requests.get(
    "https://www.zcat.cn/assets/index-BbRqpAvN.js",
    timeout=120,
    headers={"Referer": "https://www.zcat.cn"},
).text

# category within 80 chars of edit in Ur({url:
for m in re.finditer(r'Ur\(\{url:"([^"]{0,80})"', text):
    url = m.group(1)
    if "edit" in url or "del" in url or "save" in url or "add" in url:
        if "know" in url or "categ" in url or "file" in url or "block" in url:
            print(url)

# split string patterns
for m in re.finditer(r'"([^"]*category[^"]*)"\+|"\+[^"]*category[^"]*"', text):
    print("concat", m.group(0)[:120])

# search category and edit within 100 char window
idx = 0
n = 0
while n < 20:
    idx = text.find("category", idx + 1)
    if idx < 0:
        break
    window = text[idx : idx + 100]
    if "edit" in window or "save" in window or "add" in window or "del" in window:
        print(f"\n@{idx}", window.replace("\n", " "))
        n += 1

# Search for knowledge detail component - folder create UI strings in unicode escapes
for s in ["\\u65b0\\u5efa", "\\u6587\\u4ef6\\u5939", "\\u6dfb\\u52a0"]:
    print(s, text.count(s))

# Find display_name field usage with parent_id
for m in re.finditer(r"display_name.{0,120}parent_id|parent_id.{0,120}display_name", text):
    print("disp+parent", m.group(0)[:180].replace("\n", " "))
