import type { AuthInfo } from '@zcat-open/auth-bridge'
import type { KnowledgeCategoryNode } from '@/lib/knowledgeCategoryMap'

export type { KnowledgeCategoryNode }

export function normalizeFolderName(name: string): string {
  return name.trim().replace(/\s+/g, '')
}

export function ownerFolderNameMatches(folderName: string, phone: string): boolean {
  if (!phone.trim()) return false
  return normalizeFolderName(folderName) === normalizeFolderName(phone)
}

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
