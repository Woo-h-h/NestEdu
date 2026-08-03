import { generateAgentText, getProfileAgentId } from '@/api/agent'
import { listGrowthRecords } from '@/api/growth'
import { fetchArchivePlansForOwnerFolder } from '@/api/knowledge'
import {
  getCurrentTeacherDisplayName,
  getCurrentTeacherPhone,
} from '@/api/platformUser'
import { fetchTeacherGeneratedDocStats } from '@/api/teacherGeneratedDocs'
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
  folderIds: string[]
  agentId: number
}

/**
 * 生成教师画像解读：
 * - 先取本人手机号
 * - 只拉取手机号同名文件夹文档（不把整库交给智能体检索）
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

  const archive = await fetchArchivePlansForOwnerFolder(phone, { limit: 50 })
  if (archive.error && archive.folders.length === 0 && archive.plans.length === 0) {
    throw new Error(archive.error)
  }

  // 二次校验：返回的 folders 名称必须匹配手机号（防御性）
  const folderIds = archive.folders.map((f) => f.id)
  const archivePlans: TeachingPlan[] = archive.plans

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

  if (archivePlans.length === 0 && localRecords.length === 0) {
    throw new Error(
      `手机号「${phone}」文件夹下暂无文档，且没有本地录入记录。请先在教师成果库个人文件夹上传成果后再生成。`
    )
  }

  const prompt = buildProfileAgentUserMessage({
    displayName,
    phone,
    archivePlans,
    localRecords,
    activityPlanCount,
    weeklyPlanCount,
    focus: options?.focus,
  })

  console.info('[ProfileAgent] generate', {
    agentId,
    phone,
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
    folderIds,
    agentId,
  }
}
