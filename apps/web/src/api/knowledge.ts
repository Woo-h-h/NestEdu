import type { TeachingPlan } from '@/types/weeklyPlan'
import { presetTeachingPlans } from '@/data/teachingPlans'
import { request } from '@/api/client'
import { authBridge } from '@/lib/authBridge'

export type KnowledgeSource = 'platform' | 'preset' | 'empty'

export interface FetchKnowledgePlansOptions {
  keyword?: string
  knowledgeId?: string
  categoryId?: string
  page?: number
  limit?: number
}

const LIST_PATH = '/api/knowledge/document/list'
const DETAIL_PATH = '/api/knowledge/document/detail'
const UPLOAD_PATH = '/api/knowledge/document/text'
const MAX_UPLOAD_TEXT_CHARS = 2 * 1024 * 1024

/** 对应 https://www.zcat.cn/teach/knowledge/detail/10298 */
const PRODUCT_DEFAULT_KNOWLEDGE_ID = '10298'
const PRODUCT_DEFAULT_CATEGORY_ID = '20806'
const PRODUCT_DEFAULT_CATEGORY_KEY = 'custom_1784259353619'

function getDefaultKnowledgeId(): string {
  return (
    (import.meta.env.VITE_DEFAULT_KNOWLEDGE_ID || '').trim() || PRODUCT_DEFAULT_KNOWLEDGE_ID
  )
}

function getDefaultCategoryId(): string {
  return (
    (import.meta.env.VITE_DEFAULT_KNOWLEDGE_CATEGORY_ID || '').trim() ||
    PRODUCT_DEFAULT_CATEGORY_ID
  )
}

function getDefaultCategoryKey(): string {
  return (
    (import.meta.env.VITE_DEFAULT_KNOWLEDGE_CATEGORY_KEY || '').trim() ||
    PRODUCT_DEFAULT_CATEGORY_KEY
  )
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
      domain: pickString(item, ['domain', 'subject', 'category_name', 'display_name', 'knowledge_tag']) || '综合',
      gradeLevel: pickString(item, ['gradeLevel', 'grade_level', 'grade', 'class_name']) || '通用',
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
    return mapPlanMaps(raw as Record<string, unknown>[], knowledgeId)
  }

  if (typeof raw !== 'object') return []

  const obj = raw as Record<string, unknown>
  const list =
    (Array.isArray(obj.list) && obj.list) ||
    (Array.isArray(obj.items) && obj.items) ||
    (Array.isArray(obj.data) && obj.data) ||
    (Array.isArray(obj.documents) && obj.documents) ||
    null

  if (list) {
    return mapPlanMaps(list as Record<string, unknown>[], knowledgeId)
  }

  if (Object.keys(obj).length > 0) {
    return mapPlanMaps([obj], knowledgeId)
  }
  return []
}

function mapTeachingPlan(plan: TeachingPlan): TeachingPlan {
  return {
    id: plan.id,
    title: plan.title,
    domain: plan.domain,
    gradeLevel: plan.gradeLevel,
    objectives: plan.objectives,
    content: plan.content,
    source: plan.source || 'platform',
    knowledgeId: plan.knowledgeId,
  }
}

interface PlatformEnvelope {
  success?: boolean
  result?: unknown
  total?: number
  errorMessage?: string
  error_message?: string
}

function assertPlatformSuccess(envelope: PlatformEnvelope, fallbackMsg: string) {
  if (envelope.success === false) {
    const msg =
      (envelope.errorMessage || envelope.error_message || '').trim() || fallbackMsg
    throw new Error(msg)
  }
}

