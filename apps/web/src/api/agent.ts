import { authBridge } from '@/lib/authBridge'
import { buildPlatformAuthHeaders, request, settings } from '@/api/client'
import axios from 'axios'

/** 教案生成智能体：https://www.zcat.cn/teach/agent/config/14317 */
export const TEACHING_AGENT_ID_DEFAULT = 14317

/** 周计划生成智能体：https://www.zcat.cn/teach/agent/config/14332 */
export const WEEKLY_PLAN_AGENT_ID_DEFAULT = 14332

/** 教师画像智能体：https://www.zcat.cn/teach/agent/config/14372 */
export const PROFILE_AGENT_ID_DEFAULT = 14372

/** 教师画像智能体（勿挂整库自动检索；由前端注入本人手机号文件夹摘要） */
export function getProfileAgentId(): number {
  const raw = (
    import.meta.env.VITE_PROFILE_AGENT_ID || String(PROFILE_AGENT_ID_DEFAULT)
  ).trim()
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : PROFILE_AGENT_ID_DEFAULT
}

export function getTeachingAgentId(): number {
  const raw = (import.meta.env.VITE_TEACHING_AGENT_ID || String(TEACHING_AGENT_ID_DEFAULT)).trim()
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : TEACHING_AGENT_ID_DEFAULT
}

export function getWeeklyPlanAgentId(): number {
  const raw = (
    import.meta.env.VITE_WEEKLY_PLAN_AGENT_ID || String(WEEKLY_PLAN_AGENT_ID_DEFAULT)
  ).trim()
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : WEEKLY_PLAN_AGENT_ID_DEFAULT
}

interface AgentTextGenerateEnvelope {
  success?: boolean
  status?: string
  result?: unknown
  data?: unknown
  text?: string
  content?: string
  errorMessage?: string
  error_message?: string
  message?: string
}

function pickText(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (!value || typeof value !== 'object') return ''

  const obj = value as Record<string, unknown>
  for (const key of ['text', 'content', 'output', 'answer', 'message', 'result']) {
    const nested = obj[key]
    if (typeof nested === 'string' && nested.trim()) return nested.trim()
  }
  return ''
}

function extractAxiosErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as AgentTextGenerateEnvelope | string | undefined
    if (typeof data === 'string' && data.trim()) return data.trim().slice(0, 300)
    if (data && typeof data === 'object') {
      const msg = (
        data.errorMessage ||
        data.error_message ||
        data.message ||
        ''
      ).trim()
      if (msg) return msg
    }
    if (err.response?.status === 401 || err.response?.status === 403) {
      return '请先登录后再使用智能生成'
    }
    if (err.response?.status) {
      return `生成请求失败，请稍后重试`
    }
    return err.message || '网络异常，请稍后重试'
  }
  if (err instanceof Error) return err.message
  return String(err)
}

/**
 * 调用平台智能体一次性文本生成（用户 Token + agent_id）
 * POST /v1/text/generate
 *
 * 注意：教案用 14317，周计划用 14332，调用方必须显式传入 agentId。
 */
export async function generateAgentText(
  text: string,
  options: { agentId: number; timeoutMs?: number }
): Promise<string> {
  const prompt = text.trim()
  if (!prompt) {
    throw new Error('生成内容不能为空')
  }
  if (!options.agentId || options.agentId <= 0) {
    throw new Error('智能助手配置无效')
  }

  const auth = authBridge.getAuthInfo()
  if (!auth?.token) {
    throw new Error('请先登录后再使用智能生成')
  }

  const agentId = options.agentId
  console.info(`[Agent] POST /v1/text/generate agent_id=${agentId}`)

  let envelope: AgentTextGenerateEnvelope
  try {
    envelope = await request.post<AgentTextGenerateEnvelope>(
      '/v1/text/generate',
      {
        agent_id: agentId,
        // 兼容部分网关同时认 camelCase
        agentId,
        text: prompt,
      },
      { timeout: options.timeoutMs ?? 120000 }
    )
  } catch (err) {
    throw new Error(extractAxiosErrorMessage(err))
  }

  if (envelope && envelope.success === false) {
    const msg =
      (envelope.errorMessage || envelope.error_message || envelope.message || '').trim() ||
      '生成失败，请稍后重试'
    throw new Error(msg)
  }

  const candidates = [
    pickText(envelope?.result),
    pickText(envelope?.data),
    pickText(envelope?.text),
    pickText(envelope?.content),
    pickText(envelope),
  ]
  const out = candidates.find((s) => s.length > 0)
  if (out) return out

  throw new Error('生成结果为空，请稍后重试')
}

interface AgentChatStreamChunk {
  event?: string
  content?: string
}

function pickChatReplyText(value: unknown): string {
  const direct = pickText(value)
  if (direct) return direct
  if (!value || typeof value !== 'object') return ''

  const obj = value as Record<string, unknown>
  const msgs = obj.messages ?? obj.msg_list
  if (Array.isArray(msgs)) {
    for (let i = msgs.length - 1; i >= 0; i--) {
      const item = msgs[i]
      if (!item || typeof item !== 'object') continue
      const role = String((item as Record<string, unknown>).role || '').toLowerCase()
      const content = pickText((item as Record<string, unknown>).content)
      if (role === 'assistant' && content) return content
    }
    for (let i = msgs.length - 1; i >= 0; i--) {
      const content = pickText(msgs[i])
      if (content) return content
    }
  }
  return ''
}

