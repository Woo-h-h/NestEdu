import type { AuthInfo } from '@zcat-open/auth-bridge'

export interface KnowledgeCategoryNode {
  id: string
  name: string
  parentId: string
  key: string
  childrenIds: string[]
}

/** 将平台分类条目映射为统一结构；兼容多种字段名与一层包装 */
export function mapKnowledgeCategory(raw: Record<string, unknown>): KnowledgeCategoryNode | null {
  for (const src of unwrapCategorySources(raw)) {
    const mapped = mapCategoryFields(src)
    if (mapped) return mapped
  }
  return null
}

function unwrapCategorySources(raw: Record<string, unknown>): Record<string, unknown>[] {
  const sources: Record<string, unknown>[] = [raw]
  for (const wrap of ['category', 'node', 'item', 'data', 'record', 'info']) {
    const inner = raw[wrap]
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      sources.push(inner as Record<string, unknown>)
    }
  }
  return sources
}

function mapCategoryFields(raw: Record<string, unknown>): KnowledgeCategoryNode | null {
  const id = pickId(raw, [
    'id',
    'category_id',
    'categoryId',
    'value',
    'key',
    'folder_id',
    'folderId',
  ])
  const name = pickText(raw, [
    'name',
    'title',
    'label',
    'category_name',
    'categoryName',
    'text',
    'folder_name',
    'folderName',
    'display_name',
    'displayName',
  ])
  if (!id || !name) return null

  // value/label 树节点里 key 可能是 custom_xxx，不能当 id；若 id 取自 key 且像 custom_，再尝试别的
  const stableId =
    /^custom_/i.test(id) && pickId(raw, ['id', 'category_id', 'categoryId', 'value', 'folder_id'])
      ? pickId(raw, ['id', 'category_id', 'categoryId', 'value', 'folder_id']) || id
      : id

  return {
    id: stableId,
    name,
    parentId:
      pickId(raw, ['parent_id', 'parentId', 'pid', 'parent_category_id', 'parentCategoryId']) ||
      // parent 若是对象取 id；若是 0/数字已由 pickId 处理；避免把 name 字符串当 parentId
      pickParentId(raw) ||
      '0',
    key: pickText(raw, ['category_key', 'categoryKey', 'custom_key', 'key']),
    childrenIds: pickIdList(raw, ['children_ids', 'childrenIds', 'child_ids', 'children']),
  }
}

function pickParentId(raw: Record<string, unknown>): string {
  const parent = raw.parent
  if (parent === 0 || parent === '0') return '0'
  if (typeof parent === 'number' && Number.isFinite(parent)) return String(parent)
  if (typeof parent === 'string' && /^\d+$/.test(parent.trim())) return parent.trim()
  if (parent && typeof parent === 'object') {
    return pickId(parent as Record<string, unknown>, ['id', 'category_id', 'categoryId', 'value'])
  }
  return ''
}

/**
 * 将平台分类列表展平。平台通常返回扁平数组（含 parent_id / children_ids）；
 * 若偶发嵌套 children，也一并展开并补全 parentId。
 */
export function flattenKnowledgeCategories(rawList: unknown[]): KnowledgeCategoryNode[] {
  const byId = new Map<string, KnowledgeCategoryNode>()

  const walk = (items: unknown[], inferredParentId: string) => {
    for (const item of items) {
      const raw = coerceCategoryObject(item)
      if (!raw) continue
      const mapped = mapKnowledgeCategory(raw)
      if (!mapped) continue

      if (
        inferredParentId &&
        inferredParentId !== '0' &&
        (!mapped.parentId || mapped.parentId === '0')
      ) {
        mapped.parentId = inferredParentId
      }

      const existing = byId.get(mapped.id)
      if (existing) {
        if ((!existing.parentId || existing.parentId === '0') && mapped.parentId !== '0') {
          existing.parentId = mapped.parentId
        }
        if (!existing.key && mapped.key) existing.key = mapped.key
        if (mapped.childrenIds.length > 0) {
          existing.childrenIds = uniqueIds([...existing.childrenIds, ...mapped.childrenIds])
        }
      } else {
        byId.set(mapped.id, mapped)
      }

      const nested =
        (Array.isArray(raw.children) && raw.children) ||
        (Array.isArray(raw.childrens) && raw.childrens) ||
        (Array.isArray(raw.child_list) && raw.child_list) ||
        null
      if (nested) walk(nested, mapped.id)
    }
  }

  walk(rawList, '0')

  // 用父节点 children_ids 反推子节点 parentId（平台偶发子节点 parent_id 仍为 0）
  for (const node of byId.values()) {
    for (const childId of node.childrenIds) {
      const child = byId.get(String(childId))
      if (!child) continue
      if (!child.parentId || child.parentId === '0') {
        child.parentId = node.id
      }
    }
  }

  return [...byId.values()]
}

