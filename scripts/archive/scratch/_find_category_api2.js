const fs = require('fs')
const s = fs.readFileSync(
  'C:/Users/13207/Desktop/NestEdu/scripts/archive/scratch/_zcat_main.js',
  'utf8'
)
for (const needle of [
  'category/save',
  'category/add',
  'category/create',
  'category/edit',
  'category/del',
  'category_delete',
  'parent_id',
  'parent_category',
]) {
  const idx = s.indexOf(needle)
  if (idx >= 0) {
    console.log('---', needle, '---')
    console.log(s.slice(Math.max(0, idx - 120), idx + 200).replace(/\s+/g, ' '))
  }
}
