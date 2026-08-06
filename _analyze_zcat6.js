const fs = require('fs')
const s = fs.readFileSync('C:/Users/13207/Desktop/NestEdu/_zcat_main.js', 'utf8')

const teach = [...s.matchAll(/teach[^"'\s]{0,60}/g)]
  .map((m) => m[0])
  .filter((x) => x.includes('/') || x.includes('knowledge'))
console.log([...new Set(teach)].slice(0, 50).join('\n'))

// dynamic import chunks containing Knowledge
const chunks = [...s.matchAll(/import\("\.\/assets\/([^"]+)"\)/g)].map((m) => m[1])
const knowledgeChunks = chunks.filter((c) => /knowledge|Knowledge|teach|Teach|Kb|KB/i.test(c))
console.log('\nknowledge-ish chunks:', knowledgeChunks.length)
console.log(knowledgeChunks.slice(0, 30).join('\n'))

// search document/list upload nearby
const i = s.indexOf('/knowledge/document/list')
console.log('\ndocument/list ctx:', s.slice(i - 100, i + 400))
