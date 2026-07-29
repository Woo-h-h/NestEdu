import type { GrowthRecord } from '@/types/growth'
import type { TeachingPlan } from '@/types/weeklyPlan'

/** 教师画像智能体系统提示（平台 Agent 配置可粘贴同一段；前端调用时也会前置） */
export const PROFILE_AGENT_SYSTEM_PROMPT = `你是「启芽智教 · 教师画像助手」，服务于华中科技大学附属幼儿园（华科附幼）一线教师。你根据用户消息中提供的本人成果材料，生成可读、可解释的个人成长画像与行动建议。

【硬性约束】
1. 只能使用用户消息中明确给出的材料；禁止检索、联想或引用未提供的其他教师成果。
2. 禁止教师间对比、排名、绩效打分、能力星级。
3. 材料不足时写「依据不足」，禁止编造成果或荣誉。
4. 用第二人称「您」；短句、条目化。

【办园依据】
办园理念：自然和谐、共同成长。依据《幼儿园教育指导纲要（试行）》《3-6岁儿童学习与发展指南》《幼儿园保育教育质量评估指南》《中华人民共和国学前教育法》。五大领域：健康、语言、社会、科学、艺术。

【观察维度】
- 保教活动设计与实施
- 专业学习与园本研究
- 园本资源与协同贡献

【输出格式】
请用 Markdown 输出：
## 数字名片（简述）
## 成长结构观察
### 相对充实的方向
### 建议加强的方向
## 代表成果建议
## 近 30 天行动建议
## 写给自己的一段话（可选）
## 数据说明
（注明：仅供个人发展参考，不作为绩效考核依据；并说明材料范围与局限）`

function truncate(text: string, max: number): string {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return '（无正文摘要）'
  return cleaned.length <= max ? cleaned : `${cleaned.slice(0, max)}…`
}

export function buildArchiveDocsContext(plans: TeachingPlan[]): string {
  if (plans.length === 0) return '（本人手机号文件夹下暂无文档）'
  return plans
    .map((plan, index) => {
      const body = truncate(plan.content || plan.objectives || '', 1200)
      return [
        `### 文档 ${index + 1}`,
        `- 标题：${plan.title || '未命名'}`,
        `- 领域/标签：${plan.domain || '未标注'}`,
        `- 摘要：`,
        body,
      ].join('\n')
    })
    .join('\n\n')
}

export function buildGrowthRecordsContext(records: GrowthRecord[]): string {
  if (records.length === 0) return '（暂无本地录入记录）'
  return records
    .map((record, index) => {
      return [
        `### 录入 ${index + 1}`,
        `- 名称：${record.name}`,
        `- 类别：${record.category}${record.subtype ? ` / ${record.subtype}` : ''}`,
        `- 年份：${record.year}`,
        `- 级别：${record.level || '未填'}`,
        `- 状态：${record.status || '未填'}`,
        `- 简介：${truncate(record.intro || '', 400)}`,
      ].join('\n')
    })
    .join('\n\n')
}

export function buildProfileAgentUserMessage(params: {
  displayName: string
  phone: string
  archivePlans: TeachingPlan[]
  localRecords: GrowthRecord[]
  activityPlanCount?: number
  weeklyPlanCount?: number
  focus?: string
}): string {
  const parts: string[] = [
    PROFILE_AGENT_SYSTEM_PROMPT,
    '',
    '---',
    '',
    '请为以下教师生成个人成长画像。',
    '',
    `教师展示名：${params.displayName || '老师'}`,
    `手机号文件夹：${params.phone}`,
    '分析诉求：生成本人成长画像与近 30 天行动建议',
  ]

  if (params.focus?.trim()) {
    parts.push(`关注重点：${params.focus.trim()}`)
  }

  parts.push(
    '',
    '【系统统计】',
    `- 活动方案：${params.activityPlanCount ?? '未知'} 份`,
    `- 周计划：${params.weeklyPlanCount ?? '未知'} 份`,
    '',
    '【教师成果库文档摘要（仅本人手机号文件夹，已由系统隔离，请勿假定存在其他材料）】',
    buildArchiveDocsContext(params.archivePlans),
    '',
    '【教师录入成长记录】',
    buildGrowthRecordsContext(params.localRecords),
    '',
    '请严格按系统提示的 Markdown 结构输出；所有判断必须能在上述材料中找到依据。',
  )

  return parts.join('\n')
}
