import {
  generateAgentChatWithFiles,
  generateAgentSendMessage,
  generateAgentText,
} from '@/api/agent'
import { extractJson } from '@/lib/weeklyPlanValidators'
import {
  ARCHIVE_PARSE_AGENT_PLATFORM_PROMPT,
  buildArchiveParseUserMessage,
} from '@/lib/prompts'

/** 成果解析智能体：https://www.zcat.cn/teach/agent/chat/14509 */
export const ARCHIVE_PARSE_AGENT_ID_DEFAULT = 14509

export function getArchiveParseAgentId(): number {
  const raw = (
    import.meta.env.VITE_ARCHIVE_PARSE_AGENT_ID || String(ARCHIVE_PARSE_AGENT_ID_DEFAULT)
  ).trim()
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : ARCHIVE_PARSE_AGENT_ID_DEFAULT
}

export type ArchiveParseStatus = 'ok' | 'partial' | 'failed'

export interface ArchiveParseResult {
  title: string
  summary: string
  body: string
  materialType: string
  keyPoints: string[]
  status: ArchiveParseStatus
  /** 写入知识库的完整 markdown */
  documentContent: string
}

interface ArchiveParseJson {
  title?: string
  summary?: string
  body?: string
  materialType?: string
  keyPoints?: unknown
  needsHumanReview?: boolean
}

function truncate(text: string, max: number): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : String(item || '').trim()))
    .filter(Boolean)
    .slice(0, 8)
}

function buildFallbackDocument(params: {
  title: string
  fileName: string
  fileUrl?: string
  fileSize: number
  isImage: boolean
  extractedText?: string
  platformOcrText?: string
  errorHint: string
}): string {
  const lines = [
    `# ${params.title}`,
    '',
    `> 解析状态：未完成（${params.errorHint}）。以下为原文件信息，请人工核对后补充成果说明。`,
    '',
    `- 原始文件：${params.fileName}`,
    `- 大小：${params.fileSize} 字节`,
  ]
  if (params.fileUrl) {
    lines.push(`- 文件地址：${params.fileUrl}`)
    if (params.isImage) {
      lines.push('', `![${params.title}](${params.fileUrl})`)
    } else {
      lines.push('', `[打开原文件](${params.fileUrl})`)
    }
  }
  const raw = (params.platformOcrText || params.extractedText || '').trim()
  if (raw) {
    lines.push('', '## 原始可提取文本', '', raw.slice(0, 8000))
  }
  return lines.join('\n')
}

function buildSuccessDocument(params: {
  title: string
  summary: string
  body: string
  materialType: string
  keyPoints: string[]
  fileName: string
  fileUrl?: string
  fileSize: number
  isImage: boolean
  needsHumanReview: boolean
}): string {
  const lines = [
    `# ${params.title}`,
    '',
    `> 成果类型：${params.materialType || '未分类'}`,
    params.needsHumanReview
      ? '> 解析状态：需人工核对（智能体置信不足或材料不完整）'
      : '> 解析状态：智能解析完成，请人工核对后使用',
    '',
    '## 成果摘要',
    '',
    params.summary || '（无摘要）',
  ]
  if (params.keyPoints.length > 0) {
    lines.push('', '## 要点', '')
    for (const point of params.keyPoints) {
      lines.push(`- ${point}`)
    }
  }
  lines.push('', '## 成果正文', '', params.body || '（无正文）', '', '## 原文件', '')
  lines.push(`- 原始文件：${params.fileName}`)
  lines.push(`- 大小：${params.fileSize} 字节`)
  if (params.fileUrl) {
    lines.push(`- 文件地址：${params.fileUrl}`)
    if (params.isImage) {
      lines.push('', `![${params.title}](${params.fileUrl})`)
    } else {
      lines.push('', `[打开原文件](${params.fileUrl})`)
    }
  }
  return lines.join('\n')
}

function mapParseJson(
  parsed: ArchiveParseJson,
  params: {
    title: string
    fileName: string
    fileUrl?: string
    fileSize: number
    isImage: boolean
  }
): ArchiveParseResult {
  const title = (parsed.title || params.title || params.fileName).trim()
  const summary = (parsed.summary || '').trim()
  const body = (parsed.body || '').trim()
  const materialType = (parsed.materialType || '').trim() || '其他'
  const keyPoints = asStringList(parsed.keyPoints)
  const needsHumanReview = Boolean(parsed.needsHumanReview) || (!summary && !body)

  if (!summary && !body) {
    throw new Error('智能体未返回有效成果摘要或正文')
  }

  const status: ArchiveParseStatus = needsHumanReview ? 'partial' : 'ok'
  return {
    title,
    summary: summary || truncate(body, 120),
    body: body || summary,
    materialType,
    keyPoints,
    status,
    documentContent: buildSuccessDocument({
      title,
      summary: summary || truncate(body, 120),
      body: body || summary,
      materialType,
      keyPoints,
      fileName: params.fileName,
      fileUrl: params.fileUrl,
      fileSize: params.fileSize,
      isImage: params.isImage,
      needsHumanReview,
    }),
  }
}

