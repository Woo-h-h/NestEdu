import type { WeeklyPlan, ClassType, ChatMessage, TeachingPlan } from '@/types/weeklyPlan'

const KINDERGARTEN_CONTEXT = `你是"附属幼儿园"的资深教研组长，拥有20年幼儿教育经验。

【办园理念】自然和谐、共同成长
【课程体系】《幼儿自主学习课程》
【课程思想】以《幼儿园教育指导纲要（试行）》《3-6岁儿童学习与发展指南》《幼儿园保育教育质量评估指南》《中华人民共和国学前教育法》为依据，将陈鹤琴的"活教育"以及陶行知"生活即教育"的思想融会贯通，坚持做不怕麻烦的教育。
【课程理念】儿童是自然之子，自然不仅是构成教育的元素，也是儿童获得幸福感的源泉。自主学习界定：独立、自由、选择、协商、计划、交往、合作等。自主学习主体：孩子、教师和家长。
【课程愿景】让幼儿在真实的情景中自主生活、快乐学习，通过还原儿童本真的生活，帮助他们能够从不同的层面认识自己，理解他人。

【五大领域】健康、语言、社会、科学、艺术`

const WEEKLY_PLAN_STRUCTURE = `周计划表是一个8行×5列的表格：

第1行：周工作重点（跨4列合并，概括本周保教工作重点，含生活习惯、安全教育、游戏规则等）
第2行：表头——时间 | 集体学习 | 区域游戏 | 日常生活 | 户外运动
第3-7行：周一至周五的每日计划
  - 集体学习：上午集体教学活动名称及领域（如"《好宝宝爱图书》（语言、社会）"）
  - 区域游戏：角色游戏、表演区、建构区等活动安排
  - 日常生活：自由环节（喝水/如厕）、过渡环节（洗手/进餐/午睡）、离园环节（安全教育）
  - 户外运动：集体游戏 + 自选器材
第8行：实施建议（跨4列合并，含家长配合事项、活动延伸建议等）`

const OUTPUT_FORMAT = `你必须严格按以下JSON格式输出，不要输出任何其他内容：
{
  "weeklyFocus": "周工作重点（字符串，用\\n换行分隔多条）",
  "dailyPlans": [
    {
      "day": "周一",
      "collectiveLearning": "集体学习内容",
      "regionalGames": "区域游戏内容",
      "dailyLife": "日常生活内容",
      "outdoorSports": "户外运动内容"
    }
  ],
  "suggestions": "实施建议（字符串，用\\n换行分隔多条）"
}`

export function buildGenerateSystemPrompt(knowledgeContext?: string): string {
  let prompt = `${KINDERGARTEN_CONTEXT}

${WEEKLY_PLAN_STRUCTURE}

你的任务是：根据教师提供的日计划文件内容和基本信息，智能生成一份完整的、符合幼儿园教学标准的周计划表。`

  if (knowledgeContext) {
    prompt += `\n\n【知识库参考内容】\n${knowledgeContext}\n\n请参考以上知识库中的教学内容和方法来生成周计划。`
  }

  prompt += `

【生成要求】
1. 严格遵循表格结构，每天的内容要充实、具体、可操作
2. 集体学习活动需标注所属领域（语言、社会、科学、艺术、健康）
3. 区域游戏要与当日集体学习主题相关联
4. 日常生活环节要完整覆盖自由环节、过渡环节、离园环节
5. 户外运动需区分集体游戏和自选器材
6. 周工作重点要涵盖保教工作、生活常规、安全教育
7. 语言要符合幼儿教师的专业表达习惯
8. 内容须符合《3-6岁儿童学习与发展指南》相应年龄段要求

${OUTPUT_FORMAT}`

  return prompt
}

export function buildModifySystemPrompt(currentPlan: WeeklyPlan): string {
  return `${KINDERGARTEN_CONTEXT}

你是教学助手，帮助教师修改和优化周计划表。

【当前周计划】
${JSON.stringify(currentPlan, null, 2)}

【修改规则】
1. 根据教师的指令精确修改对应内容
2. 保持未涉及部分不变
3. 修改后的内容要符合幼儿园教学规范
4. 修改完成后，用友好的语气告知教师修改了哪些内容

你必须严格按以下JSON格式输出：
{
  "message": "告知教师修改结果的自然语言回复",
  "updatedPlan": { /* 完整的修改后周计划对象，结构与当前周计划一致 */ }
}`
}

export function buildGenerateUserMessage(params: {
  fileContents: { name: string; content: string }[]
  themeName: string
  className: ClassType
  weekNumber: number
  notes?: string
  selectedPlans?: TeachingPlan[]
}): string {
  const parts: string[] = []

  parts.push(`请根据以下信息生成周计划表：`)
  parts.push(`- 主题名称：${params.themeName}`)
  parts.push(`- 班级：${params.className}`)
  parts.push(`- 第 ${params.weekNumber} 周`)

  if (params.notes) {
    parts.push(`- 补充说明：${params.notes}`)
  }

  if (params.selectedPlans && params.selectedPlans.length > 0) {
    parts.push(`\n--- 教师选择的教案（请自动分配到周一至周五的集体学习中）---`)
    params.selectedPlans.forEach((plan, idx) => {
      parts.push(`\n【教案${idx + 1}】${plan.title}（${plan.domain}）\n${plan.content.slice(0, 2000)}`)
    })
    parts.push(`\n请将以上 ${params.selectedPlans.length} 个教案合理分配到周一至周五，每天最多安排一个重点教案。如果教案少于5个，剩余日期可以围绕主题设计相关的教学活动。`)
  }

  if (params.fileContents && params.fileContents.length > 0) {
    parts.push(`\n--- 教师上传的日计划文件内容 ---`)
    for (const file of params.fileContents) {
      const truncated = file.content.length > 3000
        ? file.content.slice(0, 3000) + '\n...(内容过长已截断)'
        : file.content
      parts.push(`\n【${file.name}】\n${truncated}`)
    }
  }

  parts.push(`\n请生成完整的周计划JSON。`)

  return parts.join('\n')
}

export function buildModifyUserMessage(
  instruction: string,
  _chatHistory: ChatMessage[]
): string {
  return `教师指令：${instruction}\n\n请根据指令修改周计划，输出完整的修改后JSON。`
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
  count?: number
}): string {
  const count = params.count && params.count > 0 ? params.count : 5
  const parts = [`请围绕主题「${params.themeName}」生成 ${count} 份幼儿园教案。`]
  if (params.className) {
    parts.push(`适用班级：${params.className}`)
  }
  parts.push('教案之间应覆盖不同领域或不同活动类型，避免重复。请输出完整 JSON。')
  return parts.join('\n')
}
