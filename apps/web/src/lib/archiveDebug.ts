import {
  archiveKnowledgeScope,
  fetchArchivePlansForOwnerFolder,
  fetchKnowledgeCategories,
} from '@/api/knowledge'
import { getCachedUidHash, getCurrentTeacherPhone } from '@/api/platformUser'
import { listArchiveChildFolderNames, resolveArchiveParentId } from '@/lib/archiveTeacherScope'

export interface ArchiveDebugPayload {
  phone: string
  cachedUidHash: string
  scope: ReturnType<typeof archiveKnowledgeScope>
  categoryCount: number
  categoryError: string | null
  categoryDebug?: Record<string, unknown>
  archiveChildNames: string[]
  resolvedArchiveId: string
  categoryNames: Array<{
    id: string
    name: string
    parentId: string
    childrenIds: string[]
  }>
  archive: Awaited<ReturnType<typeof fetchArchivePlansForOwnerFolder>> | null
}

/** 成果库手机号文件夹匹配诊断（页面按钮 / window.__NEST_ARCHIVE_DEBUG__ 共用） */
export async function runArchiveDebug(): Promise<ArchiveDebugPayload> {
  const phone = await getCurrentTeacherPhone()
  const scope = archiveKnowledgeScope()
  const cats = await fetchKnowledgeCategories(scope.knowledgeId)
  const resolvedArchiveId = resolveArchiveParentId(cats.categories, scope.categoryId)
  const archiveChildNames = listArchiveChildFolderNames(cats.categories, resolvedArchiveId)
  const archive = phone
    ? await fetchArchivePlansForOwnerFolder(phone, { limit: 5 })
    : null

  const payload: ArchiveDebugPayload = {
    phone,
    cachedUidHash: getCachedUidHash(),
    scope,
    categoryCount: cats.categories.length,
    categoryError: cats.error || null,
    categoryDebug: cats.debug,
    archiveChildNames,
    resolvedArchiveId,
    categoryNames: cats.categories.map((c) => ({
      id: c.id,
      name: c.name,
      parentId: c.parentId,
      childrenIds: c.childrenIds,
    })),
    archive,
  }

  console.warn('[ArchiveDebug]', payload)
  return payload
}

export function installArchiveDebugGlobals() {
  if (typeof window === 'undefined') return
  ;(window as Window & { __NEST_ARCHIVE_DEBUG__?: () => Promise<ArchiveDebugPayload> }).__NEST_ARCHIVE_DEBUG__ =
    runArchiveDebug
}
