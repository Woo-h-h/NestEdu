import { generateAgentText } from '@/api/agent'
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

/**
 * 调用成果解析智能体（14509）：超时与最多 1 次格式重试。
 * 解析失败不假装成功：返回 failed + 原文件信息文档，由调用方提示人工核对。
 */
export async function parseArchiveAchievement(params: {
  title: string
  fileName: string
  fileUrl?: string
  fileSize: number
  mimeType?: string
  extractedText?: string
  platformOcrText?: string
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

  const basePrompt = `${ARCHIVE_PARSE_AGENT_PLATFORM_PROMPT}\n\n${userMessage}\n\n请只输出 JSON，不要其它说明。`
  const agentId = getArchiveParseAgentId()

  const tryOnce = async (extra?: string) => {
    const raw = await generateAgentText(extra ? `${basePrompt}\n\n${extra}` : basePrompt, {
      agentId,
      timeoutMs: 90000,
    })
    const parsed = JSON.parse(extractJson(raw)) as ArchiveParseJson
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
        isImage,
        needsHumanReview,
      }),
    } satisfies ArchiveParseResult
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
