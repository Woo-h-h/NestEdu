import type { TeachingPlan } from '@/types/weeklyPlan'
import { presetTeachingPlans } from '@/data/teachingPlans'
import { request } from '@/api/client'
import { authBridge } from '@/lib/authBridge'

export type KnowledgeSource = 'platform' | 'preset' | 'empty'

export interface FetchKnowledgePlansOptions {
  keyword?: string
  knowledgeId?: string
  categoryId?: string
  categoryKey?: string
  page?: number
  limit?: number
  /** 平台失败时是否回退本地预设教案；周计划分类应传 false */
  fallbackPreset?: boolean
}

/**
 * 生产：走 Go BFF `/api/v1/knowledge/*`（同域，由后端转发平台）
 * 本地：走 Vite 代理 `/api/knowledge/*` → api.zcat.cn（可不启 Go）
 */
const USE_BFF = import.meta.env.PROD

const BFF_LIST_PATH = '/api/v1/knowledge/plans'
const BFF_UPLOAD_PATH = '/api/v1/knowledge/documents'
const PLATFORM_LIST_PATH = '/api/knowledge/document/list'
const PLATFORM_DETAIL_PATH = '/api/knowledge/document/detail'
const PLATFORM_UPLOAD_PATH = '/api/knowledge/document/text'
const PLATFORM_DELETE_PATH = '/api/knowledge/document/delete'

const MAX_UPLOAD_TEXT_CHARS = 2 * 1024 * 1024

/** 对应 https://www.zcat.cn/teach/knowledge/detail/10298 */
const PRODUCT_DEFAULT_KNOWLEDGE_ID = '10298'
/** 教案分类（课程资源库） */
const PRODUCT_DEFAULT_CATEGORY_ID = '20806'
const PRODUCT_DEFAULT_CATEGORY_KEY = 'custom_1784259353619'
/** 周计划分类 https://www.zcat.cn/teach/knowledge/detail/10298?category_id=20807&category_key=custom_1784275664825 */
const PRODUCT_WEEKLY_CATEGORY_ID = '20807'
const PRODUCT_WEEKLY_CATEGORY_KEY = 'custom_1784275664825'

export function getDefaultKnowledgeId(): string {
  return (
    (import.meta.env.VITE_DEFAULT_KNOWLEDGE_ID || '').trim() || PRODUCT_DEFAULT_KNOWLEDGE_ID
  )
}

export function getDefaultCategoryId(): string {
  return (
    (import.meta.env.VITE_DEFAULT_KNOWLEDGE_CATEGORY_ID || '').trim() ||
    PRODUCT_DEFAULT_CATEGORY_ID
  )
}

export function getDefaultCategoryKey(): string {
  return (
    (import.meta.env.VITE_DEFAULT_KNOWLEDGE_CATEGORY_KEY || '').trim() ||
    PRODUCT_DEFAULT_CATEGORY_KEY
  )
}

export function getWeeklyPlanCategoryId(): string {
  return (
    (import.meta.env.VITE_WEEKLY_PLAN_KNOWLEDGE_CATEGORY_ID || '').trim() ||
    PRODUCT_WEEKLY_CATEGORY_ID
  )
}

export function getWeeklyPlanCategoryKey(): string {
  return (
    (import.meta.env.VITE_WEEKLY_PLAN_KNOWLEDGE_CATEGORY_KEY || '').trim() ||
    PRODUCT_WEEKLY_CATEGORY_KEY
  )
}

export function weeklyPlanKnowledgeScope() {
  return {
    knowledgeId: getDefaultKnowledgeId(),
    categoryId: getWeeklyPlanCategoryId(),
    categoryKey: getWeeklyPlanCategoryKey(),
  }
}

function parseIdValue(id: string): string | number {
  const n = Number(id)
  return Number.isInteger(n) && String(n) === id ? n : id
}

function pickString(item: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = item[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return ''
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max)
}

function mapTeachingPlan(plan: Partial<TeachingPlan> & Record<string, unknown>): TeachingPlan {
  return {
    id: String(plan.id || ''),
    title: String(plan.title || ''),
    domain: String(plan.domain || '综合'),
    gradeLevel: String(plan.gradeLevel || '通用'),
    objectives: String(plan.objectives || ''),
    content: String(plan.content || ''),
    source: (plan.source as TeachingPlan['source']) || 'platform',
    knowledgeId: plan.knowledgeId ? String(plan.knowledgeId) : undefined,
  }
}

