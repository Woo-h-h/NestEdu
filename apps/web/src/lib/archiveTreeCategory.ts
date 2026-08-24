import type { TeachingPlan } from '@/types/weeklyPlan'

export type ArchiveTreeCategory = 'practice' | 'research' | 'honor'

export const ARCHIVE_TREE_CATEGORY_LABELS: Record<ArchiveTreeCategory, string> = {
  practice: '特色实践',
  research: '教研科研',
  honor: '专业荣誉',
}

export function normalizeArchiveTreeCategory(raw: string): ArchiveTreeCategory {
  const t = (raw || '').trim()
  if (!t) return 'practice'
  if (t === 'practice' || t === 'research' || t === 'honor') return t
  if (/教研|科研|论文|课题|公开课|个案|课例|案例研究/.test(t)) return 'research'
  if (/荣誉|获奖|表彰|奖状|证书|研修|培训|观摩|骨干/.test(t)) return 'honor'
  if (/实践|主题|环境|家园|观察记录|教学过程/.test(t)) return 'practice'
  if (t.includes('专业研究成果')) return 'research'
  if (t.includes('获奖与荣誉') || t.includes('学习与研修')) return 'honor'
  return 'practice'
}

export function normalizeArchiveYear(raw: unknown, fallback = new Date().getFullYear()): number {
  const n = typeof raw === 'number' ? raw : Number(String(raw || '').replace(/\D/g, '').slice(0, 4))
  const max = new Date().getFullYear() + 1
  if (Number.isFinite(n) && n >= 1990 && n <= max) return Math.trunc(n)
  return fallback
}

/** 从成果库 markdown 读取智能体写入的分类与年份（兼容尚未落库的旧文档）。 */
export function extractArchiveTreeMetaFromMarkdown(content: string): {
  treeCategory?: ArchiveTreeCategory
  year?: number
} {
  const text = content || ''
  const catMatch = text.match(/成长树分类[：:]\s*([^\n>]+)/)
  const typeMatch = text.match(/成果类型[：:]\s*([^\n>]+)/)
  const yearMatch = text.match(/成果年份[：:]\s*(\d{4})/)
  const rawCat = (catMatch?.[1] || typeMatch?.[1] || '').trim()
  return {
    treeCategory: rawCat ? normalizeArchiveTreeCategory(rawCat) : undefined,
    year: yearMatch ? normalizeArchiveYear(yearMatch[1]) : undefined,
  }
}

export function resolveArchivePlanCategory(plan: TeachingPlan): ArchiveTreeCategory {
  if (plan.treeCategory) return plan.treeCategory
  const blob = `${plan.title}\n${plan.objectives || ''}\n${plan.content || ''}`
  const fromDoc = extractArchiveTreeMetaFromMarkdown(blob)
  if (fromDoc.treeCategory) return fromDoc.treeCategory
  return normalizeArchiveTreeCategory(blob)
}

export const ARCHIVE_TREE_CATEGORY_FILTERS = ['特色实践', '教研科研', '专业荣誉'] as const
