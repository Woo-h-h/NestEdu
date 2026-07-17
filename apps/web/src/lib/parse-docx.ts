import mammoth from 'mammoth'

export async function parseDocxFile(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value.trim()
  } catch (err) {
    console.error(`解析文件 ${file.name} 失败:`, err)
    throw new Error(`无法解析文件 "${file.name}"，请确认其为有效的 .docx 文件`, { cause: err })
  }
}

export async function parseDocxFiles(
  files: File[]
): Promise<{ name: string; content: string }[]> {
  const results: { name: string; content: string }[] = []

  for (const file of files) {
    try {
      const content = await parseDocxFile(file)
      if (content) {
        results.push({ name: file.name, content })
      }
    } catch (err) {
      console.error(`跳过文件 ${file.name}:`, err)
    }
  }

  return results
}
