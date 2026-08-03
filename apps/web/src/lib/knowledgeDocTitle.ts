import {
  getCurrentTeacherDisplayName,
  getCurrentTeacherPhone,
} from '@/api/platformUser'

/** 知识库文档业务类型（写入标题中间段） */
export type KnowledgeDocKind = 'activity' | 'weekly'

const KIND_LABEL: Record<KnowledgeDocKind, string> = {
  activity: '活动方案',
  weekly: '周计划',
}

/** 去掉非法文件名字符，压缩空白 */
export function sanitizeDocTitleSegment(raw: string, maxLen = 80): string {
  const cleaned = String(raw || '')
    .replace(/[\\/:*?"<>|\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return ''
  return cleaned.length <= maxLen ? cleaned : `${cleaned.slice(0, maxLen)}…`
}

/** 去掉已有「姓名（手机号）_类型_」或「姓名_类型_」前缀与末尾 .md */
export function stripKnowledgeDocDecorations(title: string): string {
  let t = String(title || '').trim()
  t = t.replace(/\.md$/i, '')
  // 旧格式：姓名（手机号）_活动方案_
  t = t.replace(/^.+?[（(]\d{11}[）)]\s*_(?:活动方案|周计划)_/, '')
  // 新格式：姓名_活动方案_（标题不再含手机号，避免平台智能分类进成果库手机号文件夹）
  t = t.replace(/^.+?_(?:活动方案|周计划)_/, '')
  return t.trim() || String(title || '').trim().replace(/\.md$/i, '')
}

/**
 * 规范入库标题（不含连续 11 位手机号）：
 * `王焕_活动方案_方案名.md`
 * `王焕_周计划_周计划名.md`
 *
 * 手机号改写入正文【归属】行，避免 AI101「智能分类」按标题手机号匹配到
 * 「教师成果库 / 17362955307」文件夹。
 */
export function buildKnowledgeDocTitle(params: {
  displayName: string
  phone: string
  kind: KnowledgeDocKind
  planName: string
}): string {
  const name = sanitizeDocTitleSegment(params.displayName, 40)
  const kindLabel = KIND_LABEL[params.kind]
  const planName =
    sanitizeDocTitleSegment(stripKnowledgeDocDecorations(params.planName), 100) || '未命名'

  if (!name) {
    return `${planName}.md`
  }

  return `${name}_${kindLabel}_${planName}.md`
}

/** 正文头部归属信息（可检索）。
 * 默认不写完整手机号：平台会按正文中的 11 位号「智能分类」进教师成果库手机号文件夹。
 * 归属手机号以 MySQL teacher_generated_docs 为准。
 */
export function buildOwnerContentPrefix(params: {
  displayName: string
  phone: string
  /** 仅成果库等场景需要在正文保留完整手机号时开启 */
  includePhone?: boolean
}): string {
  const name = sanitizeDocTitleSegment(params.displayName, 40)
  const phone = sanitizeDocTitleSegment(params.phone, 20).replace(/\s+/g, '')
  if (!name && !phone) return ''
  const parts: string[] = []
  if (name) parts.push(`姓名：${name}`)
  if (params.includePhone && phone) {
    parts.push(`手机号：${phone}`)
  } else if (phone && phone.length >= 7) {
    // 仅留尾号，避免连续 11 位触发平台按文件夹名匹配
    parts.push(`教师尾号：${phone.slice(-4)}`)
  }
  return `【归属】${parts.join('；')}\n\n`
}

export async function resolveOwnerIdentityForDocTitle(): Promise<{
  displayName: string
  phone: string
}> {
  const [displayName, phone] = await Promise.all([
    getCurrentTeacherDisplayName(),
    getCurrentTeacherPhone(),
  ])
  if (!phone) {
    throw new Error('未能获取手机号，请先登录平台后再上传')
  }
  if (!displayName) {
    throw new Error('未能获取用户姓名，请先登录平台后再上传')
  }
  return { displayName, phone }
}

/** 列表本地关键词过滤（标题 / 目标 / 正文） */
export function filterPlansByKeyword<
  T extends { title?: string; objectives?: string; content?: string; domain?: string },
>(plans: T[], keyword: string): T[] {
  const q = keyword.trim().toLowerCase()
  if (!q) return plans
  return plans.filter((plan) => {
    const hay = [plan.title, plan.objectives, plan.content, plan.domain]
      .filter(Boolean)
      .join('\n')
      .toLowerCase()
    return hay.includes(q)
  })
}
