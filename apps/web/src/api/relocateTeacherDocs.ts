import {
  deleteKnowledgeDocument,
  fetchArchivePlansForOwnerFolder,
  fetchKnowledgePlanById,
  fetchKnowledgePlans,
  resolveLiveBusinessCategory,
  uploadKnowledgeDocument,
} from '@/api/knowledge'
import {
  deleteTeacherGeneratedDocRecord,
  listTeacherGeneratedDocs,
  recordTeacherGeneratedUpload,
  type TeacherGeneratedDocType,
} from '@/api/teacherGeneratedDocs'
import { getCurrentTeacherPhone } from '@/api/platformUser'
import type { TeachingPlan } from '@/types/weeklyPlan'

function ensureBusinessTitle(title: string, kind: TeacherGeneratedDocType): string {
  const t = title.trim() || '未命名.md'
  if (kind === 'activity' && /_活动方案_/.test(t)) return t.endsWith('.md') ? t : `${t}.md`
  if (kind === 'weekly' && /_周计划_/.test(t)) return t.endsWith('.md') ? t : `${t}.md`
  const base = t.replace(/\.md$/i, '')
  const label = kind === 'activity' ? '活动方案' : '周计划'
  if (/^.+?_(?:活动方案|周计划)_/.test(base)) {
    return base.endsWith('.md') ? base : `${base}.md`
  }
  return `纠正_${label}_${base}.md`
}

function hasUsableContent(plan: TeachingPlan | null | undefined): boolean {
  if (!plan) return false
  const text = (plan.content || plan.objectives || '').trim()
  if (!text) return false
  if (text.includes('可能误入教师成果库')) return false
  if (text.includes('不在当前教案')) return false
  return text.length >= 20
}

function pickBestText(...parts: Array<string | undefined>): string {
  return parts
    .map((p) => (p || '').trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)[0] || ''
}

/** 尽量拿回误入文档的正文：详情 → 成果库个人文件夹 → 调用方预填 */
async function resolveMisroutedPlan(params: {
  knowledgeDocId: string
  titleHint?: string
  contentHint?: string
}): Promise<TeachingPlan | null> {
  const id = params.knowledgeDocId.trim()
  const titleHint = (params.titleHint || '').trim()
  const contentHint = (params.contentHint || '').trim()

  const byId = await fetchKnowledgePlanById(id)
  if (hasUsableContent(byId)) return byId

  const phone = (await getCurrentTeacherPhone()).trim()
  let fromArchive: TeachingPlan | null = null
  if (phone) {
    const keyword =
      titleHint.replace(/\.md$/i, '').replace(/^.*?_(?:活动方案|周计划)_/, '').slice(0, 40) ||
      titleHint.slice(0, 40)
    const archive = await fetchArchivePlansForOwnerFolder(phone, {
      keyword: keyword || undefined,
      limit: 50,
    })

    const hit =
      archive.plans.find((p) => (p.id || '').trim() === id) ||
      archive.plans.find((p) => (p.title || '').trim() === titleHint) ||
      archive.plans.find(
        (p) => titleHint && (p.title || '').includes(titleHint.replace(/\.md$/i, '').slice(-20))
      )

    if (hit) {
      if (hasUsableContent(hit)) {
        fromArchive = hit
      } else if (hit.id) {
        const again = await fetchKnowledgePlanById(hit.id)
        fromArchive = hasUsableContent(again)
          ? again
          : {
              ...hit,
              content: pickBestText(hit.content, again?.content, hit.objectives, again?.objectives),
              objectives: pickBestText(
                hit.objectives,
                again?.objectives,
                hit.content,
                again?.content
              ).slice(0, 120),
            }
      } else {
        fromArchive = hit
      }
    }
  }

  if (hasUsableContent(fromArchive)) return fromArchive

  if (contentHint.length >= 20 && !contentHint.includes('可能误入教师成果库') && !contentHint.includes('不在当前教案')) {
    return {
      id: id || fromArchive?.id || byId?.id || '',
      title: titleHint || fromArchive?.title || byId?.title || '未命名.md',
      domain: fromArchive?.domain || byId?.domain || '综合',
      gradeLevel: fromArchive?.gradeLevel || byId?.gradeLevel || '通用',
      objectives: contentHint.slice(0, 120),
      content: contentHint,
      source: 'platform',
    }
  }

  if (fromArchive) {
    return {
      ...fromArchive,
      content: pickBestText(fromArchive.content, byId?.content, contentHint),
      objectives: pickBestText(fromArchive.objectives, byId?.objectives, contentHint).slice(0, 120),
    }
  }
  return byId
}

