import re
import sys
import requests

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

url = "https://www.zcat.cn/assets/index-BbRqpAvN.js"
text = requests.get(url, timeout=120, headers={"Referer": "https://www.zcat.cn"}).text
print("len", len(text))

# all knowledge paths
paths = sorted(set(re.findall(r"/knowledge/[a-zA-Z0-9_/]+", text)))
print("knowledge paths:\n", "\n".join(paths))

for needle in [
    "category/save",
    "category/add",
    "category/create",
    "category/edit",
    "category/delete",
    "category/del",
    "category/update",
    "category/rename",
    "新建文件夹",
    "新建分类",
    "createFolder",
    "saveCategory",
    "addCategory",
    "category_name",
    "parent_id",
    "children_ids",
    "custom_",
]:
    c = text.count(needle)
    if c:
        print(needle, c)

# Find Ur/zn calls with knowledge in url
for pat in [r'Ur\(\{url:"([^"]+)"', r'zn\(\{url:"([^"]+)"', r'va\.post\("([^"]+)"']:
    urls = sorted(set(re.findall(pat, text)))
    knowledge_urls = [u for u in urls if "knowledge" in u or "category" in u]
    print(f"\n{pat} knowledge urls ({len(knowledge_urls)}):")
    for u in knowledge_urls:
        print(" ", u)

# Context around 新建
for anchor in ["新建文件夹", "新建分类", "添加分类", "创建分类"]:
    idx = text.find(anchor)
    if idx >= 0:
        print(f"\n--- {anchor} @ {idx} ---")
        print(text[max(0, idx - 400) : idx + 800].replace("\n", " ")[:1200])

# Search parent_id near knowledge
idx = 0
n = 0
while n < 5:
    idx = text.find("parent_id", idx + 1)
    if idx < 0:
        break
    ctx = text[max(0, idx - 200) : idx + 300]
    if "knowledge" in ctx or "category" in ctx:
        print(f"\n--- parent_id knowledge ctx @ {idx} ---")
        print(ctx.replace("\n", " ")[:500])
        n += 1
