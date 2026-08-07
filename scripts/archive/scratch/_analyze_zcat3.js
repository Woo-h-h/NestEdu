const fs = require('fs')
const s = fs.readFileSync('C:/Users/13207/Desktop/NestEdu/_zcat_main.js', 'utf8')

// Find all occurrences of append with tag
let idx = 0
let c = 0
while ((idx = s.indexOf('.append("tag"', idx + 1)) !== -1 && c < 30) {
  console.log('--- tag append @', idx)
  console.log(s.slice(Math.max(0, idx - 100), idx + 300).replace(/\s+/g, ' '))
  c++
}

// Search upload action with knowledge in semi Upload component data
idx = 0
c = 0
while ((idx = s.indexOf('action:', idx + 1)) !== -1 && c < 40) {
  const ctx = s.slice(idx, idx + 400)
  if (ctx.includes('file/upload') && (ctx.includes('knowledge') || ctx.includes('category'))) {
    console.log('--- upload action @', idx)
    console.log(ctx.replace(/\s+/g, ' '))
    c++
  }
}

// Search for type_id values near knowledge
for (const tid of ['type_id', 'request_by', 'source_type', 'doc_type']) {
  idx = 0
  c = 0
  while ((idx = s.indexOf(tid, idx + 1)) !== -1 && c < 8) {
    const ctx = s.slice(Math.max(0, idx - 80), idx + 200)
    if (/knowledge|category|document/i.test(ctx)) {
      console.log('---', tid, '@', idx)
      console.log(ctx.replace(/\s+/g, ' '))
      c++
    }
  }
}

// Search file_name near y3r / document/text
idx = s.indexOf('async function y3r')
if (idx >= 0) {
  console.log('\n=== y3r and callers ===')
  console.log(s.slice(idx, idx + 1200))
}
