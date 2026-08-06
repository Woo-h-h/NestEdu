import type { TeachingPlan } from '@/types/weeklyPlan'
import { presetTeachingPlans } from '@/data/teachingPlans'
import { request } from '@/api/client'
import { authBridge } from '@/lib/authBridge'
import { getApiErrorMessage } from '@/lib/apiError'
import {
  listArchiveChildFolderNames,
  ownerFolderNameMatches,
  resolveArchiveParentId,
  resolveTeacherArchiveFolders,
} from '@/lib/archiveTeacherScope'
import { NestEduKnowledgeCategoryCodec } from '@/lib/knowledgeCategoryMap'
import { enrichPlanTaxonomy } from '@/lib/planTaxonomy'
import { uploadPlatformFile } from '@/api/platformFile'
import {
  buildArchiveAttachmentContent,
  extractArchiveFileText,
  isArchiveTextExtractable,
} from '@/lib/extractArchiveFileText'

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
const PLATFORM_FILE_UPLOAD_PATH = '/api/knowledge/document/file'
const PLATFORM_BINARY_UPLOAD_PATH = '/api/file/upload'
const PLATFORM_DELETE_PATH = '/api/knowledge/document/delete'

const MAX_UPLOAD_FILE_BYTES = 50 * 1024 * 1024

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

/** 教案 / 活动方案知识库作用域（教案知识库管理 20806） */
export function activityPlanKnowledgeScope() {
  return {
    knowledgeId: getDefaultKnowledgeId(),
    categoryId: getDefaultCategoryId(),
    categoryKey: getDefaultCategoryKey(),
  }
}

function normalizeCategoryLabel(name: string): string {
  return name.trim().replace(/\s+/g, '')
}

/**
 * 从平台分类树按显示名解析真实 category_id / category_key。
 * 教案必须落到「教案知识库管理」（非手机号文件夹、非根目录、非未分类）。
 * 平台入库需同时带 category_id + category_key；key 无效时会触发智能分类进手机号夹。
 */