function mapPlanMaps(items: Record<string, unknown>[], knowledgeId: string): TeachingPlan[] {
  const plans: TeachingPlan[] = []
  for (const item of items) {
    const title = pickString(item, ['title', 'name', 'file_name', 'display_name', 'plan_name'])
    if (!title) continue

    let id = pickString(item, ['document_id', 'id', 'doc_id', 'item_id'])
    if (!id) id = title

    let objectives = pickString(item, ['objectives', 'desc', 'description', 'summary', 'intro'])
    let content = pickString(item, [
      'content',
      'text',
      'markdown',
      'body',
      'detail',
      'description',
      'desc',
    ])
    if (!content) content = objectives
    if (!objectives) objectives = truncate(content, 100)

    plans.push({
      id,
      title,
      domain:
        pickString(item, ['domain', 'subject', 'category_name', 'display_name', 'knowledge_tag']) ||
        '综合',
      gradeLevel:
        pickString(item, ['gradeLevel', 'grade_level', 'grade', 'class_name']) || '通用',
      objectives,
      content,
      source: 'platform',
      knowledgeId:
        pickString(item, ['knowledge_id', 'knowledgeId']) || knowledgeId || undefined,
    })
  }
  return plans
}

function mapPlatformResult(raw: unknown, knowledgeId: string): TeachingPlan[] {
  if (raw == null) return []
  if (Array.isArray(raw)) {
    // BFF 已映射为 TeachingPlan[]
    if (raw[0] && typeof raw[0] === 'object' && 'gradeLevel' in (raw[0] as object)) {
      return (raw as Record<string, unknown>[]).map((item) =>
        mapTeachingPlan(item as Partial<TeachingPlan> & Record<string, unknown>)
      )
    }
    return mapPlanMaps(raw as Record<string, unknown>[], knowledgeId)
  }
  if (typeof raw !== 'object') return []
  const obj = raw as Record<string, unknown>
  const list =
    (Array.isArray(obj.list) && obj.list) ||
    (Array.isArray(obj.items) && obj.items) ||
    (Array.isArray(obj.data) && obj.data) ||
    (Array.isArray(obj.documents) && obj.documents) ||
    (Array.isArray(obj.records) && obj.records) ||
    (Array.isArray(obj.rows) && obj.rows) ||
    null
  if (list) return mapPlanMaps(list as Record<string, unknown>[], knowledgeId)
  if (Object.keys(obj).length > 0) return mapPlanMaps([obj], knowledgeId)
  return []
}

interface ApiEnvelope {
  success?: boolean
  result?: unknown
  total?: number
  source?: string
  errorMessage?: string
  error_message?: string
}

function assertSuccess(envelope: ApiEnvelope, fallbackMsg: string) {
  if (envelope.success === false) {
    const msg =
      (envelope.errorMessage || envelope.error_message || '').trim() || fallbackMsg
    throw new Error(msg)
  }
}

function extractErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const data = (err as { response?: { data?: ApiEnvelope } }).response?.data
    const msg = (data?.errorMessage || data?.error_message || '').trim()
    if (msg) return msg
  }
  if (err instanceof Error) return err.message
  return String(err)
}

function isAuthError(message: string): boolean {
  return /401|token|未授权|登录|cookie/i.test(message)
}

export async function fetchKnowledgePlans(
  options: FetchKnowledgePlansOptions = {}
): Promise<{ plans: TeachingPlan[]; source: KnowledgeSource; error?: string }> {
  const knowledgeId = (options.knowledgeId || getDefaultKnowledgeId()).trim()
  const categoryId = (options.categoryId || getDefaultCategoryId()).trim()
  const categoryKey = (options.categoryKey || getDefaultCategoryKey()).trim()
  const fallbackPreset = options.fallbackPreset !== false

  try {
    let envelope: ApiEnvelope

    if (USE_BFF) {
      envelope = await request.get<ApiEnvelope>(BFF_LIST_PATH, {
        params: {
          knowledgeId,
          categoryId: categoryId || undefined,
          categoryKey: categoryKey || undefined,
          keyword: options.keyword?.trim() || undefined,
          page: options.page ?? 1,
          limit: options.limit ?? 50,
        },
      })
    } else {
      const body: Record<string, unknown> = {
        knowledge_id: parseIdValue(knowledgeId),
        current: options.page ?? 1,
        pageSize: options.limit ?? 50,
      }
      if (categoryId) body.category_id = parseIdValue(categoryId)
      if (categoryKey) body.category_key = categoryKey
      if (options.keyword?.trim()) {
        body.keyword = options.keyword.trim()
        body.q = options.keyword.trim()
      }
      envelope = await request.post<ApiEnvelope>(PLATFORM_LIST_PATH, body)
    }

    assertSuccess(envelope, '知识库列表失败')
    const plans = mapPlatformResult(envelope.result, knowledgeId)
    if (plans.length > 0) return { plans, source: 'platform' }
    return { plans: [], source: 'empty' }
  } catch (err) {
    const platformMsg = extractErrorMessage(err)
    console.warn('[Knowledge] 知识库查询失败:', err)

    if (isAuthError(platformMsg)) {
      return {
        plans: [],
        source: 'empty',
        error: '请先登录平台后加载知识库',
      }
    }

    if (!fallbackPreset) {
      return { plans: [], source: 'empty', error: platformMsg }
    }

    return {
      plans: presetTeachingPlans.map((plan) => ({ ...plan, source: 'preset' as const })),
      source: 'preset',
      error: platformMsg,
    }
  }
}

