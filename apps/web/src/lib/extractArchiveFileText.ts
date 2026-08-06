import { getFileExtension } from '@/lib/archiveUploadFormats'
import { parseDocxFile } from '@/lib/parse-docx'

const PLAIN_TEXT_EXT = new Set(['txt', 'md', 'csv', 'json', 'html', 'htm', 'xml', 'rtf'])
const OFFICE_TEXT_EXT = new Set(['doc', 'docx'])

export function isArchiveTextExtractable(fileName: string): boolean {
  const ext = getFileExtension(fileName)
  return PLAIN_TEXT_EXT.has(ext) || OFFICE_TEXT_EXT.has(ext)
}

export async function extractArchiveFileText(file: File): Promise<string> {
  const ext = getFileExtension(file.name)
  if (OFFICE_TEXT_EXT.has(ext)) {
    return parseDocxFile(file)
  }
  if (PLAIN_TEXT_EXT.has(ext)) {
    return (await file.text()).trim()
  }
  return ''
}

export function buildArchiveAttachmentContent(fileName: string, fileUrl: string): string {
  const ext = getFileExtension(fileName)
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext)) {
    return `![${fileName}](${fileUrl})\n\n> 原文件：${fileName}`
  }
  return `[${fileName}](${fileUrl})\n\n> 附件原文件：${fileName}`
}
