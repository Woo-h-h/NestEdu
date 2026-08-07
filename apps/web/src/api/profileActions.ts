import { request } from '@/api/client'
import { isBackendApiEnabled } from '@/api/llm'
import type { ProfileActionState } from '@/lib/profile-actions'

interface ApiEnvelope<T> {
  success?: boolean
  result?: T
  errorMessage?: string
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

export interface ProfileActionBundle {
  states: Record<string, ProfileActionState>
  updatedAt?: string
}

export async function fetchProfileActionStates(): Promise<Record<string, ProfileActionState>> {
  if (!isBackendApiEnabled()) return {}
  try {
    const data = await request.get<ApiEnvelope<ProfileActionBundle>>('/api/v1/profile-actions')
    const bundle = unwrapResult(data)
    return bundle?.states && typeof bundle.states === 'object' ? bundle.states : {}
  } catch {
    return {}
  }
}

export async function patchProfileActionState(
  id: string,
  patch: Partial<ProfileActionState>
): Promise<ProfileActionState | null> {
  if (!isBackendApiEnabled()) return null
  const body: Record<string, unknown> = {}
  if (patch.checked !== undefined) body.checked = patch.checked
  if (patch.status !== undefined) body.status = patch.status
  if (patch.date !== undefined) body.date = patch.date
  if (patch.progress !== undefined) body.progress = patch.progress

  const data = await request.patch<ApiEnvelope<ProfileActionBundle>>(
    `/api/v1/profile-actions/${encodeURIComponent(id)}`,
    body
  )
  const bundle = unwrapResult(data)
  return bundle.states?.[id] || null
}

export async function replaceProfileActionStates(
  states: Record<string, ProfileActionState>
): Promise<Record<string, ProfileActionState>> {
  if (!isBackendApiEnabled()) return states
  const data = await request.put<ApiEnvelope<ProfileActionBundle>>('/api/v1/profile-actions', {
    states,
  })
  const bundle = unwrapResult(data)
  return bundle?.states || {}
}
