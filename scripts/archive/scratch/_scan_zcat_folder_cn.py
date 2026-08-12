import sys
import requests

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

text = requests.get(
    "https://www.zcat.cn/assets/index-BbRqpAvN.js",
    timeout=120,
    headers={"Referer": "https://www.zcat.cn"},
).text

idx = 0
n = 0
while n < 10:
    idx = text.find("文件夹", idx + 1)
    if idx < 0:
        break
    print(f"\n--- 文件夹 #{n+1} @ {idx} ---")
    print(text[max(0, idx - 350) : idx + 550].replace("\n", " ")[:850])
    n += 1
