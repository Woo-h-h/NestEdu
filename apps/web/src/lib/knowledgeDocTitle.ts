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

/** 去掉已有「姓名（手机号）_类型_」前缀与末尾 .md，便于再拼或解析元数据 */
export function stripKnowledgeDocDecorations(title: string): string {
  let t = String(title || '').trim()
  t = t.replace(/\.md$/i, '')
  t = t.replace(/^.+?[（(]\d{11}[）)]_(?:活动方案|周计划)_/, '')
  return t.trim() || String(title || '').trim().replace(/\.md$/i, '')
}

/**
 * 规范入库标题：
 * `王焕（17362955307）_活动方案_方案名.md`
 * `王焕（17362955307）_周计划_周计划名.md`
 */
export function buildKnowledgeDocTitle(params: {
  displayName: string
  phone: string
  kind: KnowledgeDocKind
  planName: string
}): string {
  const name = sanitizeDocTitleSegment(params.displayName, 40)
  const phone = sanitizeDocTitleSegment(params.phone, 20).replace(/\s+/g, '')
  const kindLabel = KIND_LABEL[params.kind]
  const planName =
    sanitizeDocTitleSegment(stripKnowledgeDocDecorations(params.planName), 100) || '未命名'

  if (!name || !phone) {
    // 缺少身份时仍返回可读标题，调用方应优先保证已登录并拿到资料
    return `${planName}.md`
  }

  return `${name}（${phone}）_${kindLabel}_${planName}.md`
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
    throw new Error('未能获取手机号，请先登录平台后再上传（文件名需要「姓名（手机号）」前缀）')
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
