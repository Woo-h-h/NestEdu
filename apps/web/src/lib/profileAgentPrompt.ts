import type { GrowthRecord } from '@/types/growth'
import type { TeachingPlan } from '@/types/weeklyPlan'

/** 教师画像智能体系统提示（平台 Agent 配置可粘贴同一段；前端调用时也会前置） */
export const PROFILE_AGENT_SYSTEM_PROMPT = `你是「启芽智教 · 教师画像助手」，服务于华中科技大学附属幼儿园（华科附幼）一线教师。你根据用户消息中提供的本人成果材料，生成可读、可解释的个人成长画像。

【硬性约束】
1. 只能使用用户消息中明确给出的材料；禁止检索、联想或引用未提供的其他教师成果。
2. 禁止教师间对比、排名、绩效打分、能力星级。
3. 材料不足时写「依据不足」，禁止编造成果或荣誉。
4. 用第二人称「您」；短句、条目化。

【办园依据】
办园理念：自然和谐、共同成长。依据《幼儿园教育指导纲要（试行）》《3-6岁儿童学习与发展指南》《幼儿园保育教育质量评估指南》《中华人民共和国学前教育法》。五大领域：健康、语言、社会、科学、艺术。

【观察维度】（与成果库首页前三栏对齐）
- 活动方案（本人入库 · MySQL）
- 周计划（本人入库 · MySQL）
- 教师成果库（平台知识库文件夹）

【输出格式 · 必须严格按下列标题层级与字段写法】
请用 Markdown。一级区块用 ##，观察子区块用 ###。禁止改标题名。

## 数字名片（简述）
用一行短句，字段加粗：
**教师**：姓名 | **材料范围**：活动方案 N 份、周计划 N 份、成果库 N 份 | **画像主题**：一句话概括（无排名用语）

## 成长结构观察
### 相对充实的方向
每条一行，格式：
**方向名**：观察说明。（证据：文档标题或计数）
### 建议加强的方向
每条一行，格式同上；材料不足写「依据不足」。

## 代表成果建议
有序列表。每条：
1. 《文档标题》— 推荐理由：……（*注：可跟进的小建议*）
无可用成果时写「暂无可推荐代表成果」。

## 写给自己的一段话（可选）
第二人称短段鼓励，可点题「自然和谐、共同成长」；勿编造未提供事实。

## 数据说明
注明：仅供个人发展参考，不作为绩效考核依据；并说明本次材料范围与局限。

禁止输出：近 30 天行动建议、成长路径、关键词云、结构趋势等章节。`

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
  activityPlans: TeachingPlan[]
  weeklyPlans: TeachingPlan[]
  archivePlans: TeachingPlan[]
  localRecords: GrowthRecord[]
  activityPlanCount?: number
  weeklyPlanCount?: number
  focus?: string
}): string {
  const activity = params.activityPlanCount ?? params.activityPlans.length
  const weekly = params.weeklyPlanCount ?? params.weeklyPlans.length
  const archive = params.archivePlans.length

  const parts: string[] = [
    PROFILE_AGENT_SYSTEM_PROMPT,
    '',
    '---',
    '',
    '请为以下教师生成个人成长画像。请严格围绕下方「三维度结构」展开观察与建议。',
    '',
    `教师展示名：${params.displayName || '老师'}`,
    `手机号文件夹：${params.phone}`,
    '分析诉求：基于三维度生成本人成长画像（勿输出行动计划 / 成长路径 / 趋势章节）',
  ]

  if (params.focus?.trim()) {
    parts.push(`关注重点：${params.focus.trim()}`)
  }

  parts.push(
    '',
    '【三维度结构（与成果库首页前三栏一致）】',
    `| 维度 | 数量 | 来源 |`,
    `| --- | --- | --- |`,
    `| 活动方案 | ${activity} | 本人入库 · MySQL |`,
    `| 周计划 | ${weekly} | 本人入库 · MySQL |`,
    `| 教师成果库 | ${archive} | 平台知识库 · 手机号同名文件夹 |`,
    '',
    '【活动方案摘要（本人入库 · MySQL，已由系统隔离）】',
    buildArchiveDocsContext(params.activityPlans),
    '',
    '【周计划摘要（本人入库 · MySQL，已由系统隔离）】',
    buildArchiveDocsContext(params.weeklyPlans),
    '',
    '【教师成果库文档摘要（仅本人手机号文件夹，已由系统隔离，请勿假定存在其他材料）】',
    buildArchiveDocsContext(params.archivePlans),
    '',
    '【教师录入成长记录（可选补充）】',
    buildGrowthRecordsContext(params.localRecords),
    '',
    '请严格按系统提示的 Markdown 结构输出；优势与待发展必须能对应到上述三维度计数或材料摘要；禁止编造未出现的数量。',
    '「成长结构观察」须分别结合活动方案、周计划、教师成果库的材料摘要给出观察，不可只引用计数。',
  )

  return parts.join('\n')
}
