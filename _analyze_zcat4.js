const fs = require('fs')
const s = fs.readFileSync('C:/Users/13207/Desktop/NestEdu/_zcat_main.js', 'utf8')

const teach = [...s.matchAll(/path:"[^"]*teach[^"]*"/g)].map((m) => m[0])
console.log('teach routes:', [...new Set(teach)].slice(0, 30).join('\n'))

const lazy = [...s.matchAll(/import\("[^"]+"\)/g)]
  .map((m) => m[0])
  .filter((x) => /knowledge|teach|Knowledge/i.test(x))
console.log('\nlazy imports:', [...new Set(lazy)].slice(0, 30).join('\n'))

// Search for upload in knowledge detail page component - look for .png accept near knowledge
let idx = 0
let c = 0
while ((idx = s.indexOf('.png', idx + 1)) !== -1 && c < 20) {
  const ctx = s.slice(Math.max(0, idx - 200), idx + 300)
  if (/knowledge|category_id|upload|accept/i.test(ctx)) {
    console.log('\n--- png context ---')
    console.log(ctx.replace(/\s+/g, ' '))
    c++
  }
}
