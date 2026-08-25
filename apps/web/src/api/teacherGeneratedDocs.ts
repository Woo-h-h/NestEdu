import { request } from '@/api/client'
import { getApiErrorMessage } from '@/lib/apiError'
import { getCurrentTeacherPhone } from '@/api/platformUser'
import type { TeachingPlan } from '@/types/weeklyPlan'

export type TeacherGeneratedDocType = 'activity' | 'weekly'
/** mysql：仅本人可见；platform：已上传 AI101 知识库 */
export type TeacherGeneratedDocStorage = 'mysql' | 'platform'

export type UploadStorageMode = 'mysql' | 'platform'

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
  storage?: TeacherGeneratedDocStorage
  content?: string
  year?: number
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
  storage?: TeacherGeneratedDocStorage
  content?: string
  year?: number
  createdAt?: string
  updatedAt?: string
}

export function isMysqlOnlyDocId(id: string): boolean {
  return id.trim().startsWith('local_')
}

export function resolveDailyDocYear(input: {
  year?: number
  title?: string
  content?: string
  createdAt?: string
}): number {
  const current = new Date().getFullYear()
  const max = current + 1
  if (typeof input.year === 'number' && input.year >= 1990 && input.year <= max) {
    return Math.trunc(input.year)
  }
  const blob = `${input.title || ''}\n${input.content || ''}`
  const match = blob.match(/(20\d{2}|19\d{2})/)
  if (match) {
    const parsed = Number(match[1])
    if (parsed >= 1990 && parsed <= max) return parsed
  }
  if (input.createdAt) {
    const d = new Date(input.createdAt)
    if (!Number.isNaN(d.getTime())) return d.getFullYear()
  }
  return current
}

export function teacherDocToPlan(row: TeacherGeneratedDoc): TeachingPlan {
  const storage = row.storage === 'mysql' ? 'mysql' : 'platform'
  return {
    id: row.knowledgeDocId,
    title: row.title,
    domain: '综合',
    gradeLevel: '通用',
    objectives: (row.content || '').slice(0, 120) || row.title,
    content: row.content || '',
    source: storage === 'mysql' ? 'mysql' : 'platform',
    knowledgeId: row.knowledgeId,
    year: resolveDailyDocYear(row),
  }
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
): Promise<TeacherGeneratedDoc> {
  try {
    const data = await request.post<ApiEnvelope<TeacherGeneratedDoc>>(
      '/api/v1/teacher-generated-docs',
      {
        phone: input.phone.trim(),
        docType: input.docType,
        knowledgeDocId: input.knowledgeDocId.trim(),
        title: input.title.trim(),
        knowledgeId: input.knowledgeId ?? '',
        categoryId: input.categoryId ?? '',
        storage: input.storage || 'platform',
        content: input.content ?? '',
        year: resolveDailyDocYear(input),
      }
    )
    return unwrapResult(data)
  } catch (err) {
    throw new Error(getApiErrorMessage(err, '记录教师生成文档失败（请确认后端已启动）'))
  }
}

/** 仅写入 MySQL，不上传平台知识库（本人可见）。 */
export async function saveMysqlOnlyGeneratedDoc(params: {
  docType: TeacherGeneratedDocType
  title: string
  content: string
  phone?: string
}): Promise<TeachingPlan> {
  const phone = (params.phone || (await getCurrentTeacherPhone())).trim()
  if (!phone) throw new Error('未能获取手机号，无法保存到本人库')
  const title = params.title.trim()
  const content = params.content.trim()
  if (!title) throw new Error('标题不能为空')
  if (!content) throw new Error('内容不能为空')

  const knowledgeDocId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? `local_${crypto.randomUUID()}`
      : `local_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

  const saved = await saveTeacherGeneratedDoc({
    phone,
    docType: params.docType,
    knowledgeDocId,
    title,
    storage: 'mysql',
    content,
    year: resolveDailyDocYear({ title, content }),
  })
  return teacherDocToPlan(saved)
}

/** 知识库上传成功后写入 MySQL；失败只打日志，不阻断主流程。 */
export async function recordTeacherGeneratedUpload(params: {
  docType: TeacherGeneratedDocType
  plan: TeachingPlan
  categoryId?: string
  phone?: string
  /** 同步落库全文，便于「我的」直接从数据库展示 */
  content?: string
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
      storage: 'platform',
      content: (params.content || params.plan.content || '').trim(),
      year: resolveDailyDocYear({
        year: params.plan.year,
        title: params.plan.title,
        content: params.content || params.plan.content,
      }),
    })
  } catch (err) {
    console.warn('[teacher-generated-docs] record skipped', err)
  }
}

/**
 * 将「仅 MySQL」文档上传到对应平台分类，并改写入库映射为 platform。
 * 成功后旧的 local_* 记录会删除。
 */
export async function promoteMysqlPlanToPlatform(params: {
  plan: TeachingPlan
  docType: TeacherGeneratedDocType
}): Promise<TeachingPlan> {
  const { resolveLiveBusinessCategory, uploadKnowledgeDocument } = await import('@/api/knowledge')
  const oldId = (params.plan.id || '').trim()
  if (!oldId) throw new Error('文档 ID 无效')
  const content = (params.plan.content || '').trim()
  if (content.length < 20) {
    throw new Error('本地文档正文过短或缺失，无法上传到平台')
  }
  const title = (params.plan.title || '').trim() || '未命名方案'
  const live = await resolveLiveBusinessCategory(params.docType)
  const uploaded = await uploadKnowledgeDocument({
    title,
    content,
    knowledgeId: live.knowledgeId,
    categoryId: live.categoryId,
    categoryKey: live.categoryKey,
    forceKind: params.docType,
  })
  await deleteTeacherGeneratedDocRecord(oldId)
  await recordTeacherGeneratedUpload({
    docType: params.docType,
    plan: uploaded,
    categoryId: live.categoryId,
    content,
  })
  return uploaded
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
