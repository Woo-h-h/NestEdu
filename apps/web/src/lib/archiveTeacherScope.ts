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
    childrenIds: pickIdList(raw, ['children_ids', 'childrenIds', 'child_ids']),
  }
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
  const underArchive = categories.filter((item) => isUnderParent(item.id, parent, byId))

  const namedRoots = underArchive.filter(
    (item) => normalizeFolderName(item.name) === phoneKey
  )
  if (namedRoots.length === 0) return []

  const selected = new Map<string, KnowledgeCategoryNode>()
  for (const root of namedRoots) {
    collectSubtree(root.id, byId, selected)
  }
  return [...selected.values()]
}

/** @deprecated 保留兼容；展示名请用平台 /user/self */
export function resolveAuthNickname(authInfo: AuthInfo | null | undefined): string {
  if (!authInfo) return ''
  const hint = authInfo.displayNameHint
  if (typeof hint === 'string' && hint.trim()) return hint.trim()
  return ''
}

function isUnderParent(
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

function pickText(item: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = item[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
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
    return value
      .map((entry) => {
        if (typeof entry === 'string' || typeof entry === 'number') return String(entry)
        if (entry && typeof entry === 'object') {
          return pickId(entry as Record<string, unknown>, ['id', 'category_id', 'categoryId'])
        }
        return ''
      })
      .filter(Boolean)
  }
  return []
}
