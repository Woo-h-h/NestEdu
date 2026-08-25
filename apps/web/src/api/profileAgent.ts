import { generateAgentText, getProfileAgentId } from '@/api/agent'
import { listGrowthRecords } from '@/api/growth'
import { fetchArchivePlansForOwnerFolder, fetchKnowledgePlanById } from '@/api/knowledge'
import {
  getCurrentTeacherDisplayName,
  getCurrentTeacherPhone,
} from '@/api/platformUser'
import {
  fetchTeacherGeneratedDocStats,
  listTeacherGeneratedDocs,
  teacherDocToPlan,
  type TeacherGeneratedDocType,
} from '@/api/teacherGeneratedDocs'
import { filterTeacherArchiveDocs } from '@/lib/archiveTreeCategory'
import { authBridge } from '@/lib/authBridge'
import { buildProfileAgentUserMessage } from '@/lib/profileAgentPrompt'
import type { GrowthRecord } from '@/types/growth'
import type { TeachingPlan } from '@/types/weeklyPlan'

export interface ProfileAgentGenerateResult {
  markdown: string
  phone: string
  displayName: string
  archiveDocCount: number
  localRecordCount: number
  activityPlanCount: number
  weeklyPlanCount: number
  folderIds: string[]
  agentId: number
}

const PROFILE_DOC_LIMIT = 20

/** 拉取本人入库的活动方案/周计划正文，供画像 Agent 分析（不仅传计数） */
async function loadTeacherGeneratedPlansForProfile(
  phone: string,
  docType: TeacherGeneratedDocType,
  limit = PROFILE_DOC_LIMIT
): Promise<TeachingPlan[]> {
  const rows = await listTeacherGeneratedDocs(phone, docType)
  const plans: TeachingPlan[] = []

  for (const row of rows.slice(0, limit)) {
    const dbContent = (row.content || '').trim()
    if (dbContent.length >= 20) {
      plans.push(teacherDocToPlan(row))
      continue
    }

    const id = (row.knowledgeDocId || '').trim()
    if (id && !id.startsWith('local_')) {
      try {
        const fetched = await fetchKnowledgePlanById(id)
        const text = (fetched?.content || fetched?.objectives || '').trim()
        if (fetched && text.length >= 20) {
          plans.push({
            ...fetched,
            title: row.title || fetched.title,
            content: fetched.content || text,
          })
          continue
        }
      } catch {
        // 平台正文不可读时回退数据库记录
      }
    }

    plans.push(teacherDocToPlan(row))
  }

  return plans
}

/**
 * 生成教师画像解读：
 * - 先取本人手机号
 * - 拉取活动方案/周计划本人入库摘要 + 成果库文件夹文档
 * - 将摘要注入提示词后调用画像 Agent
 */
export async function generateProfileAgentAnalysis(options?: {
  focus?: string
  timeoutMs?: number
}): Promise<ProfileAgentGenerateResult> {
  const auth = authBridge.getAuthInfo()
  if (!auth?.token) {
    throw new Error('请先登录平台后再生成画像')
  }

  const agentId = getProfileAgentId()
  const phone = await getCurrentTeacherPhone()
  if (!phone) {
    throw new Error('未能获取手机号，无法定位个人成果文件夹')
  }

  const displayName = (await getCurrentTeacherDisplayName()) || '老师'

  const [archive, activityPlans, weeklyPlans] = await Promise.all([
    fetchArchivePlansForOwnerFolder(phone, { limit: 50 }),
    loadTeacherGeneratedPlansForProfile(phone, 'activity'),
    loadTeacherGeneratedPlansForProfile(phone, 'weekly'),
  ])

  if (archive.error && archive.folders.length === 0 && archive.plans.length === 0) {
    throw new Error(archive.error)
  }

  const folderIds = archive.folders.map((f) => f.id)
  const archivePlans: TeachingPlan[] = filterTeacherArchiveDocs(archive.plans)

  let localRecords: GrowthRecord[] = []
  try {
    localRecords = await listGrowthRecords()
  } catch {
    localRecords = []
  }

  let activityPlanCount: number | undefined
  let weeklyPlanCount: number | undefined
  try {
    const stats = await fetchTeacherGeneratedDocStats(phone)
    if (stats) {
      activityPlanCount = stats.activity
      weeklyPlanCount = stats.weekly
    }
  } catch {
    // 系统统计失败不阻断画像生成
  }

  const resolvedActivityCount = activityPlanCount ?? activityPlans.length
  const resolvedWeeklyCount = weeklyPlanCount ?? weeklyPlans.length

  if (
    archivePlans.length === 0 &&
    localRecords.length === 0 &&
    resolvedActivityCount === 0 &&
    resolvedWeeklyCount === 0
  ) {
    throw new Error(
      `三维度暂无数据：活动方案/周计划未入库，且手机号「${phone}」文件夹下暂无文档。请先入库或整理成果库后再生成。`
    )
  }

  const prompt = buildProfileAgentUserMessage({
    displayName,
    phone,
    activityPlans,
    weeklyPlans,
    archivePlans,
    localRecords,
    activityPlanCount: resolvedActivityCount,
    weeklyPlanCount: resolvedWeeklyCount,
    focus: options?.focus,
  })

  console.info('[ProfileAgent] generate', {
    agentId,
    phone,
    activityPlanCount: resolvedActivityCount,
    weeklyPlanCount: resolvedWeeklyCount,
    activityDocsWithBody: activityPlans.filter((p) => (p.content || '').trim().length >= 20)
      .length,
    weeklyDocsWithBody: weeklyPlans.filter((p) => (p.content || '').trim().length >= 20).length,
    archiveDocCount: archivePlans.length,
    folderIds,
    localRecordCount: localRecords.length,
    promptChars: prompt.length,
  })

  const markdown = await generateAgentText(prompt, {
    agentId,
    timeoutMs: options?.timeoutMs ?? 120000,
  })

  return {
    markdown,
    phone,
    displayName,
    archiveDocCount: archivePlans.length,
    localRecordCount: localRecords.length,
    activityPlanCount: resolvedActivityCount,
    weeklyPlanCount: resolvedWeeklyCount,
    folderIds,
    agentId,
  }
}