async function assertLandedInBusinessCategory(params: {
  kind: TeacherGeneratedDocType
  uploaded: TeachingPlan
  title: string
}): Promise<void> {
  const live = await resolveLiveBusinessCategory(params.kind)
  await new Promise((resolve) => setTimeout(resolve, 900))

  const listed = await fetchKnowledgePlans({
    knowledgeId: live.knowledgeId,
    categoryId: live.categoryId,
    categoryKey: live.categoryKey,
    keyword: params.title.replace(/\.md$/i, '').slice(0, 40),
    page: 1,
    limit: 50,
    fallbackPreset: false,
  })

  const hit = listed.plans.find(
    (p) =>
      (params.uploaded.id && p.id && p.id === params.uploaded.id) ||
      (p.title || '').trim() === params.title.trim()
  )
  if (hit) return

  // 列表索引延迟：详情可读且不在成果库则接受
  if (params.uploaded.id && !params.uploaded.id.startsWith('upload_')) {
    const detail = await fetchKnowledgePlanById(params.uploaded.id)
    if (detail) {
      const phone = (await getCurrentTeacherPhone()).trim()
      if (phone) {
        const archive = await fetchArchivePlansForOwnerFolder(phone, {
          keyword: params.title.replace(/\.md$/i, '').slice(0, 40),
          limit: 30,
        })
        const bad = archive.plans.find(
          (p) =>
            (params.uploaded.id && p.id && p.id === params.uploaded.id) ||
            (p.title || '').trim() === params.title.trim()
        )
        if (bad?.id) {
          try {
            await deleteKnowledgeDocument(bad.id)
          } catch (err) {
            console.warn('[relocate] withdraw misrouted retry failed', err)
          }
          throw new Error(
            `纠正后仍落在「教师成果库」。请确认「${params.kind === 'weekly' ? '周计划管理' : '教案知识库管理'}」可写，勿点「建议智能分类」。`
          )
        }
      }
      return
    }
  }

  const phone = (await getCurrentTeacherPhone()).trim()
  if (phone) {
    const archive = await fetchArchivePlansForOwnerFolder(phone, {
      keyword: params.title.replace(/\.md$/i, '').slice(0, 40),
      limit: 30,
    })
    const bad = archive.plans.find(
      (p) =>
        (params.uploaded.id && p.id && p.id === params.uploaded.id) ||
        (p.title || '').trim() === params.title.trim()
    )
    if (bad?.id) {
      try {
        await deleteKnowledgeDocument(bad.id)
      } catch (err) {
        console.warn('[relocate] withdraw misrouted retry failed', err)
      }
    }
  }

  throw new Error(
    `纠正后仍未出现在「${params.kind === 'weekly' ? '周计划管理' : '教案知识库管理'}」。请到平台核对；若已在目标库可刷新本页。若没有，请确认分类可写，勿点「建议智能分类」，然后重新生成入库。`
  )
}

/**
 * 将误入成果库（或其他分类）的本人文档，重新上传到教案库 / 周计划库，
 * 并更新 MySQL 映射；成功后删除旧文档。
 */