/** 调试：摘要原始分类条目，便于排查 mappedCount=0 */
export function summarizeRawCategories(rawList: unknown[], limit = 3): unknown[] {
  return rawList.slice(0, limit).map((item) => {
    if (item == null) return { type: 'null' }
    if (typeof item !== 'object') return { type: typeof item, value: item }
    if (Array.isArray(item)) return { type: 'array', length: item.length }
    const obj = item as Record<string, unknown>
    const preview: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj).slice(0, 16)) {
      if (value == null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        preview[key] = value
      } else if (Array.isArray(value)) {
        preview[key] = `array:${value.length}`
      } else if (typeof value === 'object') {
        preview[key] = `{keys:${Object.keys(value as object).join(',')}}`
      } else {
        preview[key] = typeof value
      }
    }
    return { keys: Object.keys(obj), preview }
  })
}

function coerceCategoryObject(item: unknown): Record<string, unknown> | null {
  if (!item) return null
  if (typeof item === 'string') {
    try {
      const parsed = JSON.parse(item) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      return null
    }
    return null
  }
  if (typeof item !== 'object' || Array.isArray(item)) return null
  return item as Record<string, unknown>
}

/** 规范化文件夹名：去空白，便于手机号比对 */
export function normalizeFolderName(name: string): string {
  return name.trim().replace(/\s+/g, '')
}

export function ownerFolderNameMatches(folderName: string, phone: string): boolean {
  if (!phone.trim()) return false
  return normalizeFolderName(folderName) === normalizeFolderName(phone)
}

/** 配置的 category_id 若不在列表中，回退按名称「教师成果库」定位 */
export function resolveArchiveParentId(
  categories: KnowledgeCategoryNode[],
  configuredId: string
): string {
  const configured = configuredId.trim()
  if (configured && categories.some((item) => item.id === configured)) {
    return configured
  }
  const byName = categories.find(
    (item) => normalizeFolderName(item.name) === normalizeFolderName('教师成果库')
  )
  return byName?.id || configured
}

/**
 * 在「教师成果库」下，找出名称与手机号一致的文件夹，并包含其全部子孙分类。
 */
export function resolveTeacherArchiveFolders(
  categories: KnowledgeCategoryNode[],
  archiveParentId: string,
  phone: string
): KnowledgeCategoryNode[] {
  const phoneKey = normalizeFolderName(phone)
  if (!phoneKey || categories.length === 0) return []

  const parent = resolveArchiveParentId(categories, archiveParentId)
  const byId = new Map(categories.map((item) => [item.id, item]))
  const underArchive = parent
    ? collectUnderArchive(parent, byId, categories)
    : new Map<string, KnowledgeCategoryNode>()

  const namedRoots = [...underArchive.values()].filter(
    (item) => item.id !== parent && normalizeFolderName(item.name) === phoneKey
  )

  const roots =
    namedRoots.length > 0
      ? namedRoots
      : categories.filter(
          (item) => item.id !== parent && normalizeFolderName(item.name) === phoneKey
        )

  if (roots.length === 0) return []

  const selected = new Map<string, KnowledgeCategoryNode>()
  for (const root of roots) {
    collectSubtree(root.id, byId, selected)
  }
  return [...selected.values()]
}

