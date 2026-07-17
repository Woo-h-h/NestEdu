import { authBridge } from '@/lib/authBridge'
import { request } from '@/api/client'
import axios from 'axios'

/** 教案生成智能体：https://www.zcat.cn/teach/agent/config/14317 */
export const TEACHING_AGENT_ID_DEFAULT = 14317

/** 周计划生成智能体：https://www.zcat.cn/teach/agent/config/14332 */
export const WEEKLY_PLAN_AGENT_ID_DEFAULT = 14332

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
      return '请先登录平台后再使用智能体生成'
    }
    if (err.response?.status) {
      return `智能体请求失败 (${err.response.status})`
    }
    return err.message || '智能体网络请求失败'
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
    throw new Error('智能体 ID 无效')
  }

  const auth = authBridge.getAuthInfo()
  if (!auth?.token) {
    throw new Error('请先登录平台后再使用智能体生成')
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
      `智能体 ${agentId} 生成失败`
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

  throw new Error(`智能体 ${agentId} 返回内容为空`)
}
