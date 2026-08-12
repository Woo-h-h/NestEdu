import re
import sys
import requests

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

session = requests.Session()
session.headers.update({"User-Agent": "Mozilla/5.0", "Referer": "https://www.zcat.cn"})

pages = [
    "https://www.zcat.cn/teach/knowledge/list",
    "https://www.zcat.cn/teach/knowledge/detail/10368",
    "https://www.zcat.cn/teach/knowledge/detail/10368?category_id=20895",
    "https://www.zcat.cn/knowledge",
    "https://www.zcat.cn/admin",
]

for page in pages:
    try:
        html = session.get(page, timeout=30).text
    except Exception as e:
        print(page, "ERR", e)
        continue
    chunks = sorted(set(re.findall(r"/assets/([A-Za-z0-9_-]+\.js)", html)))
    print(page, "chunks", chunks)

# download index and search split strings like category + "/edit"
text = session.get("https://www.zcat.cn/assets/index-BbRqpAvN.js", timeout=120).text
for pat in [
    r"category\"\+\"\/edit",
    r"category'/edit",
    r"category\+\"/edit",
    r'"/knowledge/"\+',
    r"knowledge/category",
    r"CategoryEdit",
    r"saveCategory",
    r"createCategory",
    r"addCategory",
    r"editCategory",
    r"delCategory",
    r"deleteCategory",
]:
    if re.search(pat, text):
        print("match", pat)

# brute: find '/edit' urls
edit_urls = sorted(set(re.findall(r'"/([a-z_/]+/edit)"', text)))
print("\n/edit urls count", len(edit_urls))
for u in edit_urls:
    if "know" in u or "categ" in u or "file" in u or "block" in u:
        print(" ", u)

# search parent_id + name together
for m in re.finditer(r"parent_id.{0,80}name", text):
    if "knowledge" in m.group(0) or "category" in m.group(0):
        print("parent+name", m.group(0)[:120])
