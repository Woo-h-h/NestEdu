import re
import sys
import requests

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

base = "https://www.zcat.cn/assets/"
chunk = requests.get(base + "page-D2YQaToT.js", timeout=120).text
print("chunk len", len(chunk))

for term in [
    "document/file",
    "document/text",
    "document/edit",
    "file/upload",
    "knowledge_id",
    "category_id",
    "category_key",
    "FormData",
    "append(",
    "参数",
]:
    print(term, chunk.count(term))

urls = sorted(set(re.findall(r'"/(?:knowledge|file)/[a-z_/]+"', chunk)))
print("urls:", urls)

for term in ["document/file", "file/upload", "knowledge/document"]:
    idx = 0
    n = 0
    while n < 5:
        i = chunk.find(term, idx)
        if i < 0:
            break
        print(f"\n--- {term} at {i} ---")
        print(chunk[max(0, i - 300) : i + 500])
        idx = i + 1
        n += 1

# all append field names in FormData blocks
for m in re.finditer(r'append\("([^"]+)"', chunk):
    fields = []
for m in re.finditer(r'\.append\("([^"]+)"', chunk):
    pass
fields = re.findall(r'\.append\("([^"]+)"', chunk)
from collections import Counter
print("append fields:", Counter(fields).most_common(20))

# Ur/zn post bodies
for m in re.finditer(r'Ur\(\{url:"([^"]+)"[^}]{0,200}', chunk):
    print("Ur:", m.group()[:250])
for m in re.finditer(r'va\.post\("([^"]+)"', chunk):
    print("post:", m.group())