async function invokeArchiveParseAgent(params: {
  userMessage: string
  platformFileData?: unknown
  agentId: number
  retryHint?: string
}): Promise<string> {
  const suffix = params.retryHint
    ? `${params.retryHint}\n\n请只输出 JSON，不要其它说明。`
    : '请只输出 JSON，不要其它说明。'
  const text = `${params.userMessage}\n\n${suffix}`

  // 与平台聊天页一致：附件走 chat/completions（多模态识图）
  if (params.platformFileData) {
    try {
      return await generateAgentChatWithFiles({
        agentId: params.agentId,
        text,
        files: [{ data: params.platformFileData }],
        timeoutMs: 90000,
      })
    } catch (chatErr) {
      console.warn('[ArchiveParse] chat/completions failed, try send_message', chatErr)
      return await generateAgentSendMessage({
        agentId: params.agentId,
        text,
        files: [{ data: params.platformFileData }],
        timeoutMs: 90000,
      })
    }
  }

  // 仅有可提取正文时走 text/generate（平台侧应已配置系统提示词；本地再拼一份兜底）
  const basePrompt = `${ARCHIVE_PARSE_AGENT_PLATFORM_PROMPT}\n\n${text}`
  return generateAgentText(basePrompt, { agentId: params.agentId, timeoutMs: 90000 })
}

/**
 * 调用成果解析智能体（14509）：超时与最多 1 次格式重试。
 * 图片/扫描件须传 platformFileData（file/upload 原始 result），与平台聊天附件一致。
 */
export async function parseArchiveAchievement(params: {
  title: string
  fileName: string
  fileUrl?: string
  fileSize: number
  mimeType?: string
  extractedText?: string
  platformOcrText?: string
  /** /api/file/upload 返回的 result，供智能体识图 */
  platformFileData?: unknown
}): Promise<ArchiveParseResult> {
  const isImage =
    Boolean(params.mimeType?.startsWith('image/')) ||
    /\.(png|jpe?g|gif|webp|bmp)$/i.test(params.fileName)

  const userMessage = buildArchiveParseUserMessage({
    fileName: params.fileName,
    fileUrl: params.fileUrl,
    fileSize: params.fileSize,
    mimeType: params.mimeType,
    extractedText: params.extractedText,
    platformOcrText: params.platformOcrText,
  })

  const agentId = getArchiveParseAgentId()
  const baseParams = {
    title: params.title,
    fileName: params.fileName,
    fileUrl: params.fileUrl,
    fileSize: params.fileSize,
    isImage,
  }

  const tryOnce = async (retryHint?: string) => {
    const raw = await invokeArchiveParseAgent({
      userMessage,
      platformFileData: params.platformFileData,
      agentId,
      retryHint,
    })
    const parsed = JSON.parse(extractJson(raw)) as ArchiveParseJson
    return mapParseJson(parsed, baseParams)
  }

  try {
    return await tryOnce()
  } catch (firstErr) {
    if (firstErr instanceof Error && firstErr.message.includes('请先登录')) {
      throw firstErr
    }
    try {
      return await tryOnce(
        '上次输出不符合要求。请严格输出 JSON 对象，字段含 title、summary、body、materialType、keyPoints、needsHumanReview；禁止只复述“这是截图/图片文件”。'
      )
    } catch (secondErr) {
      const hint =
        secondErr instanceof Error
          ? secondErr.message
          : firstErr instanceof Error
            ? firstErr.message
            : '解析失败'
      console.warn('[ArchiveParse] agent failed, fallback to raw file doc:', hint)
      const title = params.title || params.fileName
      const fallbackBody = buildFallbackDocument({
        title,
        fileName: params.fileName,
        fileUrl: params.fileUrl,
        fileSize: params.fileSize,
        isImage,
        extractedText: params.extractedText,
        platformOcrText: params.platformOcrText,
        errorHint: hint.slice(0, 120),
      })
      return {
        title,
        summary: `解析未完成：${hint.slice(0, 80)}。请打开原文件人工核对。`,
        body: fallbackBody,
        materialType: '其他',
        keyPoints: [],
        status: 'failed',
        documentContent: fallbackBody,
      }
    }
  }
}
