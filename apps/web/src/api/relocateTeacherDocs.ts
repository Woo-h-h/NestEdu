import {
  activityPlanKnowledgeScope,
  deleteKnowledgeDocument,
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
  // 避免再引入手机号；若已有「姓名_类型_」则尽量保留
  if (/^.+?_(?:活动方案|周计划)_/.test(base)) {
    return base.endsWith('.md') ? base : `${base}.md`
  }
  return `纠正_${label}_${base}.md`
}

/**
 * 将误入成果库（或其他分类）的本人文档，重新上传到教案库 / 周计划库，
 * 并更新 MySQL 映射；成功后删除旧文档。
 */
export async function relocateTeacherDocToBusinessLib(params: {
  knowledgeDocId: string
  kind: TeacherGeneratedDocType
  titleHint?: string
}): Promise<TeachingPlan> {
  const existing =
    (await fetchKnowledgePlanById(params.knowledgeDocId)) ||
    ({
      id: params.knowledgeDocId,
      title: params.titleHint || '',
      content: '',
      objectives: '',
      domain: '综合',
      gradeLevel: '通用',
      source: 'platform',
    } satisfies TeachingPlan)

  const content = (existing.content || existing.objectives || '').trim()
  if (!content) {
    throw new Error(
      `文档「${existing.title || params.knowledgeDocId}」内容为空，无法自动纠正；请在活动方案页重新生成并入库`
    )
  }

  const title = ensureBusinessTitle(existing.title || params.titleHint || '未命名', params.kind)
  const scope =
    params.kind === 'activity' ? activityPlanKnowledgeScope() : weeklyPlanKnowledgeScope()

  const uploaded = await uploadKnowledgeDocument({
    title,
    content,
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

  if (existing.id && existing.id !== uploaded.id) {
    try {
      await deleteKnowledgeDocument(existing.id)
    } catch (err) {
      console.warn('[relocate] delete old kb doc failed', err)
    }
    try {
      await deleteTeacherGeneratedDocRecord(existing.id)
    } catch (err) {
      console.warn('[relocate] delete old mysql row failed', err)
    }
  }

  return uploaded
}

/** 批量纠正：MySQL 中有记录、但当前教案/周计划分类列表里找不到的文档 */
export async function relocateMissingMineDocs(params: {
  kind: TeacherGeneratedDocType
  presentIds: Set<string>
}): Promise<{ moved: number; failed: string[] }> {
  const phone = (await getCurrentTeacherPhone()).trim()
  if (!phone) throw new Error('未能获取手机号')

  const rows = await listTeacherGeneratedDocs(phone, params.kind)
  const missing = rows.filter((row) => {
    const id = (row.knowledgeDocId || '').trim()
    return id && !params.presentIds.has(id)
  })

  let moved = 0
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
      failed.push(
        `${row.title || row.knowledgeDocId}: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }
  return { moved, failed }
}