export async function resolveLiveBusinessCategory(
  kind: 'activity' | 'weekly'
): Promise<{ knowledgeId: string; categoryId: string; categoryKey: string; categoryName: string }> {
  const fallback =
    kind === 'activity' ? activityPlanKnowledgeScope() : weeklyPlanKnowledgeScope()
  const preferredNames =
    kind === 'activity' ? ['教案知识库管理'] : ['周计划管理', '周计划知识库', '周计划']
  const defaultName = kind === 'activity' ? '教案知识库管理' : '周计划管理'

  const isPhoneLike = (value: string) => /^1\d{10}$/.test(value.trim())

  const withKey = (categoryId: string, liveKey: string, categoryName: string) => {
    if (isPhoneLike(categoryId) || isPhoneLike(liveKey) || isPhoneLike(categoryName)) {
      throw new Error(
        `解析到的分类异常（疑似手机号文件夹 ${categoryName || categoryId}），已中止。请确认知识库存在「${defaultName}」。`
      )
    }
    const categoryKey = (liveKey || '').trim() || fallback.categoryKey
    if (!categoryId || !categoryKey) {
      throw new Error(`未能解析「${defaultName}」的分类 id/key，请检查知识库权限或 .env 配置`)
    }
    return {
      knowledgeId: fallback.knowledgeId,
      categoryId,
      categoryKey,
      categoryName: categoryName || defaultName,
    }
  }

  try {
    const { categories } = await fetchKnowledgeCategories(fallback.knowledgeId)
    if (categories.length === 0) {
      return { ...fallback, categoryName: defaultName }
    }

    for (const label of preferredNames) {
      const want = normalizeCategoryLabel(label)
      const hit = categories.find((c) => normalizeCategoryLabel(c.name) === want)
      if (hit?.id) {
        const resolved = withKey(hit.id, hit.key || '', hit.name)
        console.info('[Knowledge] resolveLiveBusinessCategory', {
          kind,
          matchedName: hit.name,
          categoryId: resolved.categoryId,
          categoryKey: resolved.categoryKey,
          keySource: (hit.key || '').trim() ? 'tree' : 'fallback',
        })
        return resolved
      }
    }

    const byId = categories.find((c) => c.id === fallback.categoryId)
    if (byId) {
      const resolved = withKey(byId.id, byId.key || '', byId.name || defaultName)
      // 固定 id 命中但名称是手机号 → 拒绝
      if (isPhoneLike(byId.name)) {
        throw new Error(
          `分类 ${byId.id} 显示名为手机号「${byId.name}」，不是「${defaultName}」。请到平台核对知识库分类。`
        )
      }
      console.info('[Knowledge] resolveLiveBusinessCategory byId', {
        kind,
        categoryId: resolved.categoryId,
        categoryKey: resolved.categoryKey,
        categoryName: resolved.categoryName,
        keySource: (byId.key || '').trim() ? 'tree' : 'fallback',
      })
      return resolved
    }
  } catch (err) {
    if (err instanceof Error && /手机号|中止|未能解析/.test(err.message)) throw err
    console.warn('[Knowledge] resolveLiveBusinessCategory failed, use env fallback', err)
  }
  return { ...fallback, categoryName: defaultName }
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

/**
 * 上传前从平台分类树解析登录教师个人成果文件夹（id + key + 显示名）。
 * 平台入库需 category_id 与 category_key 配对；缺 key 或误走 document/file 易落到「教师成果库」根目录。
 */
export async function resolveLiveArchiveOwnerFolder(
  phoneInput?: string
): Promise<{
  knowledgeId: string
  categoryId: string
  categoryKey: string
  categoryName: string
}> {
  const { getCurrentTeacherPhone } = await import('@/api/platformUser')
  const phone = (phoneInput || (await getCurrentTeacherPhone())).trim()
  if (!phone) {
    throw new Error('未能获取手机号，无法上传到个人成果文件夹')
  }

  const scope = archiveKnowledgeScope()
  if (!scope.categoryId) {
    throw new Error('未配置教师成果库分类')
  }

  const { categories } = await fetchKnowledgeCategories(scope.knowledgeId)
  const archiveParentId = resolveArchiveParentId(categories, scope.categoryId)
  const folders = resolveTeacherArchiveFolders(categories, archiveParentId, phone)
  const folder =
    folders.find(
      (item) => item.id !== archiveParentId && ownerFolderNameMatches(item.name, phone)
    ) || folders[0]

  if (!folder) {
    const childNames = listArchiveChildFolderNames(categories, archiveParentId)
    const hint =
      childNames.length > 0
        ? `教师成果库下现有文件夹：${childNames.join('、')}`
        : '请先在教师成果库下创建与手机号同名的文件夹'
    throw new Error(`未找到与手机号「${phone}」对应的文件夹。${hint}`)
  }

  let categoryKey = (folder.key || '').trim()
  if (!categoryKey) {
    categoryKey = await resolveCategoryKeyFromFolderDocuments(scope.knowledgeId, folder.id)
  }
  if (!categoryKey) {
    throw new Error(
      `文件夹「${folder.name}」缺少 category_key，无法准确入库。请在平台打开该文件夹复制地址栏中的 category_key，或先在该文件夹上传一份文档后重试。`
    )
  }

  const resolved = {
    knowledgeId: scope.knowledgeId,
    categoryId: folder.id,
    categoryKey,
    categoryName: folder.name,
  }
  console.info('[Knowledge] resolveLiveArchiveOwnerFolder', resolved)
  return resolved
}

/** 从文件夹内已有文档反推 category_key（分类树未带 key 时的兜底） */
async function resolveCategoryKeyFromFolderDocuments(
  knowledgeId: string,
  folderId: string
): Promise<string> {
  try {
    const envelope = await request.post<ApiEnvelope>(PLATFORM_LIST_PATH, {
      knowledge_id: parseIdValue(knowledgeId),
      category_id: parseIdValue(folderId),
      current: 1,
      pageSize: 5,
    })
    assertSuccess(envelope, '读取文件夹文档失败')
    const items = extractDocumentItems(envelope.result)
    for (const item of items) {
      const key = pickString(item, ['category_key', 'categoryKey', 'custom_key'])
      if (key) return key
    }
  } catch (err) {
    console.warn('[Knowledge] resolveCategoryKeyFromFolderDocuments failed', err)
  }
  return ''
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

    // 通过对象方法映射，避免 minify 顶层短名与 React 冲突（曾导致 array:5 → mappedCount:0）
    const categories = NestEduKnowledgeCategoryCodec.flatten(bestList)
    debug.rawCount = bestList.length
    debug.mappedCount = categories.length
    debug.sampleRaw = NestEduKnowledgeCategoryCodec.summarize(bestList, 5)
    debug.envelopeKeys =
      lastEnvelope && typeof lastEnvelope === 'object' ? Object.keys(lastEnvelope) : []
    debug.mapperChunk = 'NestEduKnowledgeCategoryCodec'

    if (bestList.length > 0 && categories.length === 0) {
      console.error('[Knowledge] category mapping produced 0 from non-empty list', {
        rawCount: bestList.length,
        sampleRaw: debug.sampleRaw,
      })
    } else {
      console.warn('[Knowledge] category/list', {
        ...debug,
        names: categories.map((c) => c.name),
      })
    }

    // 映射不完整时合并文档反推结果
    if (categories.length < bestList.length) {
      const discovered = await discoverCategoriesFromDocuments(kid)
      debug.discoveredFromDocuments = discovered.length
      if (discovered.length > 0) {
        const merged = mergeCategories(categories, discovered)
        debug.mappedCount = merged.length
        return { categories: merged, rawCount: bestList.length, debug }
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

function mergeCategories(
  primary: KnowledgeCategory[],
  secondary: KnowledgeCategory[]
): KnowledgeCategory[] {
  const byId = new Map<string, KnowledgeCategory>()
  for (const item of [...primary, ...secondary]) {
    const existing = byId.get(item.id)
    if (!existing) {
      byId.set(item.id, { ...item, childrenIds: [...item.childrenIds] })
      continue
    }
    existing.childrenIds = [...new Set([...existing.childrenIds, ...item.childrenIds])]
    if (!existing.key && item.key) existing.key = item.key
    if ((!existing.parentId || existing.parentId === '0') && item.parentId !== '0') {
      existing.parentId = item.parentId
    }
  }
  return [...byId.values()]
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

/** 平台详情常把正文放在 document / file / data 等嵌套对象里 */
function flattenDocumentFields(item: Record<string, unknown>): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...item }
  for (const wrap of ['document', 'doc', 'file', 'data', 'info', 'record', 'result', 'detail']) {
    const inner = item[wrap]
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      Object.assign(merged, inner as Record<string, unknown>)
    }
  }
  return merged
}

function pickDocumentContent(item: Record<string, unknown>): string {
  const src = flattenDocumentFields(item)
  return pickString(src, [
    'content',
    'text',
    'markdown',
    'md_content',
    'mdContent',
    'file_content',
    'fileContent',
    'raw_text',
    'rawText',
    'parsed_content',
    'parsedContent',
    'full_text',
    'fullText',
    'body',
    'detail',
    'description',
    'desc',
    'summary',
    'intro',
    'objectives',
  ])
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max)
}

/** 成果库文档标题比对：平台常带 .md/.png 等后缀，上传侧可能不带 */
function normalizeArchiveDocTitle(title: string): string {
  return title.trim().replace(/\.[^.]+$/, '').toLowerCase()
}

function archiveDocTitlesMatch(a: string, b: string): boolean {
  const left = a.trim()
  const right = b.trim()
  if (!left || !right) return false
  if (left === right) return true
  return normalizeArchiveDocTitle(left) === normalizeArchiveDocTitle(right)
}

function mapTeachingPlan(plan: Partial<TeachingPlan> & Record<string, unknown>): TeachingPlan {
  return enrichPlanTaxonomy({
    id: String(plan.id || ''),
    title: String(plan.title || ''),
    domain: String(plan.domain || '综合'),
    gradeLevel: String(plan.gradeLevel || '通用'),
    objectives: String(plan.objectives || ''),
    content: String(plan.content || ''),
    source: (plan.source as TeachingPlan['source']) || 'platform',
    knowledgeId: plan.knowledgeId ? String(plan.knowledgeId) : undefined,
  })
}

function mapPlanMaps(items: Record<string, unknown>[], knowledgeId: string): TeachingPlan[] {
  const plans: TeachingPlan[] = []
  for (const rawItem of items) {
    const item = flattenDocumentFields(rawItem)
    const title = pickString(item, ['title', 'name', 'file_name', 'display_name', 'plan_name'])
    if (!title) continue

    let id = pickString(item, ['document_id', 'id', 'doc_id', 'item_id'])
    if (!id) id = title

    let content = pickDocumentContent(rawItem)
    let objectives = pickString(item, ['objectives', 'desc', 'description', 'summary', 'intro'])
    if (!content) content = objectives
    if (!objectives) objectives = truncate(content, 100)

    // 不要把知识库分类文件夹名误当成五领域
    const rawDomain = pickString(item, ['domain', 'subject', 'knowledge_tag'])
    const rawGrade = pickString(item, ['gradeLevel', 'grade_level', 'grade', 'class_name'])

    plans.push(
      enrichPlanTaxonomy({
        id,
        title,
        domain: rawDomain || '综合',
        gradeLevel: rawGrade || '通用',
        objectives,
        content,
        source: 'platform',
        knowledgeId:
          pickString(item, ['knowledge_id', 'knowledgeId']) || knowledgeId || undefined,
      })
    )
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
  // 详情接口常见：{ document: {...} } / { data: {...} }
  for (const wrap of ['document', 'doc', 'file', 'data', 'info', 'record']) {
    const inner = obj[wrap]
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      const nested = mapPlanMaps([inner as Record<string, unknown>], knowledgeId)
      if (nested.length > 0) return nested
    }
  }
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

function pickEnvelopeTotal(envelope: ApiEnvelope, planCount: number): number {
  if (typeof envelope.total === 'number' && Number.isFinite(envelope.total) && envelope.total >= 0) {
    return envelope.total
  }
  if (envelope.result && typeof envelope.result === 'object' && !Array.isArray(envelope.result)) {
    const nested = envelope.result as Record<string, unknown>
    const nestedTotal = nested.total
    if (typeof nestedTotal === 'number' && Number.isFinite(nestedTotal) && nestedTotal >= 0) {
      return nestedTotal
    }
  }
  return planCount
}

export async function fetchKnowledgePlans(
  options: FetchKnowledgePlansOptions = {}
): Promise<{ plans: TeachingPlan[]; source: KnowledgeSource; error?: string; total?: number }> {
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
    const total = pickEnvelopeTotal(envelope, plans.length)
    if (plans.length > 0) return { plans, source: 'platform', total }
    return { plans: [], source: 'empty', total }
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

    const preset = presetTeachingPlans.map((plan) => ({ ...plan, source: 'preset' as const }))
    return {
      plans: preset,
      source: 'preset',
      error: platformMsg,
      total: preset.length,
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
  /**
   * 强制业务库，避免误入教师成果库 / 手机号文件夹。
   * 活动方案 / 周计划入库应显式传入。
   */
  forceKind?: 'activity' | 'weekly' | 'archive'
}): Promise<TeachingPlan> {
  const title = params.title.trim()
  let content = params.content.trim()
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
  let categoryId = (
    hasExplicitCategory ? params.categoryId || '' : getDefaultCategoryId()
  ).trim()
  let categoryKey = (
    hasExplicitCategory ? params.categoryKey || '' : getDefaultCategoryKey()
  ).trim()

  const titleIsActivity = /_活动方案_/.test(title)
  const titleIsWeekly = /_周计划_/.test(title)
  const forceKind =
    params.forceKind ||
    (titleIsActivity ? 'activity' : titleIsWeekly ? 'weekly' : undefined)

  // 成果库页禁止上传活动方案/周计划（即使用户选了成果库确认上传）
  if (forceKind === 'archive' && (titleIsActivity || titleIsWeekly)) {
    throw new Error(
      '活动方案 / 周计划请到「活动方案」或「周计划」页入库，不能上传到教师成果库'
    )
  }

  // 活动方案 / 周计划：强制纠正到业务库，并清除正文中的手机号信号（防智能分类进 173… 文件夹）
  let categoryName = ''
  let archiveOwner: Awaited<ReturnType<typeof resolveLiveArchiveOwnerFolder>> | null = null
  if (forceKind === 'activity' || (forceKind !== 'archive' && titleIsActivity)) {
    const activity = await resolveLiveBusinessCategory('activity')
    console.warn('[Knowledge] 活动方案目标分类', {
      from: { categoryId, categoryKey },
      to: activity,
      forceKind,
      title,
    })
    categoryId = activity.categoryId
    categoryKey = activity.categoryKey
    categoryName = activity.categoryName
    content = await scrubBusinessUploadContent(content)
  } else if (forceKind === 'weekly' || (forceKind !== 'archive' && titleIsWeekly)) {
    const weekly = await resolveLiveBusinessCategory('weekly')
    console.warn('[Knowledge] 周计划目标分类', {
      from: { categoryId, categoryKey },
      to: weekly,
      forceKind,
      title,
    })
    categoryId = weekly.categoryId
    categoryKey = weekly.categoryKey
    categoryName = weekly.categoryName
    content = await scrubBusinessUploadContent(content)
  } else if (forceKind === 'archive') {
    archiveOwner = await resolveLiveArchiveOwnerFolder()
    categoryId = archiveOwner.categoryId
    categoryKey = archiveOwner.categoryKey
    categoryName = archiveOwner.categoryName
  }

  if (!categoryId && !categoryKey) {
    throw new Error('上传失败：未指定知识库分类（教案库 / 周计划库 / 成果库）')
  }

  const mustGuardBusinessLib =
    forceKind === 'activity' ||
    forceKind === 'weekly' ||
    (forceKind !== 'archive' && (titleIsActivity || titleIsWeekly))
  if (
    mustGuardBusinessLib &&
    (/^1\d{10}$/.test(categoryId) ||
      /^1\d{10}$/.test(categoryKey) ||
      categoryId === getArchiveCategoryId() ||
      categoryKey === getArchiveCategoryKey())
  ) {
    throw new Error(
      '上传目标异常：活动方案/周计划不能写入教师成果库或手机号文件夹，请检查分类配置后重试'
    )
  }

  if (mustGuardBusinessLib && !categoryKey) {
    throw new Error('上传失败：知识库分类配置不完整，请联系管理员后重试')
  }

  if (forceKind === 'archive' && !categoryKey) {
    throw new Error('上传失败：个人成果文件夹缺少 category_key，无法准确入库')
  }

  console.info('[Knowledge] upload', {
    knowledgeId,
    categoryId,
    categoryKey: categoryKey || '(omit)',
    categoryName: categoryName || '(n/a)',
    forceKind: forceKind || null,
    title,
  })

  let envelope: ApiEnvelope
  try {
    if (USE_BFF) {
      envelope = await request.post<ApiEnvelope>(BFF_UPLOAD_PATH, {
        knowledgeId,
        title,
        content,
        categoryId: categoryId || undefined,
        ...(categoryKey ? { categoryKey } : {}),
        ...(categoryName ? { categoryName } : {}),
        ...(forceKind ? { forceKind } : {}),
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
      // 显式分类名，降低平台落到未分类/手机号夹的概率
      if (categoryName) {
        body.category_name = categoryName
        body.display_name = categoryName
      }
      envelope = await request.post<ApiEnvelope>(PLATFORM_UPLOAD_PATH, body)
    }
  } catch (err) {
    throw new Error(getApiErrorMessage(err, '上传知识库失败'))
  }

  assertSuccess(envelope, '上传知识库失败')
  const plans = mapPlatformResult(envelope.result, knowledgeId)
  const uploaded: TeachingPlan = plans[0]
    ? {
        ...plans[0],
        title: plans[0].title || title,
        content: plans[0].content || content,
        objectives: plans[0].objectives || truncate(content, 100),
        source: 'platform',
        knowledgeId,
      }
    : {
        id: `upload_${Date.now()}`,
        title,
        domain: '综合',
        gradeLevel: '通用',
        objectives: truncate(content, 100),
        content,
        source: 'platform',
        knowledgeId,
      }

  if (forceKind === 'activity' || forceKind === 'weekly') {
    await assertLandedInBusinessCategory(forceKind, uploaded, title)
  }

  if (forceKind === 'archive' && archiveOwner) {
    await assertLandedInArchiveOwnerFolder(uploaded, title, archiveOwner)
  }

  return uploaded
}

interface PlatformUploadedFile {
  id: string
  url: string
  name: string
  text: string
}

/**
 * 平台通用文件上传（与 SPA `YN()` / 网盘上传同源）。
 * 知识库原文件接口参数不稳定时，先落地文件再写入 document/text。
 */
async function uploadPlatformBinaryFile(file: File): Promise<PlatformUploadedFile> {
  const attempts: Array<Record<string, string>> = [
    { convert: 'md', tag: 'knowledge' },
    { convert: 'md', tag: 'net_disk', type_id: '5', request_by: 'net_disk' },
    { tag: 'knowledge' },
  ]

  let lastError = '文件上传失败'
  for (const extra of attempts) {
    const formData = new FormData()
    formData.append('file', file, file.name)
    for (const [key, value] of Object.entries(extra)) {
      formData.append(key, value)
    }
    try {
      const envelope = await request.post<ApiEnvelope>(PLATFORM_BINARY_UPLOAD_PATH, formData, {
        timeout: 120000,
      })
      assertSuccess(envelope, '文件上传失败')
      const parsed = parseUploadedFileResult(envelope.result, file.name)
      if (parsed.url || parsed.text || parsed.id) {
        return parsed
      }
      lastError = '文件上传成功但未返回可用地址'
    } catch (err) {
      lastError = getApiErrorMessage(err, '文件上传失败')
      console.warn('[Knowledge] /api/file/upload attempt failed', extra, lastError)
    }
  }
  throw new Error(lastError)
}

function parseUploadedFileResult(raw: unknown, fallbackName: string): PlatformUploadedFile {
  const root =
    raw && typeof raw === 'object' ? flattenDocumentFields(raw as Record<string, unknown>) : {}
  const fileObj =
    root.file && typeof root.file === 'object'
      ? flattenDocumentFields(root.file as Record<string, unknown>)
      : root

  const id = pickString(fileObj, ['id', 'file_id', 'fileId'])
  const url = pickString(fileObj, ['url', 'file_url', 'fileUrl', 'path', 'oss_url'])
  const name =
    pickString(fileObj, ['name', 'file_name', 'fileName', 'title', 'original_name']) || fallbackName
  const text = pickString(fileObj, [
    'content',
    'text',
    'markdown',
    'md',
    'md_content',
    'parsed_content',
    'ocr_text',
    'ocrText',
  ]).trim()

  return { id, url, name, text }
}

function buildArchiveFileDocumentContent(
  file: File,
  uploaded: PlatformUploadedFile,
  title: string
): string {
  const lines: string[] = [
    `# ${title}`,
    '',
    `- 原始文件：${file.name}`,
    `- 大小：${file.size} 字节`,
  ]
  if (uploaded.url) {
    lines.push(`- 文件地址：${uploaded.url}`)
    if (/\.(png|jpe?g|gif|webp|bmp)$/i.test(file.name) || file.type.startsWith('image/')) {
      lines.push('', `![${title}](${uploaded.url})`)
    } else {
      lines.push('', `[打开原文件](${uploaded.url})`)
    }
  }
  if (uploaded.text) {
    lines.push('', '## 解析正文', '', uploaded.text)
  }
  if (!uploaded.url && !uploaded.text) {
    lines.push('', '（平台未返回文件地址或解析正文，请到知识库核对）')
  }
  return lines.join('\n')
}

/**
 * 成果库多格式上传：先 `/api/file/upload`，再写入知识库文本文档。
 * 直接打 `/api/knowledge/document/file` 易返回「参数错误」（字段契约与 SPA 不一致）。
 */
export async function uploadKnowledgeFile(params: {
  file: File
  title?: string
  knowledgeId?: string
  categoryId?: string
  categoryKey?: string
  forceKind?: 'activity' | 'weekly' | 'archive'
}): Promise<TeachingPlan> {
  const file = params.file
  if (!file || file.size === 0) throw new Error('上传文件不能为空')
  if (file.size > MAX_UPLOAD_FILE_BYTES) {
    throw new Error(`文件过大，请控制在 ${Math.round(MAX_UPLOAD_FILE_BYTES / 1024 / 1024)}MB 以内`)
  }

  const title = (params.title || file.name.replace(/\.[^.]+$/, '') || file.name).trim()
  if (!title) throw new Error('文档标题不能为空')

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

  if (params.forceKind === 'archive' && (/_活动方案_/.test(title) || /_周计划_/.test(title))) {
    throw new Error(
      '活动方案 / 周计划请到「活动方案」或「周计划」页入库，不能上传到教师成果库'
    )
  }
  if (!categoryId && !categoryKey) {
    throw new Error('上传失败：未指定知识库分类（教案库 / 周计划库 / 成果库）')
  }

  console.info('[Knowledge] upload file via /api/file/upload → document/text', {
    knowledgeId,
    categoryId,
    categoryKey: categoryKey || '(omit)',
    forceKind: params.forceKind || null,
    title,
    fileName: file.name,
    fileSize: file.size,
  })

  const uploadedFile = await uploadPlatformBinaryFile(file)
  const content = buildArchiveFileDocumentContent(file, uploadedFile, title)

  // 成果库：跳过 document/file（易忽略 category_key / category_name 并落到根目录），统一走 text + 入库校验
  if (params.forceKind === 'archive') {
    return uploadKnowledgeDocument({
      title,
      content,
      knowledgeId,
      categoryId,
      categoryKey,
      forceKind: 'archive',
    })
  }

  // 优先：用 file_id / url 调 document/file（若平台支持）
  const fileRegisterAttempts: Array<Record<string, unknown>> = []
  if (uploadedFile.id || uploadedFile.url) {
    const base: Record<string, unknown> = {
      knowledge_id: parseIdValue(knowledgeId),
      name: title,
      title,
    }
    if (categoryId) base.category_id = parseIdValue(categoryId)
    if (categoryKey) base.category_key = categoryKey
    if (uploadedFile.id) {
      fileRegisterAttempts.push({
        ...base,
        file_id: parseIdValue(uploadedFile.id),
        id: parseIdValue(uploadedFile.id),
      })
    }
    if (uploadedFile.url) {
      fileRegisterAttempts.push({
        ...base,
        file_url: uploadedFile.url,
        url: uploadedFile.url,
      })
    }
  }

  for (const body of fileRegisterAttempts) {
    try {
      const envelope = await request.post<ApiEnvelope>(PLATFORM_FILE_UPLOAD_PATH, body, {
        timeout: 60000,
      })
      assertSuccess(envelope, '登记知识库文件失败')
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
      // 平台只回 success，仍视为可能已入库，继续用 text 兜底会重复；有 id 才信任
      const docId = pickString(
        flattenDocumentFields((envelope.result as Record<string, unknown>) || {}),
        ['document_id', 'id', 'doc_id']
      )
      if (docId) {
        return {
          id: docId,
          title,
          domain: '综合',
          gradeLevel: '通用',
          objectives: truncate(content, 100),
          content,
          source: 'platform',
          knowledgeId,
        }
      }
    } catch (err) {
      console.warn('[Knowledge] document/file register failed, fallback to text', err)
    }
  }

  // 兜底：写入可检索的文本文档（含原文件链接 / OCR 正文）
  return uploadKnowledgeDocument({
    title,
    content,
    knowledgeId,
    categoryId,
    categoryKey,
    forceKind: params.forceKind,
  })
}

/** 业务库上传：清除正文手机号信号，避免智能分类进「17362955307」等文件夹 */
async function scrubBusinessUploadContent(text: string): Promise<string> {
  let out = text
  try {
    const { getCurrentTeacherPhone } = await import('@/api/platformUser')
    const phone = (await getCurrentTeacherPhone()).replace(/\D/g, '')
    if (phone.length >= 11) {
      out = out.split(phone).join('')
    }
  } catch {
    // ignore
  }
  // 整段移除，不要掩码成 173****5307（尾号仍会命中手机号文件夹）
  out = out.replace(/1\d{10}/g, '')
  out = out.replace(/1\d{2}[\s\-_]?\d{4}[\s\-_]?\d{4}/g, (m) => {
    const digits = m.replace(/\D/g, '')
    return digits.length === 11 ? '' : m
  })
  out = out.replace(/教师尾号\s*[：:]\s*\d{3,6}/g, '')
  out = out.replace(/手机号\s*[：:]\s*[\d\*\s\-]{7,}/g, '')
  return out
}

/**
 * 上传后正向校验：必须出现在教案库/周计划库列表中。
 * 若落在手机号同名文件夹（含顶层「17362955307」）则撤回并报错。
 * 不再用「详情可读」作为成功条件（误入手机号夹时详情也能读到）。
 */
async function assertLandedInBusinessCategory(
  kind: 'activity' | 'weekly',
  plan: TeachingPlan,
  title: string
): Promise<void> {
  const live = await resolveLiveBusinessCategory(kind)
  const planId = (plan.id || '').trim()
  const planTitle = title.trim()
  const isSyntheticId = !planId || planId.startsWith('upload_')
  const libName = kind === 'weekly' ? '周计划管理' : '教案知识库管理'

  const matchPlan = (items: TeachingPlan[]) =>
    items.some(
      (item) =>
        (planId && !isSyntheticId && item.id && item.id === planId) ||
        (item.title || '').trim() === planTitle
    )

  const themeKw = planTitle
    .replace(/\.md$/i, '')
    .replace(/^.*?_(?:活动方案|周计划)_/, '')
    .replace(/[：:；;，,.\s]+/g, ' ')
    .trim()
    .slice(0, 36)

  for (let attempt = 0; attempt < 4; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 900 + attempt * 800))

    // 优先检查是否误入手机号文件夹（含顶层，不限于教师成果库子夹）
    const phoneHit = await findInPhoneNamedFolder(plan, title)
    if (phoneHit) {
      try {
        if (phoneHit.id) await deleteKnowledgeDocument(phoneHit.id)
      } catch (err) {
        console.warn('[Knowledge] 撤回误入手机号文件夹文档失败', err)
      }
      throw new Error(
        `平台把文档分到了手机号文件夹「${phoneHit.folderName}」（已尝试撤回），而不是「${libName}」。请确认对该分类有写入权限，上传时不要点击「建议智能分类」，然后重试。`
      )
    }

    const listed = await fetchKnowledgePlans({
      knowledgeId: live.knowledgeId,
      categoryId: live.categoryId,
      categoryKey: live.categoryKey,
      page: 1,
      limit: 100,
      fallbackPreset: false,
    })
    if (matchPlan(listed.plans)) return

    if (themeKw.length >= 2) {
      const searched = await fetchKnowledgePlans({
        knowledgeId: live.knowledgeId,
        categoryId: live.categoryId,
        categoryKey: live.categoryKey,
        keyword: themeKw,
        page: 1,
        limit: 50,
        fallbackPreset: false,
      })
      if (matchPlan(searched.plans)) return
    }
  }

  const phoneHit = await findInPhoneNamedFolder(plan, title)
  if (phoneHit) {
    try {
      if (phoneHit.id) await deleteKnowledgeDocument(phoneHit.id)
    } catch (err) {
      console.warn('[Knowledge] 撤回误入手机号文件夹文档失败', err)
    }
    throw new Error(
      `平台把文档分到了手机号文件夹「${phoneHit.folderName}」（已尝试撤回），而不是「${libName}」。请确认写入权限，勿点「建议智能分类」，然后重试。`
    )
  }

  throw new Error(
    `上传后未在「${libName}」中确认到该文档。请到平台该文件夹核对；若在「未分类」或手机号文件夹，请手动移入「${libName}」或修正分类权限后重试。`
  )
}

/**
 * 成果库上传后校验：必须出现在手机号同名个人文件夹，不能落在「教师成果库」根目录。
 */
async function assertLandedInArchiveOwnerFolder(
  plan: TeachingPlan,
  title: string,
  ownerFolder: { categoryId: string; categoryKey: string; categoryName: string }
): Promise<void> {
  const phone = ownerFolder.categoryName.trim()
  const planId = (plan.id || '').trim()
  const planTitle = title.trim()
  const isSyntheticId = !planId || planId.startsWith('upload_')

  const matchPlan = (items: TeachingPlan[]) =>
    items.some(
      (item) =>
        (planId && !isSyntheticId && item.id && item.id === planId) ||
        archiveDocTitlesMatch(item.title || '', planTitle)
    )

  const scope = archiveKnowledgeScope()

  for (let attempt = 0; attempt < 5; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 900 + attempt * 800))

    // 直接按个人文件夹 category 拉列表（比 keyword 更可靠）
    const folderListed = await fetchKnowledgePlans({
      knowledgeId: scope.knowledgeId,
      categoryId: ownerFolder.categoryId,
      categoryKey: ownerFolder.categoryKey,
      page: 1,
      limit: 50,
      fallbackPreset: false,
    })
    if (matchPlan(folderListed.plans)) return

    const archive = await fetchArchivePlansForOwnerFolder(phone, { limit: 50 })
    if (matchPlan(archive.plans)) return

    const rootListed = await fetchKnowledgePlans({
      knowledgeId: scope.knowledgeId,
      categoryId: scope.categoryId,
      categoryKey: scope.categoryKey,
      page: 1,
      limit: 30,
      fallbackPreset: false,
    })
    const rootHit = rootListed.plans.find(
      (item) =>
        (planId && !isSyntheticId && item.id && item.id === planId) ||
        archiveDocTitlesMatch(item.title || '', planTitle)
    )
    // 仅撤回「本次上传」误入根目录的文档，避免误删同名旧文件
    if (rootHit && planId && !isSyntheticId && rootHit.id === planId) {
      try {
        await deleteKnowledgeDocument(rootHit.id)
      } catch (err) {
        console.warn('[Knowledge] 撤回误入教师成果库根目录文档失败', err)
      }
      throw new Error(
        `文档被存到了「教师成果库」根目录，而不是您的个人文件夹「${phone}」（已尝试撤回）。请刷新后重新上传。`
      )
    }
  }

  throw new Error(
    `上传后未在您的个人文件夹「${phone}」中确认到该文档。若平台已显示成功，请刷新列表；否则请重试。`
  )
}

