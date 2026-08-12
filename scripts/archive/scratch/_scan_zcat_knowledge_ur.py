import re
import sys
import requests

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

text = requests.get(
    "https://www.zcat.cn/assets/index-BbRqpAvN.js",
    timeout=120,
    headers={"Referer": "https://www.zcat.cn"},
).text

# Find Ur({url:"...",data:...}) blocks mentioning knowledge_id
for m in re.finditer(r'Ur\(\{url:"([^"]+)",data:([^}]{0,300})', text):
    url, data = m.group(1), m.group(2)
    if "knowledge" in data or "category" in data or "parent" in data:
        print(url, "=>", data[:200])

print("\n--- zn with knowledge ---")
for m in re.finditer(r'zn\(\{url:"([^"]+)"[^}]{0,200}', text):
    block = m.group(0)
    if "knowledge" in block or "category" in block:
        print(block[:250])

# si( hooks - swr fetchers
for m in re.finditer(r'si\(\{url:"([^"]+)"[^}]{0,200}', text):
    block = m.group(0)
    if "knowledge" in block or "category" in block:
        print("si", block[:250])

# search knowledge_id near Ur
idx = 0
n = 0
while n < 20:
    idx = text.find("knowledge_id", idx + 1)
    if idx < 0:
        break
    ctx = text[max(0, idx - 120) : idx + 180]
    if "Ur(" in ctx or "zn(" in ctx or "va.post" in ctx or 'url:"' in ctx:
        print(f"\n--- knowledge_id @ {idx} ---")
        print(ctx.replace("\n", " ")[:350])
        n += 1
