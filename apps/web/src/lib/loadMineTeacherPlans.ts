import { authBridge } from '@/lib/authBridge'
import { getCurrentTeacherPhone } from '@/api/platformUser'
import {
  listTeacherGeneratedDocs,
  teacherDocToPlan,
  type TeacherGeneratedDocType,
} from '@/api/teacherGeneratedDocs'
import { fetchKnowledgePlanById } from '@/api/knowledge'
import type { TeachingPlan } from '@/types/weeklyPlan'

export interface MineTeacherPlansResult {
  phone: string
  docIds: Set<string>
  titles: Set<string>
  mappedCount: number
  legacyLocalCount: number
  inCategoryCount: number
  misroutedCount: number
  /** ownership=「我的」时组装的可展示列表；否则为空 */
  extraPlans: TeachingPlan[]
}

export type LoadMineTeacherPlansOptions = {
  docType: TeacherGeneratedDocType
  /** 当前知识库列表（用于匹配已在分类中的文档） */
  presentPlans: TeachingPlan[]
  /** 是否组装「我的」完整列表（含正文兜底） */
  buildExtraPlans: boolean
  /**
   * full：尝试平台详情补正文（活动方案管理页）
   * light：仅用列表/本地正文，缺正文时给提示（周计划勾选）
   */
  enrichMode?: 'full' | 'light'
}

/**
 * 加载本人入库映射，并按需组装「我的」教案列表。
 * PlanManageList / PlanSelector 共用，避免两套分叉逻辑。
 */
export async function loadMineTeacherPlans(
  options: LoadMineTeacherPlansOptions
): Promise<MineTeacherPlansResult> {
  const enrichMode = options.enrichMode ?? 'full'
  const empty = (): MineTeacherPlansResult => ({
    phone: '',
    docIds: new Set(),
    titles: new Set(),
    mappedCount: 0,
    legacyLocalCount: 0,
    inCategoryCount: 0,
    misroutedCount: 0,
    extraPlans: [],
  })

  if (!authBridge.getAuthInfo()?.token) {
    throw new Error('请先登录后再查看「我的」文档')
  }

  const phone = (await getCurrentTeacherPhone()).trim()
  if (!phone) {
    throw new Error('未获取到手机号，无法映射本人入库记录')
  }

  const rows = await listTeacherGeneratedDocs(phone, options.docType)
  const docIds = new Set(rows.map((r) => r.knowledgeDocId).filter(Boolean))
  const titles = new Set(rows.map((r) => r.title.trim()).filter(Boolean))
  const presentIds = new Set(options.presentPlans.map((p) => (p.id || '').trim()).filter(Boolean))
  const presentTitles = new Set(
    options.presentPlans.map((p) => (p.title || '').trim()).filter(Boolean)
  )

  let legacyLocalCount = 0
  let inCategoryCount = 0
  let misroutedCount = 0
  for (const row of rows) {
    if ((row.storage || 'platform') === 'mysql') {
      legacyLocalCount += 1
      continue
    }
    const id = (row.knowledgeDocId || '').trim()
    const titleText = (row.title || '').trim()
    const inList =
      (id && presentIds.has(id)) || (titleText && presentTitles.has(titleText))
    if (inList) inCategoryCount += 1
    else misroutedCount += 1
  }

  const result: MineTeacherPlansResult = {
    phone,
    docIds,
    titles,
    mappedCount: rows.length,
    legacyLocalCount,
    inCategoryCount,
    misroutedCount,
    extraPlans: [],
  }

  if (!options.buildExtraPlans) {
    return result
  }

  const built: TeachingPlan[] = []
  for (const row of rows) {
    const id = (row.knowledgeDocId || '').trim()
    const titleText = (row.title || '').trim()
    const dbContent = (row.content || '').trim()

    if ((row.storage || 'platform') === 'mysql' || dbContent.length >= 20) {
      built.push({
        ...teacherDocToPlan(row),
        source: (row.storage || 'platform') === 'mysql' ? 'mysql' : 'platform',
        content: dbContent || row.content || '',
        objectives: (dbContent || row.title).slice(0, 120),
      })
      continue
    }

    const fromPlatform =
      options.presentPlans.find((p) => (p.id || '').trim() === id) ||
      options.presentPlans.find((p) => (p.title || '').trim() === titleText)
    if (fromPlatform) {
      built.push({
        ...fromPlatform,
        content: fromPlatform.content || dbContent,
        objectives:
          fromPlatform.objectives ||
          (fromPlatform.content || dbContent || titleText).slice(0, 120),
      })
      continue
    }

    if (enrichMode === 'full' && id) {
      const fetched = await fetchKnowledgePlanById(id)
      if (fetched && (fetched.content || fetched.objectives || '').trim().length >= 20) {
        built.push(fetched)
        continue
      }
    }

    built.push({
      id: id || `mine_${titleText}`,
      title: titleText || id,
      domain: '综合',
      gradeLevel: '通用',
      objectives:
        enrichMode === 'full'
          ? '（已有入库记录，但正文暂不可读。请重新生成入库，或到平台「教案知识库管理」确认文件）'
          : '（本人入库记录；正文请到活动方案知识库查看）',
      content: '',
      source: 'platform',
    })
  }

  const byId = new Set<string>()
  const merged: TeachingPlan[] = []
  for (const p of built) {
    const key = (p.id || p.title || '').trim()
    if (!key || byId.has(key)) continue
    byId.add(key)
    merged.push(p)
  }
  result.extraPlans = merged
  return result
}

