import { request } from '@/api/client'
import { getApiErrorMessage } from '@/lib/apiError'
import axios from 'axios'

export interface ProfileSnapshot {
  id: string
  phone: string
  displayName: string
  agentId: number
  markdown: string
  archiveDocCount: number
  localRecordCount: number
  folderIds: string[]
  generatedAt: string
  createdAt: string
  updatedAt: string
}

export interface ProfileSnapshotInput {
  phone: string
  displayName?: string
  agentId?: number
  markdown: string
  archiveDocCount?: number
  localRecordCount?: number
  folderIds?: string[]
  generatedAt?: string
}

interface ApiEnvelope<T> {
  success?: boolean
  result?: T
  errorMessage?: string
  errorCode?: number
}

function unwrapResult<T>(data: ApiEnvelope<T> | T): T {
  if (data && typeof data === 'object' && 'result' in (data as ApiEnvelope<T>)) {
    const envelope = data as ApiEnvelope<T>
    if (envelope.success === false) {
      throw new Error(envelope.errorMessage || '请求失败')
    }
    return envelope.result as T
  }
  return data as T
}

/** 按手机号读取已保存画像；没有记录时返回 null（不抛错）。 */
export async function getProfileSnapshotByPhone(phone: string): Promise<ProfileSnapshot | null> {
  const trimmed = phone.trim()
  if (!trimmed) return null
  try {
    const data = await request.get<ApiEnvelope<ProfileSnapshot>>('/api/v1/profile-snapshots', {
      params: { phone: trimmed },
    })
    return unwrapResult(data)
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return null
    throw new Error(getApiErrorMessage(err, '加载已保存画像失败'))
  }
}

/** 保存画像；同一手机号会覆盖旧记录。 */
export async function saveProfileSnapshot(input: ProfileSnapshotInput): Promise<ProfileSnapshot> {
  try {
    const data = await request.post<ApiEnvelope<ProfileSnapshot>>('/api/v1/profile-snapshots', {
      phone: input.phone.trim(),
      displayName: input.displayName ?? '',
      agentId: input.agentId ?? 0,
      markdown: input.markdown,
      archiveDocCount: input.archiveDocCount ?? 0,
      localRecordCount: input.localRecordCount ?? 0,
      folderIds: input.folderIds ?? [],
      generatedAt: input.generatedAt ?? new Date().toISOString(),
    })
    return unwrapResult(data)
  } catch (err) {
    throw new Error(getApiErrorMessage(err, '保存画像到数据库失败（请确认已启动 pnpm dev:backend）'))
  }
}
