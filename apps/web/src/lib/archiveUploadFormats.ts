/** 成果库上传：支持的扩展名（小写，含点） */
export const ARCHIVE_UPLOAD_EXTENSIONS = [
  '.doc',
  '.docx',
  '.pdf',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
  '.txt',
  '.md',
  '.csv',
  '.rtf',
  '.html',
  '.htm',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.bmp',
] as const

export const ARCHIVE_UPLOAD_ACCEPT = ARCHIVE_UPLOAD_EXTENSIONS.join(',')

export const ARCHIVE_UPLOAD_FORMAT_LABEL = 'Word / PDF / PPT / Excel / 图片 / 文本'

/** 教案库 / 周计划库上传与成果库同一格式清单 */
export const KNOWLEDGE_UPLOAD_EXTENSIONS = ARCHIVE_UPLOAD_EXTENSIONS
export const KNOWLEDGE_UPLOAD_ACCEPT = ARCHIVE_UPLOAD_ACCEPT
export const KNOWLEDGE_UPLOAD_FORMAT_LABEL = ARCHIVE_UPLOAD_FORMAT_LABEL

export const ARCHIVE_MAX_FILE_BYTES = 50 * 1024 * 1024

const EXT_SET = new Set(ARCHIVE_UPLOAD_EXTENSIONS.map((ext) => ext.slice(1)))

export function getFileExtension(fileName: string): string {
  const idx = fileName.lastIndexOf('.')
  if (idx <= 0 || idx === fileName.length - 1) return ''
  return fileName.slice(idx + 1).toLowerCase()
}

export function isArchiveUploadExtension(fileName: string): boolean {
  const ext = getFileExtension(fileName)
  return ext.length > 0 && EXT_SET.has(ext)
}

export function filterArchiveUploadFiles(files: File[]): File[] {
  return files.filter((file) => isArchiveUploadExtension(file.name))
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function archiveUploadTitleFromFileName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '') || fileName
}