export async function relocateTeacherDocToBusinessLib(params: {
  knowledgeDocId: string
  kind: TeacherGeneratedDocType
  titleHint?: string
  /** 列表里已展示的正文，详情接口为空时作兜底 */
  contentHint?: string
}): Promise<{ plan?: TeachingPlan; cleaned?: boolean }> {
  const existing = await resolveMisroutedPlan(params)
  const title = ensureBusinessTitle(
    existing?.title || params.titleHint || '未命名',
    params.kind
  )

  if (!hasUsableContent(existing)) {
    const oldId = (existing?.id || params.knowledgeDocId).trim()
    // 详情常 404、列表只有占位文案：无法自动重传。清理映射时删除平台文件常 403，改为尽力而为。
    if (oldId) {
      try {
        await deleteTeacherGeneratedDocRecord(oldId)
      } catch (err) {
        console.warn('[relocate] delete mysql mapping failed', err)
      }
      try {
        await deleteKnowledgeDocument(oldId)
      } catch (err) {
        console.warn('[relocate] delete platform doc skipped', err)
      }
    }
    throw new Error(
      `「${title}」无法读取平台正文（详情 404 或为空），不能自动纠正到教案库。请到平台「教师成果库」把该文件手动移到「教案知识库管理」，或回到活动方案页重新生成并入库。本地映射已尝试清理。`
    )
  }

  const live = await resolveLiveBusinessCategory(params.kind)
  const body = pickBestText(existing!.content, existing!.objectives, params.contentHint)

  const uploaded = await uploadKnowledgeDocument({
    title,
    content: body,
    knowledgeId: live.knowledgeId,
    categoryId: live.categoryId,
    categoryKey: live.categoryKey,
    forceKind: params.kind,
  })

  await assertLandedInBusinessCategory({
    kind: params.kind,
    uploaded,
    title,
  })

  await recordTeacherGeneratedUpload({
    docType: params.kind,
    plan: uploaded,
    categoryId: live.categoryId,
  })

  const oldId = (existing!.id || params.knowledgeDocId).trim()
  if (oldId && oldId !== uploaded.id) {
    try {
      await deleteKnowledgeDocument(oldId)
    } catch (err) {
      console.warn('[relocate] delete old kb doc failed (可忽略，新文件已在业务库)', err)
    }
    try {
      await deleteTeacherGeneratedDocRecord(oldId)
    } catch (err) {
      console.warn('[relocate] delete old mysql row failed', err)
    }
  }

  return { plan: uploaded }
}

/** 批量纠正：MySQL 中有记录、但当前教案/周计划分类列表里找不到的文档 */
export async function relocateMissingMineDocs(params: {
  kind: TeacherGeneratedDocType
  presentIds: Set<string>
  /** id → 列表已加载正文，供详情为空时兜底 */
  contentById?: Record<string, string>
}): Promise<{ moved: number; cleaned: number; failed: string[] }> {
  const phone = (await getCurrentTeacherPhone()).trim()
  if (!phone) throw new Error('未能获取手机号')

  const rows = await listTeacherGeneratedDocs(phone, params.kind)
  const missing = rows.filter((row) => {
    if ((row.storage || 'platform') === 'mysql') return false
    const id = (row.knowledgeDocId || '').trim()
    return id && !params.presentIds.has(id)
  })

  let moved = 0
  let cleaned = 0
  const failed: string[] = []
  for (const row of missing) {
    const id = (row.knowledgeDocId || '').trim()
    try {
      await relocateTeacherDocToBusinessLib({
        knowledgeDocId: id,
        kind: params.kind,
        titleHint: row.title,
        contentHint: params.contentById?.[id] || row.content || '',
      })
      moved += 1
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('已清理无效映射')) {
        cleaned += 1
        failed.push(`${row.title || row.knowledgeDocId}: ${msg}`)
      } else {
        failed.push(`${row.title || row.knowledgeDocId}: ${msg}`)
      }
    }
  }
  return { moved, cleaned, failed }
}