/** 在任意以手机号命名的分类中查找文档（含侧栏顶层 17362955307） */
async function findInPhoneNamedFolder(
  plan: TeachingPlan,
  title: string
): Promise<(TeachingPlan & { folderName: string }) | null> {
  const { getCurrentTeacherPhone } = await import('@/api/platformUser')
  let phone = ''
  try {
    phone = (await getCurrentTeacherPhone()).replace(/\D/g, '').trim()
  } catch {
    return null
  }
  if (!/^1\d{10}$/.test(phone)) return null

  try {
    const { categories } = await fetchKnowledgeCategories()
    const phoneFolders = categories.filter(
      (c) => c.name.trim() === phone || c.id.trim() === phone
    )
    // 兼容：成果库下同名夹
    const archiveHit = await findInArchiveFolder(plan, title)
    if (archiveHit) {
      return { ...archiveHit, folderName: phone }
    }

    for (const folder of phoneFolders) {
      const listed = await fetchKnowledgePlans({
        knowledgeId: getDefaultKnowledgeId(),
        categoryId: folder.id,
        categoryKey: folder.key || '',
        keyword: title.replace(/\.md$/i, '').slice(0, 40),
        page: 1,
        limit: 30,
        fallbackPreset: false,
      })
      const hit = listed.plans.find(
        (item) =>
          (plan.id && item.id && item.id === plan.id) ||
          (item.title || '').trim() === title.trim()
      )
      if (hit) return { ...hit, folderName: folder.name || phone }
    }
  } catch (err) {
    console.warn('[Knowledge] findInPhoneNamedFolder failed', err)
  }
  return null
}

async function findInArchiveFolder(
  plan: TeachingPlan,
  title: string
): Promise<TeachingPlan | null> {
  const { getCurrentTeacherPhone } = await import('@/api/platformUser')
  let phone = ''
  try {
    phone = (await getCurrentTeacherPhone()).trim()
  } catch {
    return null
  }
  if (!phone) return null
  try {
    const archive = await fetchArchivePlansForOwnerFolder(phone, {
      keyword: title.replace(/\.md$/i, '').replace(/[：:].*$/, '').slice(0, 40),
      limit: 30,
    })
    return (
      archive.plans.find(
        (item) =>
          (plan.id && item.id && item.id === plan.id) ||
          (item.title || '').trim() === title.trim()
      ) || null
    )
  } catch {
    return null
  }
}

export async function deleteKnowledgeDocument(id: string): Promise<void> {
  const documentId = id.trim()
  if (!documentId) throw new Error('文档 ID 不能为空')

  const auth = authBridge.getAuthInfo()
  if (!auth?.token) throw new Error('请先登录平台后再删除')

  try {
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
  } catch (err) {
    throw new Error(getApiErrorMessage(err, '删除知识库文档失败'))
  }
}
