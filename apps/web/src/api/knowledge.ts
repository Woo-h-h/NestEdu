import type { TeachingPlan } from '@/types/weeklyPlan'
import { presetTeachingPlans } from '@/data/teachingPlans'
import { request } from '@/api/client'
import { authBridge } from '@/lib/authBridge'
import {
  flattenKnowledgeCategories,
  listArchiveChildFolderNames,
  resolveArchiveParentId,
  resolveTeacherArchiveFolders,
} from '@/lib/archiveTeacherScope'

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
/** 教师成果库 https://www.zcat.cn/teach/knowledge/detail/10298?category_id=20895&category_key=custom_1785116184487 */
const PRODUCT_ARCHIVE_CATEGORY_ID = '20895'
const PRODUCT_ARCHIVE_CATEGORY_KEY = 'custom_1785116184487'

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

export function getArchiveCategoryId(): string {
  return (
    (import.meta.env.VITE_ARCHIVE_KNOWLEDGE_CATEGORY_ID || '').trim() ||
    PRODUCT_ARCHIVE_CATEGORY_ID
  )
}

export function getArchiveCategoryKey(): string {
  return (
    (import.meta.env.VITE_ARCHIVE_KNOWLEDGE_CATEGORY_KEY || '').trim() ||
    PRODUCT_ARCHIVE_CATEGORY_KEY
  )
}

/** 教师成果库作用域；categoryId 为空表示尚未配置 */
export function archiveKnowledgeScope() {
  return {
    knowledgeId: getDefaultKnowledgeId(),
    categoryId: getArchiveCategoryId(),
    categoryKey: getArchiveCategoryKey(),
  }
}

export function isArchiveKnowledgeConfigured(): boolean {
  return Boolean(getArchiveCategoryId())
}

export interface KnowledgeCategory {
  id: string
  name: string
  parentId: string
  key: string
  childrenIds: string[]
}

const PLATFORM_CATEGORY_LIST_PATH = '/api/knowledge/category/list'

export async function fetchKnowledgeCategories(
  knowledgeId?: string
): Promise<{
  categories: KnowledgeCategory[]
  error?: string
  rawCount?: number
  debug?: Record<string, unknown>
}> {
  const kid = (knowledgeId || getDefaultKnowledgeId()).trim()
  if (!kid) return { categories: [], error: 'knowledgeId is required', rawCount: 0 }

  const debug: Record<string, unknown> = { knowledgeId: kid, attempts: [] as unknown[] }

  try {
    // 平台 SPA：GET /knowledge/category/list?knowledge_id=（axios baseURL 已含 /api）
    // 部分网关对 GET 返回空 result，再试 POST
    const attempts: Array<{ method: 'get' | 'post'; knowledgeId: string | number }> = [
      { method: 'get', knowledgeId: parseIdValue(kid) },
      { method: 'get', knowledgeId: kid },
      { method: 'post', knowledgeId: parseIdValue(kid) },
      { method: 'post', knowledgeId: kid },
    ]

    let bestList: unknown[] = []
    let lastEnvelope: ApiEnvelope | null = null

    for (const attempt of attempts) {
      let envelope: ApiEnvelope
      if (attempt.method === 'get') {
        envelope = await request.get<ApiEnvelope>(PLATFORM_CATEGORY_LIST_PATH, {
          params: { knowledge_id: attempt.knowledgeId },
        })
      } else {
        envelope = await request.post<ApiEnvelope>(PLATFORM_CATEGORY_LIST_PATH, {
          knowledge_id: attempt.knowledgeId,
        })
      }
      assertSuccess(envelope, '知识库分类列表失败')
      lastEnvelope = envelope
      const list = extractCategoryListFromEnvelope(envelope)
      ;(debug.attempts as unknown[]).push({
        method: attempt.method,
        knowledgeId: attempt.knowledgeId,
        envelopeKeys: envelope && typeof envelope === 'object' ? Object.keys(envelope) : [],
        resultType: envelope?.result === null ? 'null' : Array.isArray(envelope?.result) ? `array:${(envelope.result as unknown[]).length}` : typeof envelope?.result,
        parsedCount: list.length,
      })
      if (list.length > bestList.length) bestList = list
      if (list.length > 0) break
    }

    const categories = flattenKnowledgeCategories(bestList)
    debug.rawCount = bestList.length
    debug.mappedCount = categories.length
    debug.envelopeKeys =
      lastEnvelope && typeof lastEnvelope === 'object' ? Object.keys(lastEnvelope) : []

    console.warn('[Knowledge] category/list', debug)

    if (categories.length === 0 && lastEnvelope) {
      // 仍为空：用文档列表反推分类（教师成果库子文件夹常能从文档 category_* 字段还原）
      const discovered = await discoverCategoriesFromDocuments(kid)
      debug.discoveredFromDocuments = discovered.length
      if (discovered.length > 0) {
        return { categories: discovered, rawCount: discovered.length, debug }
      }
    }

    return { categories, rawCount: bestList.length, debug }
  } catch (err) {
    const msg = extractErrorMessage(err)
    console.warn('[Knowledge] 分类列表失败:', err)
    debug.error = msg
    // 分类接口失败时仍尝试文档反推
    try {
      const discovered = await discoverCategoriesFromDocuments(kid)
      if (discovered.length > 0) {
        return { categories: discovered, rawCount: discovered.length, debug, error: msg }
      }
    } catch {
      // ignore
    }
    return { categories: [], error: msg, rawCount: 0, debug }
  }
}

