import { authBridge } from '@/lib/authBridge'
import { request } from '@/api/client'

/** 平台教案生成智能体，见 https://www.zcat.cn/teach/agent/config/14317 */
export function getTeachingAgentId(): number {
  const raw = (import.meta.env.VITE_TEACHING_AGENT_ID || '14317').trim()
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : 14317
}

/** 平台周计划生成智能体，见 https://www.zcat.cn/teach/agent/config/14332 */
export function getWeeklyPlanAgentId(): number {
  const raw = (import.meta.env.VITE_WEEKLY_PLAN_AGENT_ID || '14332').trim()
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : 14332
}

interface AgentTextGenerateEnvelope {
  success?: boolean
  status?: string
  result?: { text?: string } | string
  errorMessage?: string
  error_message?: string
}

/**
 * 调用平台智能体一次性文本生成（用户 Token + agent_id）
 * 文档：POST /v1/text/generate
 */
export async function generateAgentText(
  text: string,
  options?: { agentId?: number; timeoutMs?: number }
): Promise<string> {
  const prompt = text.trim()
  if (!prompt) {
    throw new Error('生成内容不能为空')
  }

  const auth = authBridge.getAuthInfo()
  if (!auth?.token) {
    throw new Error('请先登录平台后再使用智能体生成')
  }

  const agentId = options?.agentId ?? getTeachingAgentId()
  const envelope = await request.post<AgentTextGenerateEnvelope>(
    '/v1/text/generate',
    {
      agent_id: agentId,
      text: prompt,
    },
    { timeout: options?.timeoutMs ?? 90000 }
  )

  if (envelope && envelope.success === false) {
    const msg =
      (envelope.errorMessage || envelope.error_message || '').trim() ||
      '智能体生成失败'
    throw new Error(msg)
  }

  const result = envelope?.result
  if (typeof result === 'string' && result.trim()) {
    return result.trim()
  }
  if (result && typeof result === 'object' && typeof result.text === 'string') {
    const out = result.text.trim()
    if (out) return out
  }

  throw new Error('智能体返回内容为空')
}
