import re
import sys
import requests

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

text = requests.get(
    "https://www.zcat.cn/assets/index-BbRqpAvN.js",
    timeout=120,
    headers={"Referer": "https://www.zcat.cn"},
).text

for anchor in ["文件夹", "重命名", "删除文件夹", "children_ids", "category_id"]:
    idx = 0
    n = 0
    while n < 3:
        idx = text.find(anchor, idx + 1)
        if idx < 0:
            break
        ctx = text[max(0, idx - 250) : idx + 450]
        if anchor == "category_id" and "knowledge" not in ctx and "document" not in ctx:
            continue
        print(f"\n--- {anchor} @ {idx} ---")
        print(ctx.replace("\n", " ")[:650])
        n += 1

# Any POST url containing category without list
all_urls = sorted(set(re.findall(r'url:"(/[^"]+)"', text)))
cat_urls = [u for u in all_urls if "categ" in u.lower() or "folder" in u.lower() or "catalog" in u.lower()]
print("\nall category-ish urls:", cat_urls)

# search save with parent
for pat in ["parent_id", "knowledge_id", "category"]:
    pass

# broader: /knowledge/ anything
all_k = sorted(set(re.findall(r'"/knowledge/[^"]+"', text)))
print("\nquoted knowledge urls:", all_k)

# search API paths with save/add/create
save_urls = [u for u in all_urls if re.search(r"/(save|add|create|edit|delete|del|update)", u)]
print("\nsave/add urls sample:", save_urls[:80])
