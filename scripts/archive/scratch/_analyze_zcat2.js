const fs = require('fs')
const s = fs.readFileSync('C:/Users/13207/Desktop/NestEdu/_zcat_main.js', 'utf8')

// Search file upload with knowledge tag
for (const needle of ['tag","knowledge', 'tag:"knowledge', "tag:'knowledge", 'tag","kb', 'knowledge","', 'append("knowledge_id"', 'append("category_id"']) {
  let i = -1
  let n = 0
  while ((i = s.indexOf(needle, i + 1)) !== -1 && n < 5) {
    console.log('\n===', needle, '@', i, '===')
    console.log(s.slice(Math.max(0, i - 250), i + 450).replace(/\s+/g, ' '))
    n++
  }
}

// knowledge detail drag upload - search teach/knowledge upload patterns
console.log('\n=== teach/knowledge upload search ===')
const re = /teach\/knowledge[^"']{0,80}/g
let m
const set = new Set()
while ((m = re.exec(s))) set.add(m[0])
console.log([...set].slice(0, 20).join('\n'))

// Search for upload with category_id in FormData context
console.log('\n=== FormData + category_id ===')
let idx = 0
let c = 0
while ((idx = s.indexOf('FormData', idx + 1)) !== -1 && c < 20) {
  const ctx = s.slice(idx, idx + 800)
  if (ctx.includes('category_id') || ctx.includes('knowledge_id')) {
    console.log('---')
    console.log(ctx.replace(/\s+/g, ' ').slice(0, 700))
    c++
  }
}

// Search document/file anywhere
console.log('\ndocument/file count:', s.split('document/file').length - 1)

// Search for knowledge file manager upload - look for accepted file types near knowledge
const ku = s.match(/ku=\[[^\]]+\]/)
console.log('\nku extensions:', ku ? ku[0].slice(0, 500) : 'not found')

// Find all /knowledge/ API paths
const paths = [...new Set(s.match(/\/knowledge\/[a-z_/]+/g) || [])].sort()
console.log('\nknowledge paths:\n', paths.join('\n'))
