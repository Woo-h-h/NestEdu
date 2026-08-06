const fs = require('fs')
const zlib = require('zlib')

const b = fs.readFileSync('C:/Users/13207/Desktop/NestEdu/_teach_kb.html')
let s = b.toString('utf8')
if (b[0] === 0x1f && b[1] === 0x8b) s = zlib.gunzipSync(b).toString('utf8')

console.log(s.slice(0, 2000))
const scripts = [...s.matchAll(/src="([^"]+)"/g)].map((m) => m[1])
console.log('\nscripts:', scripts.join('\n'))