/** 直连平台知识库文档列表（经 Vite 代理到 api.zcat.cn） */
export async function fetchKnowledgePlans(
  options: FetchKnowledgePlansOptions = {}
): Promise<{ plans: TeachingPlan[]; source: KnowledgeSource; error?: string }> {
  const knowledgeId = (options.knowledgeId || getDefaultKnowledgeId()).trim()
  const categoryId = (options.categoryId || getDefaultCategoryId()).trim()
  const categoryKey = getDefaultCategoryKey()

  try {
    const body: Record<string, unknown> = {
      knowledge_id: parseIdValue(knowledgeId),
      current: options.page ?? 1,
      pageSize: options.limit ?? 50,
    }
    if (categoryId) {
      body.category_id = parseIdValue(categoryId)
    }
    if (categoryKey) {
      body.category_key = categoryKey
    }
    if (options.keyword?.trim()) {
      body.keyword = options.keyword.trim()
      body.q = options.keyword.trim()
    }

    const envelope = await request.post<PlatformEnvelope>(LIST_PATH, body)
    assertPlatformSuccess(envelope, '平台文档列表失败')

    const plans = mapPlatformResult(envelope.result, knowledgeId).map(mapTeachingPlan)
    if (plans.length > 0) {
      return { plans, source: 'platform' }
    }
    return { plans: [], source: 'empty' }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const axiosData = (err as { response?: { data?: PlatformEnvelope } })?.response?.data
    const platformMsg =
      (axiosData?.errorMessage || axiosData?.error_message || '').trim() || message
    const needLogin =
      /401|token|未授权|登录|cookie/i.test(platformMsg) ||
      /401|token|未授权|登录|cookie/i.test(message)

    console.warn('[Knowledge] 平台知识库查询失败，使用本地预设:', err)
    return {
      plans: presetTeachingPlans.map((plan) => ({ ...plan, source: 'preset' as const })),
      source: 'preset',
      error: needLogin ? '请先登录平台后加载知识库 10298' : platformMsg,
    }
  }
}

export async function fetchKnowledgePlanById(id: string): Promise<TeachingPlan | null> {
  if (!id.trim()) return null

  try {
    const envelope = await request.get<PlatformEnvelope>(DETAIL_PATH, {
      params: { document_id: id },
    })
    assertPlatformSuccess(envelope, '平台文档详情失败')
    const plans = mapPlatformResult(envelope.result, '').map(mapTeachingPlan)
    if (plans[0]) return plans[0]
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

  if (plans.length === 0) {
    return { plans: [], summary: '', source: 'empty' }
  }

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
}): Promise<TeachingPlan> {
  const title = params.title.trim()
  const content = params.content.trim()
  if (!title) throw new Error('文档标题不能为空')
  if (!content) throw new Error('文档内容不能为空')
  if (content.length > MAX_UPLOAD_TEXT_CHARS) {
    throw new Error('文档内容过大，请拆分后上传（建议不超过 2MB 文本）')
  }

  const auth = authBridge.getAuthInfo()
  if (!auth?.token) {
    throw new Error('请先登录平台后再上传')
  }

  const knowledgeId = (params.knowledgeId || getDefaultKnowledgeId()).trim()
  if (!knowledgeId) {
    throw new Error('未配置知识库 ID（VITE_DEFAULT_KNOWLEDGE_ID）')
  }

  const categoryId = (params.categoryId || getDefaultCategoryId()).trim()
  const body: Record<string, unknown> = {
    knowledge_id: parseIdValue(knowledgeId),
    name: title,
    title,
    text: content,
    content,
  }
  if (categoryId) {
    body.category_id = parseIdValue(categoryId)
  }
  const categoryKey = getDefaultCategoryKey()
  if (categoryKey) {
    body.category_key = categoryKey
  }

  const envelope = await request.post<PlatformEnvelope>(UPLOAD_PATH, body)
  assertPlatformSuccess(envelope, '上传知识库失败')

  const plans = mapPlatformResult(envelope.result, knowledgeId)
  if (plans[0]) {
    return mapTeachingPlan({
      ...plans[0],
      title: plans[0].title || title,
      content: plans[0].content || content,
      objectives: plans[0].objectives || truncate(content, 100),
      source: 'platform',
      knowledgeId,
    })
  }

  const raw = envelope.result
  let docId = ''
  if (typeof raw === 'string') docId = raw
  else if (raw && typeof raw === 'object') {
    docId = pickString(raw as Record<string, unknown>, ['document_id', 'id', 'doc_id'])
  }

  return {
    id: docId || `upload_${Date.now()}`,
    title,
    domain: '综合',
    gradeLevel: '通用',
    objectives: truncate(content, 100),
    content,
    source: 'platform',
    knowledgeId,
  }
}

const DELETE_PATH = '/api/knowledge/document/delete'

/** 删除平台知识库文档（需登录） */
export async function deleteKnowledgeDocument(id: string): Promise<void> {
  const documentId = id.trim()
  if (!documentId) {
    throw new Error('文档 ID 不能为空')
  }

  const auth = authBridge.getAuthInfo()
  if (!auth?.token) {
    throw new Error('请先登录平台后再删除')
  }

  const envelope = await request.delete<PlatformEnvelope>(DELETE_PATH, {
    data: { id: parseIdValue(documentId) },
  })
  assertPlatformSuccess(envelope ?? { success: true }, '删除知识库文档失败')
}