function extractCategoryListFromEnvelope(envelope: ApiEnvelope): unknown[] {
  const candidates: unknown[] = [
    envelope.result,
    (envelope as { data?: unknown }).data,
    (envelope as { list?: unknown }).list,
    (envelope as { categories?: unknown }).categories,
  ]
  // data 再包一层 result
  const data = (envelope as { data?: unknown }).data
  if (data && typeof data === 'object') {
    const nested = data as Record<string, unknown>
    candidates.push(nested.result, nested.list, nested.items, nested.data, nested.categories)
  }
  for (const candidate of candidates) {
    const list = extractCategoryList(candidate)
    if (list.length > 0) return list
  }
  // 明确空数组也返回
  if (Array.isArray(envelope.result)) return envelope.result
  return []
}

function extractCategoryList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw
  if (!raw || typeof raw !== 'object') return []
  const obj = raw as Record<string, unknown>
  for (const key of ['list', 'items', 'data', 'categories', 'rows', 'records']) {
    const value = obj[key]
    if (Array.isArray(value)) return value
  }
  return []
}

/**
 * 当 category/list 返回空时，从文档列表的 category_id / category_name 反推分类树。
 * 足以还原「教师成果库」下以手机号命名的个人文件夹。
 */
async function discoverCategoriesFromDocuments(
  knowledgeId: string
): Promise<KnowledgeCategory[]> {
  const archiveId = getArchiveCategoryId()
  const archiveKey = getArchiveCategoryKey()
  const queries: Array<Record<string, unknown>> = [
    {
      knowledge_id: parseIdValue(knowledgeId),
      current: 1,
      pageSize: 100,
    },
  ]
  if (archiveId) {
    queries.push({
      knowledge_id: parseIdValue(knowledgeId),
      category_id: parseIdValue(archiveId),
      category_key: archiveKey || undefined,
      current: 1,
      pageSize: 100,
    })
  }

  const byId = new Map<string, KnowledgeCategory>()
  if (archiveId) {
    byId.set(archiveId, {
      id: archiveId,
      name: '教师成果库',
      parentId: '0',
      key: archiveKey,
      childrenIds: [],
    })
  }

  for (const body of queries) {
    try {
      const envelope = await request.post<ApiEnvelope>(PLATFORM_LIST_PATH, body)
      assertSuccess(envelope, '知识库文档列表失败')
      const items = extractDocumentItems(envelope.result)
      for (const item of items) {
        const id = pickString(item, ['category_id', 'categoryId', 'folder_id', 'folderId'])
        const name = pickString(item, [
          'category_name',
          'categoryName',
          'folder_name',
          'folderName',
          'dir_name',
        ])
        if (!id || !name) continue
        const parentId =
          pickString(item, ['parent_category_id', 'parentCategoryId', 'parent_id', 'parentId']) ||
          archiveId ||
          '0'
        const key = pickString(item, ['category_key', 'categoryKey', 'custom_key'])
        const existing = byId.get(id)
        if (existing) {
          if (!existing.key && key) existing.key = key
          continue
        }
        byId.set(id, {
          id,
          name,
          parentId,
          key,
          childrenIds: [],
        })
        const parent = byId.get(parentId)
        if (parent && !parent.childrenIds.includes(id)) {
          parent.childrenIds.push(id)
        } else if (archiveId && parentId === archiveId) {
          const archive = byId.get(archiveId)
          if (archive && !archive.childrenIds.includes(id)) archive.childrenIds.push(id)
        }
      }
    } catch (err) {
      console.warn('[Knowledge] document discover categories failed:', err)
    }
  }

  const list = [...byId.values()]
  console.warn('[Knowledge] discovered categories from documents', {
    count: list.length,
    names: list.map((c) => c.name),
  })
  return list
}