function parseAgentChatSseChunk(buffer: string): { events: AgentChatStreamChunk[]; rest: string } {
  const events: AgentChatStreamChunk[] = []
  const lines = buffer.split('\n')
  const rest = lines.pop() || ''
  for (const line of lines) {
    if (!line.startsWith('data:')) continue
    const payload = line.slice(5).trim()
    if (!payload || payload === '[DONE]') continue
    if (payload === '[TIMEOUT]') throw new Error('智能体解析超时，请重试')
    if (payload === '[ERROR]') throw new Error('智能体解析失败，请稍后重试')
    try {
      events.push(JSON.parse(payload) as AgentChatStreamChunk)
    } catch {
      // ignore malformed chunk
    }
  }
  return { events, rest }
}

/**
 * 与平台智能体聊天页一致：带附件走 `/api/ai/chat/completions` 流式接口（可识图）。
 * 纯文本一次性生成仍用 `generateAgentText` → `/v1/text/generate`。
 */
export async function generateAgentChatWithFiles(params: {
  agentId: number
  text: string
  files: Array<{ data: unknown }>
  timeoutMs?: number
}): Promise<string> {
  const prompt = params.text.trim()
  if (!prompt) throw new Error('生成内容不能为空')
  if (!params.agentId || params.agentId <= 0) throw new Error('智能助手配置无效')
  if (!params.files.length) throw new Error('缺少附件，无法解析图片/扫描件')

  const auth = authBridge.getAuthInfo()
  if (!auth?.token) throw new Error('请先登录后再使用智能生成')

  const base = settings.api.replace(/\/$/, '')
  const url = `${base}/api/ai/chat/completions`
  const headers = buildPlatformAuthHeaders()
  headers['Content-Type'] = 'application/json'
  headers.Accept = 'text/event-stream'

  const controller = new AbortController()
  const timeoutMs = params.timeoutMs ?? 120000
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)

  console.info(`[Agent] POST /api/ai/chat/completions agent_id=${params.agentId} files=${params.files.length}`)

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      credentials: 'include',
      signal: controller.signal,
      body: JSON.stringify({
        text: prompt,
        agent_id: params.agentId,
        files: params.files,
      }),
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('智能体解析超时，请重试')
    }
    throw new Error(extractAxiosErrorMessage(err))
  } finally {
    window.clearTimeout(timer)
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('请先登录后再使用智能生成')
    }
    let detail = ''
    try {
      const raw = await response.text()
      const parsed = JSON.parse(raw) as AgentTextGenerateEnvelope
      detail = (parsed.errorMessage || parsed.error_message || parsed.message || '').trim()
    } catch {
      // ignore non-JSON error body
    }
    throw new Error(detail || `智能体对话失败 (${response.status})`)
  }
  if (!response.body) throw new Error('智能体未返回数据流')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let content = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parsed = parseAgentChatSseChunk(buffer)
    buffer = parsed.rest
    for (const chunk of parsed.events) {
      if (chunk.content) content += chunk.content
    }
  }
  if (buffer.trim()) {
    const parsed = parseAgentChatSseChunk(`${buffer}\n`)
    for (const chunk of parsed.events) {
      if (chunk.content) content += chunk.content
    }
  }

  const out = content.trim()
  if (out) return out

  throw new Error('智能体解析结果为空')
}

/** 非流式对话（部分场景可用）；优先 `generateAgentChatWithFiles` */
export async function generateAgentSendMessage(params: {
  agentId: number
  text: string
  files?: Array<{ data: unknown }>
  timeoutMs?: number
}): Promise<string> {
  const prompt = params.text.trim()
  if (!prompt) throw new Error('生成内容不能为空')
  if (!params.agentId || params.agentId <= 0) throw new Error('智能助手配置无效')

  const auth = authBridge.getAuthInfo()
  if (!auth?.token) throw new Error('请先登录后再使用智能生成')

  let envelope: AgentTextGenerateEnvelope
  try {
    envelope = await request.post<AgentTextGenerateEnvelope>(
      '/api/ai/chat/send_message',
      {
        text: prompt,
        agent_id: params.agentId,
        files: params.files?.length ? params.files : undefined,
      },
      { timeout: params.timeoutMs ?? 120000 }
    )
  } catch (err) {
    throw new Error(extractAxiosErrorMessage(err))
  }

  if (envelope && envelope.success === false) {
    const msg =
      (envelope.errorMessage || envelope.error_message || envelope.message || '').trim() ||
      '生成失败，请稍后重试'
    throw new Error(msg)
  }

  const candidates = [
    pickChatReplyText(envelope?.result),
    pickChatReplyText(envelope?.data),
    pickText(envelope?.result),
    pickText(envelope?.data),
    pickText(envelope),
  ]
  const out = candidates.find((s) => s.length > 0)
  if (out) return out

  throw new Error('生成结果为空，请稍后重试')
}
