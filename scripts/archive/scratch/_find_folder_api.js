const fs = require('fs')
const s = fs.readFileSync(
  'C:/Users/13207/Desktop/NestEdu/scripts/archive/scratch/_zcat_teach.js',
  'utf8'
)

// Around folder delete warning
const anchor = '如果文件夹不为空'
const idx = s.indexOf(anchor)
console.log('anchor idx:', idx)
if (idx >= 0) {
  // search backwards for function definitions / API urls
  const chunk = s.slice(idx - 8000, idx + 3000)
  const urls = [...chunk.matchAll(/url:"([^"]+)"/g)].map((m) => m[1])
  console.log('urls near folder UI:', [...new Set(urls)].join('\n'))
  const paths = [...chunk.matchAll(/\/knowledge\/[a-z_/]+/g)].map((m) => m[0])
  console.log('paths:', [...new Set(paths)].join('\n'))
}

// Search for o5 function definition - delete API
let o5idx = s.indexOf('async function o5')
if (o5idx < 0) o5idx = s.indexOf('function o5(')
console.log('\no5 def:', o5idx)
if (o5idx >= 0) console.log(s.slice(o5idx, o5idx + 500))

// Search category save patterns in full file
for (const p of [
  '/knowledge/category/save',
  '/knowledge/category/add',
  '/knowledge/category/create',
  '/knowledge/category/edit',
  '/knowledge/category/delete',
  '/knowledge/category/del',
  '/knowledge/category/update',
  '/knowledge/category/rename',
]) {
  if (s.includes(p)) console.log('FOUND:', p)
}

// Find Ur({url: patterns with category
const re = /Ur\(\{url:"([^"]*category[^"]*)"/g
let m
const found = new Set()
while ((m = re.exec(s))) found.add(m[1])
console.log('\nUr category urls:', [...found].join('\n'))

const re2 = /zn\(\{url:"([^"]*category[^"]*)"/g
while ((m = re2.exec(s))) found.add(m[1])
console.log('all category urls:', [...found].join('\n'))