/** 调试：成果库下直接可见的子文件夹名 */
export function listArchiveChildFolderNames(
  categories: KnowledgeCategoryNode[],
  archiveParentId: string
): string[] {
  const parent = resolveArchiveParentId(categories, archiveParentId)
  if (!parent) return []
  const byId = new Map(categories.map((item) => [item.id, item]))
  const archiveNode = byId.get(parent)
  if (archiveNode && archiveNode.childrenIds.length > 0) {
    return archiveNode.childrenIds
      .map((id) => byId.get(String(id))?.name || '')
      .filter(Boolean)
  }
  const under = collectUnderArchive(parent, byId, categories)
  return [...under.values()]
    .filter((item) => item.id !== parent && item.parentId === parent)
    .map((item) => item.name)
}

/** @deprecated 保留兼容；展示名请用平台 /user/self */
export function resolveAuthNickname(authInfo: AuthInfo | null | undefined): string {
  if (!authInfo) return ''
  const hint = authInfo.displayNameHint
  if (typeof hint === 'string' && hint.trim()) return hint.trim()
  return ''
}

function collectUnderArchive(
  archiveParentId: string,
  byId: Map<string, KnowledgeCategoryNode>,
  categories: KnowledgeCategoryNode[]
): Map<string, KnowledgeCategoryNode> {
  const under = new Map<string, KnowledgeCategoryNode>()
  const archiveNode = byId.get(archiveParentId)

  if (archiveNode) {
    const directChildIds =
      archiveNode.childrenIds.length > 0
        ? archiveNode.childrenIds.map(String)
        : categories.filter((item) => item.parentId === archiveParentId).map((item) => item.id)
    for (const childId of directChildIds) {
      collectSubtree(childId, byId, under)
    }
  }

  for (const item of categories) {
    if (item.id === archiveParentId) continue
    if (under.has(item.id)) continue
    if (isDescendantOf(item.id, archiveParentId, byId)) {
      under.set(item.id, item)
    }
  }

  return under
}

function isDescendantOf(
  categoryId: string,
  archiveParentId: string,
  byId: Map<string, KnowledgeCategoryNode>
): boolean {
  let current: string | undefined = categoryId
  const seen = new Set<string>()
  while (current) {
    if (current === archiveParentId) return true
    if (seen.has(current)) break
    seen.add(current)
    const node = byId.get(current)
    if (!node) break
    if (node.parentId === archiveParentId) return true
    if (!node.parentId || node.parentId === '0' || node.parentId === current) break
    current = node.parentId
  }
  return false
}

function collectSubtree(
  rootId: string,
  byId: Map<string, KnowledgeCategoryNode>,
  selected: Map<string, KnowledgeCategoryNode>
) {
  const root = byId.get(String(rootId))
  if (!root || selected.has(root.id)) return
  selected.set(root.id, root)

  const childIds =
    root.childrenIds.length > 0
      ? root.childrenIds.map(String)
      : [...byId.values()].filter((item) => item.parentId === root.id).map((item) => item.id)

  for (const childId of childIds) {
    collectSubtree(childId, byId, selected)
  }
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids.map(String).filter(Boolean))]
}

function pickText(item: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = item[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
    if (typeof value === 'bigint') return String(value)
  }
  return ''
}

function pickId(item: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = item[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
    if (typeof value === 'bigint') return String(value)
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = pickId(value as Record<string, unknown>, [
        'id',
        'category_id',
        'categoryId',
        'value',
      ])
      if (nested) return nested
    }
  }
  return ''
}

function pickIdList(item: Record<string, unknown>, keys: string[]): string[] {
  for (const key of keys) {
    const value = item[key]
    if (!Array.isArray(value)) continue
    // children 可能是对象数组；children_ids 一般是 id 列表
    const ids = value
      .map((entry) => {
        if (typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'bigint') {
          return String(entry)
        }
        if (entry && typeof entry === 'object') {
          return pickId(entry as Record<string, unknown>, [
            'id',
            'category_id',
            'categoryId',
            'value',
          ])
        }
        return ''
      })
      .filter(Boolean)
    if (ids.length > 0) return ids
  }
  return []
}
