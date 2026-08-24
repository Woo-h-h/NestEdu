import { request } from '@/api/client'
import { getApiErrorMessage } from '@/lib/apiError'
import { getCurrentTeacherPhone } from '@/api/platformUser'
import type { ArchiveTreeCategory } from '@/lib/archiveTreeCategory'
import type { TeachingPlan } from '@/types/weeklyPlan'

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

export interface ArchiveAchievement {
  id: string
  phone: string
  knowledgeDocId: string
  title: string
  treeCategory: ArchiveTreeCategory
  year: number
  materialType?: string
  summary?: string
  needsHumanReview?: boolean
  knowledgeId?: string
  categoryId?: string
  createdAt?: string
  updatedAt?: string
}

export function applyArchiveAchievementsToPlans(
  plans: TeachingPlan[],
  rows: ArchiveAchievement[]
): TeachingPlan[] {
  if (rows.length === 0) return plans
  const byId = new Map(rows.map((row) => [row.knowledgeDocId, row]))
  return plans.map((plan) => {
    const row = byId.get(plan.id)
    if (!row) return plan
    return {
      ...plan,
      treeCategory: row.treeCategory,
      year: row.year || plan.year,
    }
  })
}

export async function listArchiveAchievements(phone: string): Promise<ArchiveAchievement[]> {
  const trimmed = phone.trim()
  if (!trimmed) return []
  try {
    const data = await request.get<ApiEnvelope<ArchiveAchievement[]>>('/api/v1/archive-achievements', {
      params: { phone: trimmed, limit: 200 },
    })
    const rows = unwrapResult(data)
    return Array.isArray(rows) ? rows : []
  } catch (err) {
    console.warn('[archive-achievements] list failed', err)
    return []
  }
}

export async function saveArchiveAchievement(
  input: Omit<ArchiveAchievement, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<ArchiveAchievement> {
  const data = await request.post<ApiEnvelope<ArchiveAchievement>>('/api/v1/archive-achievements', input)
  return unwrapResult(data)
}

export async function deleteArchiveAchievement(knowledgeDocId: string): Promise<void> {
  const id = knowledgeDocId.trim()
  if (!id) return
  try {
    await request.delete(`/api/v1/archive-achievements/${encodeURIComponent(id)}`)
  } catch (err) {
    console.warn('[archive-achievements] delete skipped', getApiErrorMessage(err, '删除分类记录失败'))
  }
}

/** 成果库上传成功后写入分类/年份；失败只打日志，不阻断知识库入库。 */
export async function recordArchiveAchievementUpload(params: {
  plan: TeachingPlan
  treeCategory: ArchiveTreeCategory
  year: number
  materialType?: string
  summary?: string
  needsHumanReview?: boolean
  categoryId?: string
  phone?: string
}): Promise<void> {
  try {
    const phone = (params.phone || (await getCurrentTeacherPhone())).trim()
    if (!phone) return
    const knowledgeDocId = (params.plan.id || '').trim()
    if (!knowledgeDocId) return
    await saveArchiveAchievement({
      phone,
      knowledgeDocId,
      title: params.plan.title || knowledgeDocId,
      treeCategory: params.treeCategory,
      year: params.year,
      materialType: params.materialType,
      summary: params.summary,
      needsHumanReview: params.needsHumanReview,
      knowledgeId: params.plan.knowledgeId,
      categoryId: params.categoryId,
    })
  } catch (err) {
    console.warn('[archive-achievements] record skipped', err)
  }
}
