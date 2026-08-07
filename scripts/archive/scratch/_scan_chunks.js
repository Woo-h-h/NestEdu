const fs = require('fs')
const path = require('path')
const https = require('https')
const { URL } = require('url')

const main = fs.readFileSync('C:/Users/13207/Desktop/NestEdu/_zcat_teach.js', 'utf8')
const chunks = [...new Set(main.match(/assets\/[A-Za-z0-9_-]+\.js/g) || [])]
console.log('chunks', chunks.length)

const targets = chunks.filter((c) => /Knowledge|knowledge|Teach|teach|Kb|Doc|Upload|upload|File|file/.test(c))
console.log('candidate chunks', targets.length)
console.log(targets.slice(0, 40).join('\n'))

function fetch(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { Referer: 'https://www.zcat.cn' } }, (res) => {
        const parts = []
        res.on('data', (d) => parts.push(d))
        res.on('end', () => resolve(Buffer.concat(parts).toString('utf8')))
      })
      .on('error', reject)
  })
}

;(async () => {
  for (const chunk of targets.slice(0, 25)) {
    const url = `https://www.zcat.cn/${chunk}`
    try {
      const s = await fetch(url)
      const hits = []
      if (s.includes('document/file')) hits.push('document/file')
      if (s.includes('knowledge/document/text')) hits.push('document/text')
      if (/category_id/.test(s) && /file\/upload/.test(s)) hits.push('file/upload+category_id')
      if (/knowledge_id/.test(s) && /FormData/.test(s) && /file/.test(s)) hits.push('FormData+knowledge')
      if (hits.length) console.log(chunk, '=>', hits.join(', '))
    } catch (e) {
      console.log(chunk, 'ERR', e.message)
    }
  }
})()