function extractDocumentItems(raw: unknown): Record<string, unknown>[] {
  if (raw == null) return []
  if (Array.isArray(raw)) {
    return raw.filter((item) => item && typeof item === 'object') as Record<string, unknown>[]
  }
  if (typeof raw !== 'object') return []
  const obj = raw as Record<string, unknown>
  for (const key of ['list', 'items', 'data', 'documents', 'records', 'rows']) {
    const value = obj[key]
    if (Array.isArray(value)) {
      return value.filter((item) => item && typeof item === 'object') as Record<string, unknown>[]
    }
  }
  return []
}

/**
 * 仅加载「教师成果库」下与归属键（手机号）同名的文件夹（及其子文件夹）中的文档。
 */
export async function fetchArchivePlansForOwnerFolder(
  folderName: string,
  options: { keyword?: string; limit?: number } = {}
): Promise<{
  plans: TeachingPlan[]
  source: KnowledgeSource
  folders: KnowledgeCategory[]
  folderName: string
  error?: string
}> {
  const key = folderName.trim()
  const scope = archiveKnowledgeScope()
  if (!key) {
    return {
      plans: [],
      source: 'empty',
      folders: [],
      folderName: '',
      error: '未能获取手机号，无法匹配个人成果文件夹',
    }
  }
  if (!scope.categoryId) {
    return {
      plans: [],
      source: 'empty',
      folders: [],
      folderName: key,
      error: '未配置教师成果库分类',
    }
  }

  const { categories, error: catError, rawCount } = await fetchKnowledgeCategories(
    scope.knowledgeId
  )
  const archiveParentId = resolveArchiveParentId(categories, scope.categoryId)
  const childNames = listArchiveChildFolderNames(categories, archiveParentId)
  if (import.meta.env.DEV) {
    console.warn('[ArchiveKB] categories', {
      knowledgeId: scope.knowledgeId,
      configuredArchiveId: scope.categoryId,
      resolvedArchiveId: archiveParentId,
      folderName: key,
      categoryCount: categories.length,
      rawCount: rawCount ?? null,
      catError: catError || null,
      archiveChildNames: childNames,
      sampleNames: categories.slice(0, 20).map((c) => ({
        id: c.id,
        name: c.name,
        parentId: c.parentId,
        childrenIds: c.childrenIds,
      })),
    })
  }
  if (catError && categories.length === 0) {
    return {
      plans: [],
      source: 'empty',
      folders: [],
      folderName: key,
      error: isAuthError(catError) ? '请先登录平台后加载教师成果库' : catError,
    }
  }
  if (categories.length === 0) {
    return {
      plans: [],
      source: 'empty',
      folders: [],
      folderName: key,
      error: '知识库分类列表为空，请确认已登录且 X-Uid-Hash 有效后刷新',
    }
  }

  const folders = resolveTeacherArchiveFolders(categories, archiveParentId, key)
  if (import.meta.env.DEV) {
    console.warn('[ArchiveKB] owner folders', {
      folderName: key,
      archiveChildNames: childNames,
      matched: folders.map((f) => ({ id: f.id, name: f.name, parentId: f.parentId })),
    })
  }
  if (folders.length === 0) {
    const hint =
      childNames.length > 0
        ? `教师成果库下现有文件夹：${childNames.join('、')}。未找到与手机号「${key}」同名的文件夹。`
        : `未找到与手机号「${key}」对应的文件夹（分类共 ${categories.length} 个）。请在知识库「教师成果库」下创建同名文件夹后刷新。`
    return {
      plans: [],
      source: 'empty',
      folders: [],
      folderName: key,
      error: hint,
    }
  }

  const results = await Promise.all(
    folders.map((folder) =>
      fetchKnowledgePlans({
        keyword: options.keyword,
        knowledgeId: scope.knowledgeId,
        categoryId: folder.id,
        categoryKey: folder.key,
        limit: options.limit ?? 50,
        fallbackPreset: false,
      })
    )
  )

  const seen = new Set<string>()
  const plans: TeachingPlan[] = []
  let platformOk = false
  let lastError = ''
  for (const result of results) {
    if (result.source === 'platform') platformOk = true
    if (result.error) lastError = result.error
    for (const plan of result.plans) {
      if (seen.has(plan.id)) continue
      seen.add(plan.id)
      plans.push(plan)
    }
  }

  if (plans.length > 0) {
    return { plans, source: 'platform', folders, folderName: key }
  }
  if (platformOk) {
    return { plans: [], source: 'empty', folders, folderName: key }
  }
  return {
    plans: [],
    source: 'empty',
    folders,
    folderName: key,
    error: lastError || '教师成果库暂无文档',
  }
}

