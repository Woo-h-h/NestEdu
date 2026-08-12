import re
import sys
import requests

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

text = requests.get(
    "https://www.zcat.cn/assets/index-BbRqpAvN.js",
    timeout=120,
    headers={"Referer": "https://www.zcat.cn"},
).text

for anchor in [
    "knowledge/detail",
    "KnowledgeDetail",
    "category_key",
    "custom_",
    "category_name",
    "parent_id",
    "children_ids",
    "新建",
    "添加文件夹",
    "createCategory",
    "saveCategory",
    "addCategory",
    "categoryId",
    "category_id",
]:
    idx = text.find(anchor)
    if idx < 0:
        continue
    print(f"\n=== first {anchor} @ {idx} ===")
    print(text[max(0, idx - 200) : idx + 500].replace("\n", " ")[:650])

# Find all unique API paths under /knowledge
paths = sorted(set(re.findall(r'"/([a-z]+/[a-z_/]+)"', text)))
knowledge_related = [p for p in paths if "know" in p or "categ" in p or "catalog" in p]
print("\nALL knowledge-related paths:")
for p in knowledge_related:
    print(" ", p)

# Search dynamic import chunks containing Knowledge
imports = sorted(set(re.findall(r'import\("\./assets/([^"]+)"\)', text)))
kb_chunks = [c for c in imports if re.search(r"Knowledge|knowledge|Kb|Doc|Upload|File", c)]
print(f"\ndynamic chunks: {len(imports)}, kb-ish: {len(kb_chunks)}")
print("\n".join(kb_chunks[:40]))
