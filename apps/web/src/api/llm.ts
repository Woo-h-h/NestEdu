import type {
  WeeklyPlan,
  ClassType,
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
import { mockGenerateWeeklyPlan, mockAiModify } from '@/mock/weeklyPlan'
import { searchKnowledge } from '@/api/knowledge'
import { request } from '@/api/client'
import { generateAgentText, getTeachingAgentId, getWeeklyPlanAgentId } from '@/api/agent'

export function isBackendApiEnabled(): boolean {
  const raw = import.meta.env.VITE_USE_BACKEND_API
  if (raw === 'false') return false
  return true
}

function getBrowserLlmConfig() {
  return {
    apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY || '',
    baseUrl: import.meta.env.VITE_DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    model: import.meta.env.VITE_DEEPSEEK_MODEL || 'deepseek-chat',
  }
}

export function isApiConfigured(): boolean {
  if (isBackendApiEnabled()) {
    return true
  }
  const key = getBrowserLlmConfig().apiKey
  return !!key && key !== 'sk-your-key-here'
}

interface ChatMessagePayload {
  role: 'system' | 'user' | 'assistant'
  content: string
}

async function browserChatCompletion(
  messages: ChatMessagePayload[],
  options?: { temperature?: number }
): Promise<string> {
  const { apiKey, baseUrl, model } = getBrowserLlmConfig()

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const errBody = await response.text().catch(() => '')
    throw new Error(`API 请求失败 (${response.status}): ${errBody.slice(0, 200)}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('API 返回内容为空')
  }

  return content
}

async function browserGenerateWeeklyPlan(params: {
  fileContents: { name: string; content: string }[]
  themeName: string
  className: ClassType
  weekNumber: number
  notes?: string
  selectedPlans?: TeachingPlan[]
}): Promise<WeeklyPlan> {
  if (!isApiConfigured()) {
    console.warn('[LLM] 未配置 API Key，使用 Mock 数据')
    return mockGenerateWeeklyPlan(
      params.themeName,
      params.className,
      params.weekNumber,
      params.fileContents.map((f) => f.name)
    )
  }

  let knowledgeContext: string | undefined
  try {
    knowledgeContext = await loadKnowledgeContextForWeeklyPlan(
      params.themeName,
      params.selectedPlans
    )
  } catch (err) {
    console.warn('[LLM] 知识库查询失败，继续生成:', err)
  }

  const systemPrompt = buildGenerateSystemPrompt(knowledgeContext)
  const userMessage = buildGenerateUserMessage(params)

  const content = await browserChatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ])

  const json = extractJson(content)
  const result = JSON.parse(json)

  if (isValidWeeklyPlan(result)) {
    return assembleWeeklyPlan(result, params)
  }

  const retryContent = await browserChatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
      {
        role: 'user',
        content:
          '你上一次的返回格式不正确。请严格只输出 JSON，确保 dailyPlans 是有5个元素（周一到周五）的数组。',
      },
    ],
    { temperature: 0.3 }
  )

  const retryJson = extractJson(retryContent)
  const retryResult = JSON.parse(retryJson)

  if (isValidWeeklyPlan(retryResult)) {
    return assembleWeeklyPlan(retryResult, params)
  }

  throw new Error('LLM 返回格式两次均不合法，请重试')
}

async function browserModifyWeeklyPlan(params: {
  currentPlan: WeeklyPlan
  instruction: string
  chatHistory: ChatMessage[]
}): Promise<{ message: string; updatedPlan: WeeklyPlan }> {
  if (!isApiConfigured()) {
    return mockAiModify(params.instruction, params.currentPlan, params.chatHistory)
  }

  const systemPrompt = buildModifySystemPrompt(params.currentPlan)
  const userMessage = buildModifyUserMessage(params.instruction, params.chatHistory)

  const content = await browserChatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ])

  const json = extractJson(content)
  const result = JSON.parse(json)

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

  throw new Error('LLM 修改返回格式不合法')
}

function assembleWeeklyPlan(
  result: Pick<WeeklyPlan, 'weeklyFocus' | 'dailyPlans' | 'suggestions'>,
  params: {
    themeName: string
    className: ClassType
    weekNumber: number
  }
): WeeklyPlan {
  return {
    id: `plan_${Date.now()}`,
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
  className: ClassType
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

export async function modifyWeeklyPlan(
  params: AiModifyRequest
): Promise<{ message: string; updatedPlan: WeeklyPlan }> {
  if (isBackendApiEnabled()) {
    const response = await request.post<{
      success: boolean
      result: { message: string; updatedPlan: WeeklyPlan }
    }>('/api/v1/ai/weekly-plan/modify', params)
    return response.result
  }

  return browserModifyWeeklyPlan(params)
}

function mockTeachingPlans(
  themeName: string,
  className?: string,
  focusDomains?: string[],
  count = 5
): TeachingPlan[] {
  const grade = className || '通用'
  const domains =
    focusDomains && focusDomains.length > 0
      ? focusDomains
      : ['科学', '语言', '艺术', '健康', '社会'].slice(0, count)
  const n = domains.length
  const now = Date.now()
  return Array.from({ length: n }, (_, i) => {
    const domain = domains[i]
    return {
      id: `ai_${now}_${i}`,
      title: `${themeName}·${domain}`,
      domain,
      gradeLevel: grade,
      objectives: `1. 围绕「${themeName}」开展${domain}领域活动。\n2. 愿意表达与分享。\n3. 初步形成相关经验。`,
      content: `【活动准备】与「${themeName}」相关材料。\n【活动过程】导入→探索→分享→小结。\n【活动延伸】区域持续投放。`,
      source: 'ai' as const,
    }
  })
}

function normalizeTeachingPlans(raw: unknown, themeName: string): TeachingPlan[] {
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
      gradeLevel: String(p.gradeLevel || '通用'),
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

async function browserGenerateTeachingPlans(params: {
  themeName: string
  className?: string
  focusDomains?: string[]
  count?: number
}): Promise<TeachingPlan[]> {
  const count =
    params.focusDomains && params.focusDomains.length > 0
      ? params.focusDomains.length
      : params.count ?? 5

  if (!isApiConfigured()) {
    return mockTeachingPlans(params.themeName, params.className, params.focusDomains, count)
  }

  const systemPrompt = buildTeachingPlanSystemPrompt()
  const userMessage = buildTeachingPlanUserMessage({
    ...params,
    count,
  })


  const tryOnce = async (extra?: string) => {
    const content = await browserChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: extra ? `${userMessage}\n\n${extra}` : userMessage },
      ],
      { temperature: 0.7 }
    )
    const parsed = JSON.parse(extractJson(content))
    return normalizeTeachingPlans(parsed, params.themeName)
  }

  try {
    return await tryOnce()
  } catch {
    return await tryOnce('上次输出格式不符合要求，请严格按 JSON 的 plans 数组重新输出。')
  }
}

async function agentGenerateTeachingPlans(params: {
  themeName: string
  className?: string
  focusDomains?: string[]
  count?: number
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
    return normalizeTeachingPlans(parsed, params.themeName)
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
}): Promise<TeachingPlan[]> {
  const themeName = params.themeName.trim()
  if (!themeName) {
    throw new Error('请先填写主题名称')
  }

  const focusDomains = (params.focusDomains || [])
    .map((d) => d.trim())
    .filter(Boolean)
  const count = focusDomains.length > 0 ? focusDomains.length : params.count ?? 5

  // 优先走平台智能体（agent_id 默认 14317）
  try {
    return await agentGenerateTeachingPlans({
      themeName,
      className: params.className,
      focusDomains,
      count,
    })
  } catch (err) {
    // 未登录：直接提示，不降级 DeepSeek，避免误用
    if (err instanceof Error && err.message.includes('请先登录')) {
      throw err
    }
    console.warn('[LLM] 平台智能体教案生成失败，尝试本地/浏览器降级:', err)
  }

  if (isBackendApiEnabled()) {
    try {
      const response = await request.post<{ success: boolean; result: TeachingPlan[] }>(
        '/api/v1/ai/teaching-plans/generate',
        {
          themeName,
          className: params.className,
          focusDomains,
          count,
        }
      )
      return normalizeTeachingPlans(response.result, themeName)
    } catch (err) {
      console.warn('[LLM] 后端教案生成失败:', err)
    }
  }

  return browserGenerateTeachingPlans({
    themeName,
    className: params.className,
    focusDomains,
    count,
  })
}