/** @deprecated 使用 fetchArchivePlansForOwnerFolder */
export async function fetchArchivePlansForNickname(
  nickname: string,
  options: { keyword?: string; limit?: number } = {}
) {
  const result = await fetchArchivePlansForOwnerFolder(nickname, options)
  return { ...result, nickname: result.folderName }
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
  return /401|403|token|未授权|登录|cookie|forbidden/i.test(message)
}

export async function fetchKnowledgePlans(
  options: FetchKnowledgePlansOptions = {}
): Promise<{ plans: TeachingPlan[]; source: KnowledgeSource; error?: string }> {
  const knowledgeId = (options.knowledgeId || getDefaultKnowledgeId()).trim()
  // 显式传入 categoryId/categoryKey（含空字符串）时不回退教案默认分类，避免串库
  const hasExplicitCategory =
    options.categoryId !== undefined || options.categoryKey !== undefined
  const categoryId = (
    hasExplicitCategory ? options.categoryId || '' : getDefaultCategoryId()
  ).trim()
  const categoryKey = (
    hasExplicitCategory ? options.categoryKey || '' : getDefaultCategoryKey()
  ).trim()
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
  const hasExplicitCategory =
    params.categoryId !== undefined || params.categoryKey !== undefined
  const categoryId = (
    hasExplicitCategory ? params.categoryId || '' : getDefaultCategoryId()
  ).trim()
  const categoryKey = (
    hasExplicitCategory ? params.categoryKey || '' : getDefaultCategoryKey()
  ).trim()

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
