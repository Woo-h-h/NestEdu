import { request } from '@/api/client'
import { getApiErrorMessage } from '@/lib/apiError'
import { isMissingUidHashError } from '@/lib/uidHashCache'
import { ensureUidHashForBff } from '@/api/platformUser'
import axios from 'axios'

export interface ProfileSnapshot {
  id: string
  phone: string
  displayName: string
  agentId: number
  markdown: string
  archiveDocCount: number
  activityPlanCount?: number
  weeklyPlanCount?: number
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
  activityPlanCount?: number
  weeklyPlanCount?: number
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

async function withUidHash<T>(run: () => Promise<T>, fallbackMessage: string): Promise<T> {
  await ensureUidHashForBff()
  try {
    return await run()
  } catch (err) {
    if (!isMissingUidHashError(err) && !isMissingUidHashError(getApiErrorMessage(err, ''))) {
      throw new Error(getApiErrorMessage(err, fallbackMessage))
    }
    await ensureUidHashForBff(true)
    try {
      return await run()
    } catch (retryErr) {
      throw new Error(getApiErrorMessage(retryErr, fallbackMessage))
    }
  }
}

/** 按手机号读取已保存画像；没有记录时返回 null（不抛错）。 */
export async function getProfileSnapshotByPhone(phone: string): Promise<ProfileSnapshot | null> {
  const trimmed = phone.trim()
  if (!trimmed) return null
  try {
    return await withUidHash(async () => {
      const data = await request.get<ApiEnvelope<ProfileSnapshot>>('/api/v1/profile-snapshots', {
        params: { phone: trimmed },
      })
      return unwrapResult(data)
    }, '加载已保存画像失败')
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return null
    if (err instanceof Error && /404|not found/i.test(err.message)) return null
    throw err instanceof Error ? err : new Error(getApiErrorMessage(err, '加载已保存画像失败'))
  }
}

/** 保存画像；同一手机号会覆盖旧记录。 */
export async function saveProfileSnapshot(input: ProfileSnapshotInput): Promise<ProfileSnapshot> {
  return withUidHash(async () => {
    const data = await request.post<ApiEnvelope<ProfileSnapshot>>('/api/v1/profile-snapshots', {
      phone: input.phone.trim(),
      displayName: input.displayName ?? '',
      agentId: input.agentId ?? 0,
      markdown: input.markdown,
      archiveDocCount: input.archiveDocCount ?? 0,
      activityPlanCount: input.activityPlanCount ?? 0,
      weeklyPlanCount: input.weeklyPlanCount ?? 0,
      localRecordCount: input.localRecordCount ?? 0,
      folderIds: input.folderIds ?? [],
      generatedAt: input.generatedAt ?? new Date().toISOString(),
    })
    return unwrapResult(data)
  }, '保存画像失败，请稍后重试')
}
