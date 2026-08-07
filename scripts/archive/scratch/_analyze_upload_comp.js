const fs = require('fs')
const s = fs.readFileSync('C:/Users/13207/Desktop/NestEdu/_zcat_main.js', 'utf8')

const start = s.indexOf('iX=({onUploadStart:r')
console.log('iX start', start)
console.log(s.slice(start, start + 3500))
