const fs = require('fs')
const s = fs.readFileSync('C:/Users/13207/Desktop/NestEdu/_zcat_teach.js', 'utf8')

const paths = [...new Set(s.match(/\/knowledge\/[a-z_/]+/g) || [])].sort()
console.log('knowledge paths:\n', paths.join('\n'))

console.log('\ndocument/file count:', s.split('document/file').length - 1)

for (const p of ['/knowledge/document/text', '/knowledge/document/file', '/file/upload', 'category_key', 'type_id', 'request_by', 'tag']) {
  console.log(p + ':', s.split(p).length - 1)
}

// Find upload with category_id
let idx = 0
let c = 0
while ((idx = s.indexOf('FormData', idx + 1)) !== -1 && c < 15) {
  const ctx = s.slice(idx, idx + 1000)
  if (ctx.includes('category_id') || ctx.includes('knowledge_id')) {
    console.log('\n--- FormData @', idx, '---')
    console.log(ctx.replace(/\s+/g, ' ').slice(0, 900))
    c++
  }
}

// Search cn.Upload near knowledge
idx = 0
c = 0
while ((idx = s.indexOf('Upload', idx + 1)) !== -1 && c < 20) {
  const ctx = s.slice(Math.max(0, idx - 100), idx + 600)
  if (/knowledge|category_id|document\/file|document\/text/i.test(ctx)) {
    console.log('\n--- Upload @', idx, '---')
    console.log(ctx.replace(/\s+/g, ' ').slice(0, 700))
    c++
  }
}
