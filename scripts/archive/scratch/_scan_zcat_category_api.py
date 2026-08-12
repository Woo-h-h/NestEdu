import re
import sys
import requests

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

session = requests.Session()
session.headers.update({"User-Agent": "Mozilla/5.0", "Referer": "https://www.zcat.cn"})

# Fetch teach SPA index
index = session.get("https://www.zcat.cn/teach/", timeout=60).text
print("index len", len(index))
chunks = sorted(set(re.findall(r"/assets/([A-Za-z0-9_-]+\.js)", index)))
print("chunks from index", len(chunks))

terms = [
    "category/save",
    "category/add",
    "category/create",
    "category/edit",
    "category/delete",
    "category/del",
    "category/list",
    "新建文件夹",
    "parent_id",
]

hits = {}
for name in chunks:
    url = f"https://www.zcat.cn/assets/{name}"
    try:
        text = session.get(url, timeout=60).text
    except Exception as e:
        print("ERR", name, e)
        continue
    found = [t for t in terms if t in text]
    if found:
        hits[name] = (found, len(text))
        print("HIT", name, found, "len", len(text))

# Deep scan teach main bundle if present
for name in chunks:
    if "index" in name.lower() or "main" in name.lower():
        text = session.get(f"https://www.zcat.cn/assets/{name}", timeout=60).text
        more = re.findall(r'import\("\./assets/([^"]+)"\)', text)
        print("dynamic imports in", name, len(more))
        for sub in more[:30]:
            if sub in hits:
                continue
            try:
                st = session.get(f"https://www.zcat.cn/assets/{sub}", timeout=60).text
            except Exception:
                continue
            found = [t for t in terms if t in st]
            if found:
                print("SUB HIT", sub, found)

# Also try knowledge detail route chunk names from teach bundle list
teach_html = session.get(
    "https://www.zcat.cn/teach/knowledge/detail/10368", timeout=60
).text
print("detail html len", len(teach_html))
detail_chunks = sorted(set(re.findall(r"/assets/([A-Za-z0-9_-]+\.js)", teach_html)))
print("detail chunks", detail_chunks[:20])

for name in detail_chunks:
    if name in hits:
        continue
    text = session.get(f"https://www.zcat.cn/assets/{name}", timeout=60).text
    found = [t for t in terms if t in text]
    if found:
        print("DETAIL HIT", name, found)
