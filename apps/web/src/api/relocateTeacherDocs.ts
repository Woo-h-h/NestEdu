import {
  activityPlanKnowledgeScope,
  deleteKnowledgeDocument,
  fetchArchivePlansForOwnerFolder,
  fetchKnowledgePlanById,
  uploadKnowledgeDocument,
  weeklyPlanKnowledgeScope,
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
  // 列表占位文案不算可用正文
  if (text.includes('可能误入教师成果库')) return false
  if (text.includes('不在当前教案')) return false
  return text.length >= 20
}

/** 尽量拿回误入文档的正文：详情 → 成果库个人文件夹列表 */
async function resolveMisroutedPlan(params: {
  knowledgeDocId: string
  titleHint?: string
}): Promise<TeachingPlan | null> {
  const id = params.knowledgeDocId.trim()
  const titleHint = (params.titleHint || '').trim()

  const byId = await fetchKnowledgePlanById(id)
  if (hasUsableContent(byId)) return byId

  const phone = (await getCurrentTeacherPhone()).trim()
  if (!phone) return byId

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

  if (hasUsableContent(hit)) return hit
  if (hit?.id && hit.id !== id) {
    const again = await fetchKnowledgePlanById(hit.id)
    if (hasUsableContent(again)) return again
  }

  // 合并已有字段，方便后续报错文案
  if (hit) {
    return {
      ...hit,
      content: hit.content || byId?.content || '',
      objectives: hit.objectives || byId?.objectives || '',
    }
  }
  return byId
}

/**
 * 将误入成果库（或其他分类）的本人文档，重新上传到教案库 / 周计划库，
 * 并更新 MySQL 映射；成功后删除旧文档。
 * 若平台已无法读到正文，则清理无效 MySQL 映射（避免「我的」一直挂空壳）。
 */
export async function relocateTeacherDocToBusinessLib(params: {
  knowledgeDocId: string
  kind: TeacherGeneratedDocType
  titleHint?: string
}): Promise<{ plan?: TeachingPlan; cleaned?: boolean }> {
  const existing = await resolveMisroutedPlan(params)
  const title = ensureBusinessTitle(
    existing?.title || params.titleHint || '未命名',
    params.kind
  )

  if (!hasUsableContent(existing)) {
    // 正文不可用：清掉无效映射，并尽量删除成果库空壳文档
    const oldId = (existing?.id || params.knowledgeDocId).trim()
    if (oldId) {
      try {
        await deleteKnowledgeDocument(oldId)
      } catch (err) {
        console.warn('[relocate] delete empty platform doc failed', err)
      }
      try {
        await deleteTeacherGeneratedDocRecord(oldId)
      } catch (err) {
        console.warn('[relocate] delete mysql mapping failed', err)
      }
    }
    throw new Error(
      `「${title}」在平台读不到正文（多半已被智能分类且详情为空）。已清理无效映射，请到活动方案页重新生成并选择入库`
    )
  }

  const scope =
    params.kind === 'activity' ? activityPlanKnowledgeScope() : weeklyPlanKnowledgeScope()

  const uploaded = await uploadKnowledgeDocument({
    title,
    content: (existing!.content || existing!.objectives).trim(),
    knowledgeId: scope.knowledgeId,
    categoryId: scope.categoryId,
    categoryKey: scope.categoryKey,
    forceKind: params.kind,
  })

  await recordTeacherGeneratedUpload({
    docType: params.kind,
    plan: uploaded,
    categoryId: scope.categoryId,
  })

  const oldId = (existing!.id || params.knowledgeDocId).trim()
  if (oldId && oldId !== uploaded.id) {
    try {
      await deleteKnowledgeDocument(oldId)
    } catch (err) {
      console.warn('[relocate] delete old kb doc failed', err)
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
    try {
      await relocateTeacherDocToBusinessLib({
        knowledgeDocId: row.knowledgeDocId,
        kind: params.kind,
        titleHint: row.title,
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
