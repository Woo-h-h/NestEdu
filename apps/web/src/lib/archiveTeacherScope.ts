import type { AuthInfo } from '@zcat-open/auth-bridge'

/** 仅取可对齐知识库文件夹名的昵称；无昵称时返回空串（不做 uid/「老师」回退） */
export function resolveAuthNickname(authInfo: AuthInfo | null | undefined): string {
  if (!authInfo) return ''

  const hint = authInfo.displayNameHint
  if (typeof hint === 'string' && hint.trim()) return hint.trim()

  const fromRecord = (record: Record<string, unknown> | null | undefined): string => {
    if (!record) return ''
    for (const key of [
      'nickname',
      'nick_name',
      'nickName',
      'display_name',
      'displayName',
      'user_name',
      'userName',
      'name',
    ]) {
      const value = record[key]
      if (typeof value === 'string' && value.trim()) return value.trim()
    }
    return ''
  }

  if (authInfo.user && typeof authInfo.user === 'object') {
    const fromUser = fromRecord(authInfo.user as Record<string, unknown>)
    if (fromUser) return fromUser
  }

  return fromRecord(authInfo as unknown as Record<string, unknown>)
}

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

/** 在教师成果库下，找出名称与昵称完全一致的文件夹，并包含其全部子孙分类 */
export function resolveTeacherArchiveFolders(
  categories: KnowledgeCategoryNode[],
  archiveParentId: string,
  nickname: string
): KnowledgeCategoryNode[] {
  const nick = nickname.trim()
  const parent = archiveParentId.trim()
  if (!nick || !parent || categories.length === 0) return []

  const byId = new Map(categories.map((item) => [item.id, item]))
  const underArchive = categories.filter((item) => isUnderParent(item.id, parent, byId))

  const namedRoots = underArchive.filter((item) => item.name.trim() === nick)
  if (namedRoots.length === 0) return []

  const selected = new Map<string, KnowledgeCategoryNode>()
  for (const root of namedRoots) {
    collectSubtree(root.id, byId, selected)
  }
  return [...selected.values()]
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
