import type {
  WeeklyPlan,
  ChatMessage,
  TeachingPlan,
  CreateWeeklyPlanRequest,
  AiModifyRequest,
} from '@/types/weeklyPlan'
import {
  buildGenerateSystemPrompt,
  buildGenerateUserMessage,
  buildModifySystemPrompt,
  buildModifyUserMessage,
  buildTeachingPlanSystemPrompt,
  buildTeachingPlanUserMessage,
} from '@/lib/prompts'
import { extractJson, isValidTeachingPlans, isValidWeeklyPlan } from '@/lib/weeklyPlanValidators'
import { searchKnowledge } from '@/api/knowledge'
import { generateAgentText, getTeachingAgentId, getWeeklyPlanAgentId } from '@/api/agent'

export function isBackendApiEnabled(): boolean {
  const raw = import.meta.env.VITE_USE_BACKEND_API
  if (raw === 'false') return false
  return true
}

export function isApiConfigured(): boolean {
  // 生成路径走平台智能体，不依赖 DeepSeek；未登录时由 generateAgentText 抛错
  return true
}

async function agentModifyWeeklyPlan(params: {
  currentPlan: WeeklyPlan
  instruction: string
  chatHistory: ChatMessage[]
}): Promise<{ message: string; updatedPlan: WeeklyPlan }> {
  const systemPrompt = buildModifySystemPrompt(params.currentPlan)
  const userMessage = buildModifyUserMessage(params.instruction, params.chatHistory)
  const prompt = `${systemPrompt}\n\n${userMessage}\n\n请只输出 JSON，不要其它说明。`

  const content = await generateAgentText(prompt, {
    agentId: getWeeklyPlanAgentId(),
    timeoutMs: 90000,
  })
  const result = JSON.parse(extractJson(content))

  if (
    typeof result.message === 'string' &&
    result.updatedPlan &&
    isValidWeeklyPlan(result.updatedPlan)
  ) {
    return {
      message: result.message,
      updatedPlan: {
        ...result.updatedPlan,
        id: params.currentPlan.id,
        themeName: params.currentPlan.themeName,
        className: params.currentPlan.className,
        weekNumber: params.currentPlan.weekNumber,
        createdAt: new Date().toISOString(),
        status: 'draft',
      },
    }
  }

  throw new Error('周计划修改返回格式不合法')
}

export async function modifyWeeklyPlan(
  params: AiModifyRequest
): Promise<{ message: string; updatedPlan: WeeklyPlan }> {
  try {
    return await agentModifyWeeklyPlan(params)
  } catch (err) {
    const agentId = getWeeklyPlanAgentId()
    const detail = err instanceof Error ? err.message : String(err)
    console.error(`[LLM] 周计划修改智能体 ${agentId} 失败:`, err)
    throw new Error(`周计划智能体（ID ${agentId}）修改失败：${detail}`)
  }
}

function assembleWeeklyPlan(
  result: Pick<WeeklyPlan, 'weeklyFocus' | 'dailyPlans' | 'suggestions'>,
  params: {
    themeName: string
    className: string
    weekNumber: number
  },
  agentId = getWeeklyPlanAgentId()
): WeeklyPlan {
  return {
    id: `plan_a${agentId}_${Date.now()}`,
    themeName: params.themeName,
    className: params.className,
    weekNumber: params.weekNumber,
    weeklyFocus: result.weeklyFocus,
    dailyPlans: result.dailyPlans,
    suggestions: result.suggestions,
    createdAt: new Date().toISOString(),
    status: 'draft',
  }
}

async function loadKnowledgeContextForWeeklyPlan(
  themeName: string,
  selectedPlans?: TeachingPlan[]
): Promise<string | undefined> {
  const parts: string[] = []

  if (selectedPlans && selectedPlans.length > 0) {
    parts.push(
      selectedPlans
        .map(
          (plan, idx) =>
            `【选用教案${idx + 1}】${plan.title}（${plan.domain}）\n${plan.objectives}\n${plan.content}`
        )
        .join('\n\n')
    )
  }

  try {
    const result = await searchKnowledge(themeName)
    if (result.summary) {
      parts.push(result.summary)
    }
  } catch (err) {
    console.warn('[LLM] 知识库查询失败，继续生成:', err)
  }

  const merged = parts.join('\n\n').trim()
  return merged || undefined
}

async function agentGenerateWeeklyPlan(params: {
  fileContents: { name: string; content: string }[]
  themeName: string
  className: string
  weekNumber: number
  notes?: string
  selectedPlans?: TeachingPlan[]
}): Promise<WeeklyPlan> {
  const knowledgeContext = await loadKnowledgeContextForWeeklyPlan(
    params.themeName,
    params.selectedPlans
  )
  const systemPrompt = buildGenerateSystemPrompt(knowledgeContext)
  const userMessage = buildGenerateUserMessage(params)
  const basePrompt = `${systemPrompt}\n\n${userMessage}\n\n请只输出 JSON，不要其它说明。`

  const tryOnce = async (extra?: string) => {
    const content = await generateAgentText(
      extra ? `${basePrompt}\n\n${extra}` : basePrompt,
      { agentId: getWeeklyPlanAgentId(), timeoutMs: 120000 }
    )
    const parsed = JSON.parse(extractJson(content))
    if (!isValidWeeklyPlan(parsed)) {
      throw new Error('周计划 JSON 格式不合法')
    }
    return assembleWeeklyPlan(parsed, params)
  }

  try {
    return await tryOnce()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (
      msg.includes('请先登录') ||
      msg.includes('智能体请求失败') ||
      msg.includes('网络') ||
      /401|403|404|502|503/.test(msg)
    ) {
      throw err
    }
    // 仅格式问题重试一次
    return await tryOnce(
      '上次输出格式不符合要求。请严格只输出 JSON，确保 dailyPlans 含周一到周五共 5 项，字段齐全。'
    )
  }
}

