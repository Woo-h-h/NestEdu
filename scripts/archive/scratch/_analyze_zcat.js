const fs = require('fs')
const s = fs.readFileSync('C:/Users/13207/Desktop/NestEdu/_zcat_main.js', 'utf8')

const pats = [
  '/knowledge/document/text',
  '/knowledge/document/file',
  '/knowledge/document/edit',
  '/knowledge/document/list',
  '/file/upload',
  'tag:"knowledge"',
  "tag:'knowledge'",
  'tag","knowledge',
  'upload/intake',
  'category_key',
  'category_id',
  'knowledge_id',
  'type_id',
  'file_name',
  'file_id',
  'file_url',
]

for (const p of pats) {
  const c = s.split(p).length - 1
  if (c > 0) console.log(`${p}: ${c}`)
}

console.log('\n--- tag knowledge contexts ---')
let i = -1,
  n = 0
while ((i = s.indexOf('knowledge', i + 1)) !== -1 && n < 40) {
  const ctx = s.slice(Math.max(0, i - 100), i + 200)
  if (/upload|FormData|file\/upload|category_id|document/i.test(ctx)) {
    console.log('---')
    console.log(ctx.replace(/\s+/g, ' '))
    n++
  }
}

console.log('\n--- file/upload contexts ---')
i = -1
n = 0
while ((i = s.indexOf('/file/upload', i + 1)) !== -1 && n < 8) {
  console.log('---')
  console.log(s.slice(Math.max(0, i - 300), i + 500).replace(/\s+/g, ' '))
  n++
}

console.log('\n--- document/text contexts ---')
i = -1
n = 0
while ((i = s.indexOf('/knowledge/document/text', i + 1)) !== -1 && n < 5) {
  console.log('---')
  console.log(s.slice(Math.max(0, i - 200), i + 400).replace(/\s+/g, ' '))
  n++
}
