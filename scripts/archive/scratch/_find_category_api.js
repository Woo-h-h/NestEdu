const fs = require('fs')
const s = fs.readFileSync(
  'C:/Users/13207/Desktop/NestEdu/scripts/archive/scratch/_zcat_main.js',
  'utf8'
)
const re = /url:"(\/[^"]*knowledge[^"]*)"/g
const set = new Set()
let m
while ((m = re.exec(s))) set.add(m[1])
for (const u of [...set].sort()) console.log(u)