export async function generateWeeklyPlan(
  params: CreateWeeklyPlanRequest & {
    fileContents?: { name: string; content: string }[]
    selectedPlans?: TeachingPlan[]
  }
): Promise<WeeklyPlan> {
  const payload = {
    fileContents: params.fileContents || [],
    themeName: params.themeName,
    className: params.className,
    weekNumber: params.weekNumber,
    notes: params.notes,
    selectedPlans: params.selectedPlans,
  }

  // 周计划固定走智能体 14332（与教案 14317 分离），失败时直接抛错，禁止静默降级到 Mock
  try {
    return await agentGenerateWeeklyPlan(payload)
  } catch (err) {
    const agentId = getWeeklyPlanAgentId()
    const detail = err instanceof Error ? err.message : String(err)
    console.error(`[LLM] 周计划智能体 ${agentId} 失败:`, err)
    throw new Error(
      `周计划智能体（ID ${agentId}）生成失败：${detail}。请确认已登录，且智能体 ${agentId} 可用。`
    )
  }
}

function normalizeTeachingPlans(
  raw: unknown,
  themeName: string,
  className?: string
): TeachingPlan[] {
  let list: unknown[] = []
  if (Array.isArray(raw)) {
    list = raw
  } else if (raw && typeof raw === 'object' && Array.isArray((raw as { plans?: unknown }).plans)) {
    list = (raw as { plans: unknown[] }).plans
  }

  const now = Date.now()
  const plans: TeachingPlan[] = []
  list.forEach((item, i) => {
    if (!item || typeof item !== 'object') return
    const p = item as Record<string, unknown>
    const plan: TeachingPlan = {
      id: typeof p.id === 'string' && p.id ? p.id : `ai_${now}_${i}`,
      title: String(p.title || ''),
      domain: String(p.domain || ''),
      gradeLevel: String(p.gradeLevel || className || '通用'),
      objectives: String(p.objectives || ''),
      content: String(p.content || ''),
      source: 'ai',
    }
    if (isValidTeachingPlans([plan])) {
      plans.push(plan)
    }
  })
  if (plans.length === 0) {
    throw new Error(`主题「${themeName}」教案生成结果格式不合法`)
  }
  return plans
}

async function agentGenerateTeachingPlans(params: {
  themeName: string
  className?: string
  focusDomains?: string[]
  count?: number
  notes?: string
}): Promise<TeachingPlan[]> {
  const count =
    params.focusDomains && params.focusDomains.length > 0
      ? params.focusDomains.length
      : params.count ?? 5
  const systemPrompt = buildTeachingPlanSystemPrompt()
  const userMessage = buildTeachingPlanUserMessage({
    ...params,
    count,
  })
  const basePrompt = `${systemPrompt}\n\n${userMessage}\n\n请只输出 JSON，不要其它说明。`

  const tryOnce = async (extra?: string) => {
    const content = await generateAgentText(
      extra ? `${basePrompt}\n\n${extra}` : basePrompt,
      { agentId: getTeachingAgentId(), timeoutMs: 90000 }
    )
    const parsed = JSON.parse(extractJson(content))
    return normalizeTeachingPlans(parsed, params.themeName, params.className)
  }

  try {
    return await tryOnce()
  } catch (err) {
    if (err instanceof Error && err.message.includes('请先登录')) {
      throw err
    }
    return await tryOnce(
      '上次输出格式不符合要求，请严格按 JSON 的 plans 数组重新输出，不要 markdown 代码块以外的文字。'
    )
  }
}

export async function generateTeachingPlans(params: {
  themeName: string
  className?: string
  focusDomains?: string[]
  count?: number
  notes?: string
}): Promise<TeachingPlan[]> {
  const themeName = params.themeName.trim()
  if (!themeName) {
    throw new Error('请先填写主题名称')
  }

  const focusDomains = (params.focusDomains || [])
    .map((d) => d.trim())
    .filter(Boolean)
  const count = focusDomains.length > 0 ? focusDomains.length : params.count ?? 5

  // 教案固定走智能体 14317，失败直接抛错，禁止降级到后端/浏览器 Mock
  try {
    return await agentGenerateTeachingPlans({
      themeName,
      className: params.className,
      focusDomains,
      count,
      notes: params.notes,
    })
  } catch (err) {
    const agentId = getTeachingAgentId()
    const detail = err instanceof Error ? err.message : String(err)
    console.error(`[LLM] 教案智能体 ${agentId} 失败:`, err)
    throw new Error(
      `教案智能体（ID ${agentId}）生成失败：${detail}。请确认已登录，且智能体 ${agentId} 可用。`
    )
  }
}
