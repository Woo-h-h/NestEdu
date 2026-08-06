const fs = require('fs')
const s = fs.readFileSync('C:/Users/13207/Desktop/NestEdu/_zcat_teach.js', 'utf8')

const start = s.indexOf('async function y3r')
console.log('y3r area:', s.slice(start, start + 1500))

// search file_name in knowledge context
let idx = 0
let c = 0
while ((idx = s.indexOf('file_name', idx + 1)) !== -1 && c < 15) {
  const ctx = s.slice(Math.max(0, idx - 150), idx + 300)
  if (/knowledge|document|category|upload/i.test(ctx)) {
    console.log('\n--- file_name @', idx, '---')
    console.log(ctx.replace(/\s+/g, ' '))
    c++
  }
}

// search for PNG upload to knowledge - look for accept near knowledge detail
idx = 0
c = 0
while ((idx = s.indexOf('accept:', idx + 1)) !== -1 && c < 30) {
  const ctx = s.slice(Math.max(0, idx - 200), idx + 400)
  if (/knowledge|category|document|upload|drag/i.test(ctx)) {
    console.log('\n--- accept @', idx, '---')
    console.log(ctx.replace(/\s+/g, ' ').slice(0, 600))
    c++
  }
}

// search document/edit usage
idx = s.indexOf('/knowledge/document/edit')
console.log('\nedit ctx:', s.slice(idx - 200, idx + 400))
