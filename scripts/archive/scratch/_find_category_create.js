const fs = require('fs')
const s = fs.readFileSync(
  'C:/Users/13207/Desktop/NestEdu/scripts/archive/scratch/_zcat_teach.js',
  'utf8'
)

for (const needle of [
  '新建文件夹',
  '新建分类',
  '添加文件夹',
  'category/list',
  'category/save',
  'category/add',
  'category/create',
  'category/edit',
  'category/delete',
]) {
  let idx = 0
  let n = 0
  while ((idx = s.indexOf(needle, idx + 1)) >= 0 && n < 2) {
    if (needle.includes('文件夹') || needle.includes('分类') || needle.includes('category/')) {
      console.log('---', needle, '@', idx, '---')
      console.log(s.slice(Math.max(0, idx - 300), idx + 500).replace(/\s+/g, ' ').slice(0, 700))
    }
    n++
  }
}

const re = /['"](\/api\/[^'"]*category[^'"]*)['"]/g
const paths = new Set()
let m
while ((m = re.exec(s))) paths.add(m[1])
console.log('\napi category paths:\n', [...paths].sort().join('\n'))
