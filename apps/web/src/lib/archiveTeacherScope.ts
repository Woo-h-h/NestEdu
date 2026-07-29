import type { AuthInfo } from '@zcat-open/auth-bridge'

export interface KnowledgeCategoryNode {
  id: string
  name: string
  parentId: string
  key: string
  childrenIds: string[]
}

export function mapKnowledgeCategory(raw: Record<string, unknown>): KnowledgeCategoryNode | null {
  const id = pickId(raw, ['id', 'category_id', 'categoryId'])
  const name = pickText(raw, ['name', 'title', 'label', 'category_name'])
  if (!id || !name) return null
  return {
    id,
    name,
    parentId: pickId(raw, ['parent_id', 'parentId', 'pid', 'parent']) || '0',
    key: pickText(raw, ['key', 'category_key', 'categoryKey', 'custom_key']),
    childrenIds: pickIdList(raw, ['children_ids', 'childrenIds', 'child_ids', 'children']),
  }
}

/**
 * 将平台分类列表展平。平台通常返回扁平数组（含 parent_id / children_ids）；
 * 若偶发嵌套 children，也一并展开并补全 parentId。
 */
export function flattenKnowledgeCategories(rawList: unknown[]): KnowledgeCategoryNode[] {
  const byId = new Map<string, KnowledgeCategoryNode>()

  const walk = (items: unknown[], inferredParentId: string) => {
    for (const item of items) {
      if (!item || typeof item !== 'object') continue
      const raw = item as Record<string, unknown>
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
      const child = byId.get(childId)
      if (!child) continue
      if (!child.parentId || child.parentId === '0') {
        child.parentId = node.id
      }
    }
  }

  return [...byId.values()]
}

/** 规范化文件夹名：去空白，便于手机号比对 */
export function normalizeFolderName(name: string): string {
  return name.trim().replace(/\s+/g, '')
}

export function ownerFolderNameMatches(folderName: string, phone: string): boolean {
  if (!phone.trim()) return false
  return normalizeFolderName(folderName) === normalizeFolderName(phone)
}

/**
 * 在「教师成果库」下，找出名称与手机号一致的文件夹，并包含其全部子孙分类。
 * 文件夹名须与登录手机号一致（如 17362955307）。
 *
 * 匹配策略（兼容平台两种树字段）：
 * 1. 从成果库节点的 children_ids 向下收集
 * 2. 再按 parent_id 链兜底
 */
export function resolveTeacherArchiveFolders(
  categories: KnowledgeCategoryNode[],
  archiveParentId: string,
  phone: string
): KnowledgeCategoryNode[] {
  const phoneKey = normalizeFolderName(phone)
  const parent = archiveParentId.trim()
  if (!phoneKey || !parent || categories.length === 0) return []

  const byId = new Map(categories.map((item) => [item.id, item]))
  const underArchive = collectUnderArchive(parent, byId, categories)

  const namedRoots = [...underArchive.values()].filter(
    (item) => item.id !== parent && normalizeFolderName(item.name) === phoneKey
  )

  // 兜底：父子关系字段缺失时，仍按手机号精确匹配文件夹名（不会匹配其他老师号码）
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
  const parent = archiveParentId.trim()
  if (!parent) return []
  const byId = new Map(categories.map((item) => [item.id, item]))
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

  // 优先：父节点 children_ids（平台 SPA 也是这样建树）
  if (archiveNode) {
    const directChildIds =
      archiveNode.childrenIds.length > 0
        ? archiveNode.childrenIds
        : categories.filter((item) => item.parentId === archiveParentId).map((item) => item.id)
    for (const childId of directChildIds) {
      collectSubtree(childId, byId, under)
    }
  }

  // 兜底：按 parent_id 向上能走到成果库的节点
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
  const root = byId.get(rootId)
  if (!root || selected.has(rootId)) return
  selected.set(rootId, root)

  const childIds =
    root.childrenIds.length > 0
      ? root.childrenIds
      : [...byId.values()].filter((item) => item.parentId === rootId).map((item) => item.id)

  for (const childId of childIds) {
    collectSubtree(childId, byId, selected)
  }
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))]
}

function pickText(item: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = item[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
    if (value && typeof value === 'object') {
      const nested = pickText(value as Record<string, unknown>, [
        'id',
        'category_id',
        'categoryId',
        'name',
        'value',
      ])
      if (nested) return nested
    }
  }
  return ''
}

function pickId(item: Record<string, unknown>, keys: string[]): string {
  return pickText(item, keys)
}

function pickIdList(item: Record<string, unknown>, keys: string[]): string[] {
  for (const key of keys) {
    const value = item[key]
    if (!Array.isArray(value)) continue
    // children 可能是对象数组而非 id 列表；仅抽取 id
    const ids = value
      .map((entry) => {
        if (typeof entry === 'string' || typeof entry === 'number') return String(entry)
        if (entry && typeof entry === 'object') {
          return pickId(entry as Record<string, unknown>, ['id', 'category_id', 'categoryId', 'value'])
        }
        return ''
      })
      .filter(Boolean)
    if (ids.length > 0) return ids
  }
  return []
}
