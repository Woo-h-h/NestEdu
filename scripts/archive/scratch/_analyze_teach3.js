const fs = require('fs')
const s = fs.readFileSync('C:/Users/13207/Desktop/NestEdu/_zcat_teach.js', 'utf8')

const needles = ['上传文件', '拖拽', '知识库', '导入', '本地文件', '选择文件', '支持格式', 'document/list']
for (const n of needles) {
  let i = -1
  let c = 0
  while ((i = s.indexOf(n, i + 1)) !== -1 && c < 3) {
    const ctx = s.slice(Math.max(0, i - 200), i + 400)
    if (/knowledge|category|upload|file|document/i.test(ctx)) {
      console.log('\n===', n, '@', i, '===')
      console.log(ctx.replace(/\s+/g, ' ').slice(0, 700))
      c++
    }
  }
}

// Search for teach/knowledge detail component - KnowledgeDetail or similar
for (const n of ['KnowledgeDetail', 'KnowledgeManage', 'KnowledgeFile', 'KbUpload', 'DocUpload', 'uploadFileTo']) {
  const c = s.split(n).length - 1
  if (c) console.log(n, c)
}
