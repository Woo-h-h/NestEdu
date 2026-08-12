const fs = require('fs')
const s = fs.readFileSync(
  'C:/Users/13207/Desktop/NestEdu/scripts/archive/scratch/_zcat_main.js',
  'utf8'
)

// Find all /knowledge/* paths
const paths = [...new Set(s.match(/\/knowledge\/[a-zA-Z0-9_/]+/g) || [])].sort()
console.log('knowledge paths:', paths.join('\n'))

// Search broader patterns
for (const needle of [
  'knowledge/category',
  'category_name',
  'parent_id',
  'custom_',
  'saveCategory',
  'add_category',
  'category_save',
  'category_add',
  'category_create',
  'category_edit',
  'category_delete',
  'category_del',
  '新建',
  '文件夹',
]) {
  const count = s.split(needle).length - 1
  if (count > 0 && count < 100) console.log(needle + ':', count)
}

// Find functions near category/list
const idx = s.indexOf('/knowledge/category/list')
if (idx >= 0) {
  console.log('\n--- context around category/list ---')
  console.log(s.slice(idx - 500, idx + 2000).replace(/\s+/g, ' ').slice(0, 2500))
}
