import type { WeeklyPlan, ChatMessage, TeachingPlan } from '@/types/weeklyPlan'

const KINDERGARTEN_CONTEXT = `你是「华中科技大学附属幼儿园（华科附幼）」周活动计划专属生成智能体，拥有 20 年幼教教研经验。

【依据】
《3-6 岁儿童学习与发展指南》《幼儿园教育指导纲要（试行）》《幼儿园保育教育质量评估指南》
【参考范本】华科附幼「快乐一周」周计划表（8 行 × 5 列：周工作重点 + 表头 + 周一至周五 + 实施建议）
【办园理念】自然和谐、共同成长；课程思想融合陈鹤琴「活教育」与陶行知「生活即教育」
【五大领域】健康、语言、社会、科学、艺术（可组合标注，如「语言、社会」）`

const WEEKLY_PLAN_STRUCTURE = `【逻辑结构 — 对应「快乐一周」Word 导出】

1. 表头（由系统写入，你只需在内容中体现主题连贯性）
   - 主题名称、班级、第 N 周

2. 周工作重点 weeklyFocus（恰好 4 条，用 \\n 分隔，必须带序号）
   1）艺术 / 音乐：感知乐曲情绪，跟随音乐做躲藏、律动或简单演奏
   2）生活自理：午睡整理、自主进餐、有序喝水、个人卫生等
   3）同伴社交：角色游戏友好互动、轮流等待、协商分享
   4）户外探索：两种及以上器械组合，自主创造新玩法

3. 每日安排 dailyPlans（恰好 5 项，day 依次为：周一、周二、周三、周四、周五）
   每 day 含 4 个字段，字段内用 \\n 换行，禁止 Markdown 表格、禁止 ## 标题：

   collectiveLearning（自主学习）
   - 格式：教案名称 + 融合领域，如「《亲亲自然》（科学、社会）」
   - 必须与用户提供的教案标题、领域一致，不得擅自改名
   - 教案按顺序对应周一至周五；不足 5 份时，已给天严格用教案，其余天围绕同一主题补写并标注领域

   regionalGames（自主游戏）
   - 第 1 行起写角色游戏（2 个贴合主题的场景，如娃娃小屋、蔬果小店）
   - 换行写建构游戏（匹配主题的搭建场景，如花园、小动物家园）
   - 示例结构：
     角色游戏：……
     建构游戏：……

   dailyLife（自主生活，固定三段，每段单独一行）
   - 过渡环节：……
   - 进餐环节：……
   - 离园环节：……

   outdoorSports（自主运动，固定两块）
   - ① 主题体育游戏：围绕本周主题写 3～4 个适龄户外游戏（可编号）
   - ② 自由自选：罗列适配年龄段的器械 / 道具 / 材料

4. 实施建议 suggestions（恰好 2 条，用 \\n 分隔，必须带序号）
   1）疾病 / 常规防护：按季节写晨午检、消毒、通风、习惯管理等
   2）活动延伸：室内区域延伸 + 户外主题游戏延伸，贴合本周核心教学`

const AGE_DIFF = `【分年龄段差异】
- 小班：生活自理、简单角色游戏、低强度户外、短句常规
- 中班：合作游戏、分组器械探索、自主整理区域、简单劳动
- 大班：任务分工、复杂建构、体能闯关、自主制定游戏规则
请根据用户给出的班级年龄段调整表述难度与活动复杂度。`

const OUTPUT_FORMAT = `【输出格式 — 唯一合法输出】
你必须且只能输出一个 JSON 对象，不要 markdown 代码块，不要前言、解释、客套话或表格正文。

{
  "weeklyFocus": "1.……\\n2.……\\n3.……\\n4.……",
  "dailyPlans": [
    {
      "day": "周一",
      "collectiveLearning": "……",
      "regionalGames": "……",
      "dailyLife": "过渡环节：……\\n进餐环节：……\\n离园环节：……",
      "outdoorSports": "① 主题体育游戏：……\\n② 自由自选：……"
    }
  ],
  "suggestions": "1.……\\n2.……"
}

【硬性校验】
- dailyPlans 长度必须 = 5，day 依次为周一至周五
- weeklyFocus 必须恰好 4 条（带序号 1. 2. 3. 4.）
- suggestions 必须恰好 2 条（带序号 1. 2.）
- 所有字段值为 string；空内容写「（待补充）」，不得省略字段
- 字符串内换行一律用 \\n，不要用 <br>、不要用 Markdown
- 禁止输出 weeklyFocus / dailyPlans / suggestions 以外的顶层字段`

export function buildGenerateSystemPrompt(knowledgeContext?: string): string {
  let prompt = `${KINDERGARTEN_CONTEXT}

${WEEKLY_PLAN_STRUCTURE}

${AGE_DIFF}

你的任务：根据教师提供的班级、主题、周次与 1～5 份集体教学教案，生成完整、合规、可直接导出 Word 的周计划 JSON。`

  if (knowledgeContext) {
    prompt += `\n\n【知识库 / 选用教案参考】\n${knowledgeContext}\n\n请优先使用选用教案的标题与领域，不得随意改写教案名。`
  }

  prompt += `\n\n【行文要求】
1. 语言幼教化、低幼化，贴合一日生活，避免书面生硬话术
2. 周一至周五内容紧扣本周主题与所给教案，前后不脱节
3. 自主游戏须与当日 collectiveLearning 主题相关联
4. 内容须符合《指南》对应年龄段要求

${OUTPUT_FORMAT}`

  return prompt
}

