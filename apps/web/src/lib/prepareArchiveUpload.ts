import {
  ARCHIVE_MAX_FILE_BYTES,
  archiveUploadTitleFromFileName,
  formatFileSize,
  isArchiveUploadExtension,
} from '@/lib/archiveUploadFormats'

export interface PreparedArchiveFileUpload {
  fileName: string
  title: string
  file: File
}

export function validateArchiveUploadFiles(files: File[]): void {
  if (files.length === 0) {
    throw new Error('请先选择要上传的文件')
  }

  const invalid = files.filter((file) => !isArchiveUploadExtension(file.name))
  if (invalid.length > 0) {
    throw new Error(
      `不支持的格式：${invalid.map((f) => f.name).join('、')}。支持 Word、PDF、PPT、Excel、图片与常见文本格式。`
    )
  }

  const oversized = files.filter((file) => file.size > ARCHIVE_MAX_FILE_BYTES)
  if (oversized.length > 0) {
    throw new Error(
      `文件过大：${oversized.map((f) => f.name).join('、')}（单文件不超过 ${formatFileSize(ARCHIVE_MAX_FILE_BYTES)}）`
    )
  }

  const empty = files.filter((file) => file.size === 0)
  if (empty.length > 0) {
    throw new Error(`文件为空：${empty.map((f) => f.name).join('、')}`)
  }
}

export function prepareArchiveUploadFiles(files: File[]): PreparedArchiveFileUpload[] {
  validateArchiveUploadFiles(files)
  return files.map((file) => ({
    fileName: file.name,
    title: archiveUploadTitleFromFileName(file.name),
    file,
  }))
}
