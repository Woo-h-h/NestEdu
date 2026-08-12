const fs = require('fs')
const s = fs.readFileSync(
  'C:/Users/13207/Desktop/NestEdu/scripts/archive/scratch/_zcat_teach.js',
  'utf8'
)

const anchor = '如果文件夹不为空'
const idx = s.indexOf(anchor)
console.log('idx', idx)
const chunk = s.slice(idx - 15000, idx + 5000)

// find all url: patterns
const urls = [...chunk.matchAll(/url:"([^"]+)"/g)].map((m) => m[1])
console.log('urls:', [...new Set(urls)].sort().join('\n'))

// find async function names used for delete/rename near he=async
const fnCalls = [...chunk.matchAll(/await ([a-zA-Z0-9_$]+)\(/g)].map((m) => m[1])
const freq = {}
for (const f of fnCalls) freq[f] = (freq[f] || 0) + 1
console.log('\nawait calls:', Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 30))

// search o5 definition in full file - might be minified const o5=
let m = s.match(/(?:async )?(?:function )?o5=async[^;]{0,400}/)
console.log('\no5=', m && m[0].slice(0, 400))
m = s.match(/o5=async[^;]{0,500}/)
console.log('\no5 assign=', m && m[0].slice(0, 500))

// search delete knowledge category
for (const needle of ['category/delete', 'category/del', 'category/save', 'category/add', 'category/create', 'category/edit', 'knowledge/category']) {
  let i = 0, c = 0
  while ((i = s.indexOf(needle, i + 1)) >= 0 && c < 1) {
    console.log('\nFOUND', needle, s.slice(i - 100, i + 200))
    c++
  }
}

// Find "重命名" context
const rn = s.indexOf('重命名失败')
if (rn >= 0) {
  console.log('\n--- rename ctx ---')
  console.log(s.slice(rn - 2000, rn + 500).replace(/\s+/g, ' ').slice(0, 2500))
}
