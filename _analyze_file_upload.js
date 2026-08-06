const fs = require('fs')
const s = fs.readFileSync('C:/Users/13207/Desktop/NestEdu/_zcat_teach.js', 'utf8')

// Find all .append( calls near file/upload
let idx = 0
let c = 0
while ((idx = s.indexOf('/api/file/upload', idx + 1)) !== -1 && c < 10) {
  console.log('\n=== /api/file/upload @', idx, '===')
  console.log(s.slice(Math.max(0, idx - 500), idx + 200).replace(/\s+/g, ' '))
  c++
}

// YN function usages - second arg objects
idx = 0
c = 0
while ((idx = s.indexOf('await YN(', idx + 1)) !== -1 && c < 15) {
  console.log('\n=== await YN @', idx, '===')
  console.log(s.slice(idx, idx + 350).replace(/\s+/g, ' '))
  c++
}
