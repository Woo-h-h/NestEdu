import { request } from '@/api/client'
import { getApiErrorMessage } from '@/lib/apiError'
import { getCurrentTeacherPhone } from '@/api/platformUser'
import type { TeachingPlan } from '@/types/weeklyPlan'

export type TeacherGeneratedDocType = 'activity' | 'weekly'

export interface TeacherGeneratedDocStats {
  phone: string
  activity: number
  weekly: number
  total: number
}

export interface TeacherGeneratedDocInput {
  phone: string
  docType: TeacherGeneratedDocType
  knowledgeDocId: string
  title: string
  knowledgeId?: string
  categoryId?: string
}

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

export interface TeacherGeneratedDoc {
  id: string
  phone: string
  docType: TeacherGeneratedDocType
  knowledgeDocId: string
  title: string
  knowledgeId?: string
  categoryId?: string
  createdAt?: string
  updatedAt?: string
}

export async function fetchTeacherGeneratedDocStats(
  phone: string
): Promise<TeacherGeneratedDocStats | null> {
  const trimmed = phone.trim()
  if (!trimmed) return null
  try {
    const data = await request.get<ApiEnvelope<TeacherGeneratedDocStats>>(
      '/api/v1/teacher-generated-docs/stats',
      { params: { phone: trimmed } }
    )
    return unwrapResult(data)
  } catch (err) {
    console.warn('[teacher-generated-docs] stats failed', err)
    return null
  }
}

/** 列出本人入库记录（用于知识库「我的」筛选）。 */
export async function listTeacherGeneratedDocs(
  phone: string,
  docType?: TeacherGeneratedDocType
): Promise<TeacherGeneratedDoc[]> {
  const trimmed = phone.trim()
  if (!trimmed) return []
  try {
    const data = await request.get<ApiEnvelope<TeacherGeneratedDoc[]>>(
      '/api/v1/teacher-generated-docs',
      {
        params: {
          phone: trimmed,
          ...(docType ? { docType } : {}),
        },
      }
    )
    const rows = unwrapResult(data)
    return Array.isArray(rows) ? rows : []
  } catch (err) {
    console.warn('[teacher-generated-docs] list failed', err)
    return []
  }
}

export async function saveTeacherGeneratedDoc(
  input: TeacherGeneratedDocInput
): Promise<void> {
  try {
    await request.post('/api/v1/teacher-generated-docs', {
      phone: input.phone.trim(),
      docType: input.docType,
      knowledgeDocId: input.knowledgeDocId.trim(),
      title: input.title.trim(),
      knowledgeId: input.knowledgeId ?? '',
      categoryId: input.categoryId ?? '',
    })
  } catch (err) {
    throw new Error(getApiErrorMessage(err, '记录教师生成文档失败（请确认后端已启动）'))
  }
}

/** 知识库上传成功后写入 MySQL；失败只打日志，不阻断主流程。 */
export async function recordTeacherGeneratedUpload(params: {
  docType: TeacherGeneratedDocType
  plan: TeachingPlan
  categoryId?: string
  phone?: string
}): Promise<void> {
  try {
    const phone = (params.phone || (await getCurrentTeacherPhone())).trim()
    if (!phone) return
    const knowledgeDocId = (params.plan.id || '').trim()
    if (!knowledgeDocId) return
    await saveTeacherGeneratedDoc({
      phone,
      docType: params.docType,
      knowledgeDocId,
      title: params.plan.title || knowledgeDocId,
      knowledgeId: params.plan.knowledgeId,
      categoryId: params.categoryId,
    })
  } catch (err) {
    console.warn('[teacher-generated-docs] record skipped', err)
  }
}

export async function deleteTeacherGeneratedDocRecord(knowledgeDocId: string): Promise<void> {
  const id = knowledgeDocId.trim()
  if (!id) return
  try {
    await request.delete(`/api/v1/teacher-generated-docs/${encodeURIComponent(id)}`)
  } catch (err) {
    console.warn('[teacher-generated-docs] delete skipped', err)
  }
}
