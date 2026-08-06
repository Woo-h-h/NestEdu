import { request } from '@/api/client'
import { authBridge } from '@/lib/authBridge'
import { getApiErrorMessage } from '@/lib/apiError'

const PLATFORM_FILE_UPLOAD_PATH = '/api/file/upload'

interface ApiEnvelope {
  success?: boolean
  result?: unknown
  errorMessage?: string
  error_message?: string
}

function assertSuccess(envelope: ApiEnvelope, fallbackMsg: string) {
  if (envelope.success === false) {
    const msg = (envelope.errorMessage || envelope.error_message || '').trim() || fallbackMsg
    throw new Error(msg)
  }
}

function pickString(item: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = item[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return ''
}

function flattenFileResult(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {}
  const obj = raw as Record<string, unknown>
  const nested = obj.file
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return { ...obj, ...(nested as Record<string, unknown>) }
  }
  return obj
}

export interface PlatformUploadedFile {
  id?: string
  url: string
  name: string
}

/** 平台通用文件上传（网盘 / 附件）；返回可公开访问的 file.url */
export async function uploadPlatformFile(file: File): Promise<PlatformUploadedFile> {
  if (!file || file.size === 0) throw new Error('上传文件不能为空')

  const auth = authBridge.getAuthInfo()
  if (!auth?.token) throw new Error('请先登录平台后再上传')

  const formData = new FormData()
  formData.append('file', file, file.name)
  formData.append('type_id', '5')

  let envelope: ApiEnvelope
  try {
    envelope = await request.post<ApiEnvelope>(PLATFORM_FILE_UPLOAD_PATH, formData, {
      timeout: 120000,
    })
  } catch (err) {
    throw new Error(getApiErrorMessage(err, '文件上传失败'))
  }

  assertSuccess(envelope, '文件上传失败')

  const fileObj = flattenFileResult(envelope.result)
  const url = pickString(fileObj, ['url', 'file_url', 'fileUrl', 'link'])
  if (!url) throw new Error('文件上传成功但未返回访问地址')

  return {
    id: pickString(fileObj, ['id', 'file_id', 'fileId']),
    url,
    name: pickString(fileObj, ['name', 'file_name', 'fileName']) || file.name,
  }
}
