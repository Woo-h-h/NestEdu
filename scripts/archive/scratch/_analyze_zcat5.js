const fs = require('fs')
const s = fs.readFileSync('C:/Users/13207/Desktop/NestEdu/_zcat_main.js', 'utf8')

const needles = ['uploadResponse', 'onDragUpload', 'dragUpload', 'uploadToKb', 'saveToKb', 'importDoc']
for (const n of needles) {
  let i = -1
  let c = 0
  while ((i = s.indexOf(n, i + 1)) !== -1 && c < 5) {
    const ctx = s.slice(Math.max(0, i - 150), i + 500)
    if (/knowledge|category|document|file/i.test(ctx)) {
      console.log('\n===', n, '@', i, '===')
      console.log(ctx.replace(/\s+/g, ' '))
      c++
    }
  }
}

// Search semi Upload with knowledge in action URL or data
let idx = 0
let c = 0
while ((idx = s.indexOf('cn.Upload', idx + 1)) !== -1 && c < 50) {
  const ctx = s.slice(idx, idx + 900)
  if (/knowledge|category_id|document\/text|10298/i.test(ctx)) {
    console.log('\n=== Upload component @', idx, '===')
    console.log(ctx.replace(/\s+/g, ' ').slice(0, 850))
    c++
  }
}