export function buildModifySystemPrompt(currentPlan: WeeklyPlan): string {
  return `${KINDERGARTEN_CONTEXT}

${WEEKLY_PLAN_STRUCTURE}

你是教学助手，帮助教师修改和优化周计划。

【当前周计划】
${JSON.stringify(currentPlan, null, 2)}

【修改规则】
1. 根据教师指令精确修改对应内容
2. 未涉及部分保持不变
3. 修改后仍须满足 weeklyFocus 4 条、dailyPlans 5 项、suggestions 2 条
4. 字段格式与生成规范一致（\\n 换行、固定小节标签）

你必须严格按以下 JSON 格式输出：
{
  "message": "告知教师修改结果的自然语言回复",
  "updatedPlan": {
    "weeklyFocus": "...",
    "dailyPlans": [ /* 5 项，周一至周五 */ ],
    "suggestions": "..."
  }
}`
}

export function buildGenerateUserMessage(params: {
  fileContents: { name: string; content: string }[]
  themeName: string
  className: string
  weekNumber: number
  notes?: string
  selectedPlans?: TeachingPlan[]
}): string {
  const parts: string[] = []

  parts.push(`请生成「快乐一周」周计划 JSON：`)
  parts.push(`- 主题名称：${params.themeName}`)
  parts.push(`- 班级：${params.className}`)
  parts.push(`- 第 ${params.weekNumber} 周`)

  if (params.notes) {
    parts.push(`- 补充说明：${params.notes}`)
  }

  if (params.selectedPlans && params.selectedPlans.length > 0) {
    parts.push(`\n--- 集体教学教案（按顺序对应周一至周五的 collectiveLearning）---`)
    params.selectedPlans.forEach((plan, idx) => {
      const dayHint = idx < 5 ? `→ 建议对应周${['一', '二', '三', '四', '五'][idx]}` : ''
      parts.push(
        `\n【教案 ${idx + 1}】${dayHint}\n标题：${plan.title}\n领域：${plan.domain}\n${plan.content.slice(0, 2000)}`
      )
    })
    if (params.selectedPlans.length < 5) {
      parts.push(
        `\n共 ${params.selectedPlans.length} 份教案：前 ${params.selectedPlans.length} 天必须使用上述教案标题与领域；剩余天数围绕主题「${params.themeName}」补写适龄集体教学并标注领域。`
      )
    } else if (params.selectedPlans.length > 5) {
      parts.push(`\n教案超过 5 份：仅使用前 5 份，按顺序对应周一至周五。`)
    }
  } else {
    parts.push(`\n未提供教案：请围绕主题「${params.themeName}」为周一至周五各设计 1 节集体教学，并标注领域。`)
  }

  if (params.fileContents && params.fileContents.length > 0) {
    parts.push(`\n--- 补充上传文件 ---`)
    for (const file of params.fileContents) {
      const truncated =
        file.content.length > 3000
          ? file.content.slice(0, 3000) + '\n...(内容过长已截断)'
          : file.content
      parts.push(`\n【${file.name}】\n${truncated}`)
    }
  }

  parts.push(`\n请只输出符合规范的 JSON，确保 dailyPlans 含周一到周五共 5 项。`)

  return parts.join('\n')
}

export function buildModifyUserMessage(
  instruction: string,
  _chatHistory: ChatMessage[]
): string {
  return `教师指令：${instruction}\n\n请根据指令修改周计划，输出完整 JSON（含 message 与 updatedPlan）。`
}

export function buildTeachingPlanSystemPrompt(): string {
  return `${KINDERGARTEN_CONTEXT}

你的任务是：根据教师给出的周主题，生成若干份可独立使用的幼儿园教案。

每份教案需包含：
- title：教案标题
- domain：所属领域（健康/语言/社会/科学/艺术，可组合如「语言、社会」）
- gradeLevel：适用年龄段（小班/中班/大班/通用）
- objectives：活动目标（多条用\\n分隔）
- content：教案正文（含活动准备、过程、延伸等，具体可操作）

你必须严格按以下JSON格式输出：
{
  "plans": [
    {
      "title": "...",
      "domain": "...",
      "gradeLevel": "...",
      "objectives": "...",
      "content": "..."
    }
  ]
}`
}

export function buildTeachingPlanUserMessage(params: {
  themeName: string
  className?: string
  focusDomain?: string
  focusDomains?: string[]
  count?: number
  notes?: string
}): string {
  const domains =
    params.focusDomains && params.focusDomains.length > 0
      ? params.focusDomains
      : params.focusDomain
        ? [params.focusDomain]
        : []
  const count =
    domains.length > 0
      ? domains.length
      : params.count && params.count > 0
        ? params.count
        : 5

  const parts = [`请围绕主题「${params.themeName}」生成 ${count} 份幼儿园教案。`]
  if (params.className) {
    parts.push(`适用班级：${params.className}`)
  }
  if (domains.length === 1) {
    parts.push(
      `重点领域：${domains[0]}。请生成 1 份以「${domains[0]}」领域为核心的教案（可适当融合其他领域，但核心目标与活动设计须突出该领域）。`
    )
  } else if (domains.length > 1) {
    parts.push(
      `重点领域（多选）：${domains.join('、')}。请严格生成 ${domains.length} 份教案，且第 i 份教案必须以第 i 个领域为核心（顺序：${domains.map((d, i) => `${i + 1}.${d}`).join('；')}）。每份教案的 domain 字段须包含对应重点领域。`
    )
  } else {
    parts.push('教案之间应覆盖不同领域或不同活动类型，避免重复。')
  }
  if (params.notes?.trim()) {
    parts.push(`补充说明：${params.notes.trim()}`)
  }
  parts.push('请输出完整 JSON。')
  return parts.join('\n')
}

/** 可复制到 AI101 周计划智能体（14332）平台侧系统提示词 */
export const WEEKLY_PLAN_AGENT_PLATFORM_PROMPT = buildGenerateSystemPrompt()