/** 未登录时的空结果（不抛错，由调用方决定是否提示） */
export function emptyMineTeacherPlans(): MineTeacherPlansResult {
  return {
    phone: '',
    docIds: new Set(),
    titles: new Set(),
    mappedCount: 0,
    legacyLocalCount: 0,
    inCategoryCount: 0,
    misroutedCount: 0,
    extraPlans: [],
  }
}

/**
 * 是否属于当前教师可管理的文档（「我的」）。
 * - 会话内 AI 草稿 / 本地 mysql 映射：视为本人
 * - 平台文档：须命中本人入库映射（knowledgeDocId 或标题）
 */
export function isOwnedTeacherPlan(
  plan: TeachingPlan,
  mineDocIds: Set<string>,
  mineTitles: Set<string>
): boolean {
  if (plan.source === 'preset') return false
  if (plan.source === 'ai') return true
  if (plan.source === 'mysql' || plan.id.startsWith('local_')) return true
  const id = (plan.id || '').trim()
  const title = (plan.title || '').trim()
  return Boolean((id && mineDocIds.has(id)) || (title && mineTitles.has(title)))
}

/** 删除前强制校验：只能删本人入库的教案/周计划 */
export async function assertCanDeleteTeacherPlan(
  plan: TeachingPlan,
  docType: TeacherGeneratedDocType
): Promise<void> {
  if (plan.source === 'preset') {
    throw new Error('本地预设不可删除')
  }
  if (plan.source === 'ai') return
  if (plan.source === 'mysql' || plan.id.startsWith('local_')) return

  if (!authBridge.getAuthInfo()?.token) {
    throw new Error('请先登录后再删除')
  }
  const phone = (await getCurrentTeacherPhone()).trim()
  if (!phone) {
    throw new Error('未获取到手机号，无法校验删除权限')
  }
  const rows = await listTeacherGeneratedDocs(phone, docType)
  const docIds = new Set(rows.map((r) => r.knowledgeDocId).filter(Boolean))
  const titles = new Set(rows.map((r) => r.title.trim()).filter(Boolean))
  if (!isOwnedTeacherPlan(plan, docIds, titles)) {
    throw new Error('只能删除本人入库的文档，无权删除其他教师的教案或周计划')
  }
}