export async function fetchKnowledgePlanById(id: string): Promise<TeachingPlan | null> {
  if (!id.trim()) return null

  try {
    if (USE_BFF) {
      const envelope = await request.get<ApiEnvelope>(
        `${BFF_LIST_PATH}/${encodeURIComponent(id.trim())}`
      )
      assertSuccess(envelope, '教案详情失败')
      const plans = mapPlatformResult(
        envelope.result ? [envelope.result as Record<string, unknown>] : [],
        ''
      )
      if (plans[0]) return plans[0]
      if (envelope.result && typeof envelope.result === 'object') {
        return mapTeachingPlan(envelope.result as Partial<TeachingPlan> & Record<string, unknown>)
      }
    } else {
      const envelope = await request.get<ApiEnvelope>(PLATFORM_DETAIL_PATH, {
        params: { document_id: id },
      })
      assertSuccess(envelope, '教案详情失败')
      const plans = mapPlatformResult(envelope.result, '')
      if (plans[0]) return plans[0]
    }
  } catch (err) {
    console.warn('[Knowledge] 教案详情获取失败:', err)
  }

  const { plans } = await fetchKnowledgePlans()
  return plans.find((plan) => plan.id === id) || null
}

export async function searchKnowledge(
  themeName: string
): Promise<{ plans: TeachingPlan[]; summary: string; source: KnowledgeSource }> {
  const { plans, source } = await fetchKnowledgePlans({ keyword: themeName })
  if (plans.length === 0) return { plans: [], summary: '', source: 'empty' }
  const summary = plans
    .map((plan) => `【${plan.id}】${plan.title}${plan.content ? `\n${plan.content}` : ''}`)
    .join('\n\n')
  return { plans, summary, source }
}

export async function uploadKnowledgeDocument(params: {
  title: string
  content: string
  knowledgeId?: string
  categoryId?: string
  categoryKey?: string
}): Promise<TeachingPlan> {
  const title = params.title.trim()
  const content = params.content.trim()
  if (!title) throw new Error('文档标题不能为空')
  if (!content) throw new Error('文档内容不能为空')
  if (content.length > MAX_UPLOAD_TEXT_CHARS) {
    throw new Error('文档内容过大，请拆分后上传（建议不超过 2MB 文本）')
  }

  const auth = authBridge.getAuthInfo()
  if (!auth?.token) throw new Error('请先登录平台后再上传')

  const knowledgeId = (params.knowledgeId || getDefaultKnowledgeId()).trim()
  const categoryId = (params.categoryId || getDefaultCategoryId()).trim()
  const categoryKey = (params.categoryKey || getDefaultCategoryKey()).trim()

  let envelope: ApiEnvelope
  if (USE_BFF) {
    envelope = await request.post<ApiEnvelope>(BFF_UPLOAD_PATH, {
      knowledgeId,
      title,
      content,
      categoryId: categoryId || undefined,
      categoryKey: categoryKey || undefined,
    })
  } else {
    const body: Record<string, unknown> = {
      knowledge_id: parseIdValue(knowledgeId),
      name: title,
      title,
      text: content,
      content,
    }
    if (categoryId) body.category_id = parseIdValue(categoryId)
    if (categoryKey) body.category_key = categoryKey
    envelope = await request.post<ApiEnvelope>(PLATFORM_UPLOAD_PATH, body)
  }

  assertSuccess(envelope, '上传知识库失败')
  const plans = mapPlatformResult(envelope.result, knowledgeId)
  if (plans[0]) {
    return {
      ...plans[0],
      title: plans[0].title || title,
      content: plans[0].content || content,
      objectives: plans[0].objectives || truncate(content, 100),
      source: 'platform',
      knowledgeId,
    }
  }

  return {
    id: `upload_${Date.now()}`,
    title,
    domain: '综合',
    gradeLevel: '通用',
    objectives: truncate(content, 100),
    content,
    source: 'platform',
    knowledgeId,
  }
}

export async function deleteKnowledgeDocument(id: string): Promise<void> {
  const documentId = id.trim()
  if (!documentId) throw new Error('文档 ID 不能为空')

  const auth = authBridge.getAuthInfo()
  if (!auth?.token) throw new Error('请先登录平台后再删除')

  let envelope: ApiEnvelope
  if (USE_BFF) {
    envelope = await request.delete<ApiEnvelope>(
      `${BFF_UPLOAD_PATH}/${encodeURIComponent(documentId)}`
    )
  } else {
    envelope = await request.delete<ApiEnvelope>(PLATFORM_DELETE_PATH, {
      data: { id: parseIdValue(documentId) },
    })
  }
  assertSuccess(envelope ?? { success: true }, '删除知识库文档失败')
}
