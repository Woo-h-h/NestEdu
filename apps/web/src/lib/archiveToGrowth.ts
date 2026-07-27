import type { TeachingPlan } from '@/types/weeklyPlan'
import type { GrowthCategory, GrowthRecord } from '@/types/growth'

/** 将知识库教师成果文档映射为画像可用的成长记录 */
export function mapArchivePlansToGrowthRecords(plans: TeachingPlan[]): GrowthRecord[] {
  const now = new Date().toISOString()
  return plans.map((plan) => {
    const blob = `${plan.title}\n${plan.domain}\n${plan.objectives}\n${plan.content}`
    const category = inferGrowthCategory(blob)
    const year = inferYear(blob) || new Date().getFullYear()
    const dateMatch = blob.match(/(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})/)
    const date = dateMatch
      ? `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`
      : `${year}-01-01`

    return {
      id: `kb_archive_${plan.id}`,
      name: plan.title || '未命名成果',
      year,
      category,
      subtype: plan.domain || '',
      date,
      level: inferLevel(blob),
      role: '',
      org: '',
      intro: (plan.objectives || plan.content || '').slice(0, 300),
      keywords: [plan.domain, category].filter(Boolean),
      status: '已完成',
      representative: false,
      extra: { source: 'knowledge_archive', knowledgeId: plan.knowledgeId || '' },
      files: [],
      createdAt: now,
      updatedAt: now,
    }
  })
}

function inferGrowthCategory(text: string): GrowthCategory {
  if (/奖|荣誉|奖状|证书|表彰|优课|优质课|说课/.test(text)) return '获奖与荣誉'
  if (/研修|培训|学习|观摩|进修|学历|学时/.test(text)) return '学习与研修'
  return '专业研究成果'
}

function inferYear(text: string): number | null {
  const m = text.match(/(20\d{2})/)
  if (!m) return null
  const year = Number(m[1])
  const current = new Date().getFullYear()
  if (year >= 1990 && year <= current + 1) return year
  return null
}

function inferLevel(text: string): string {
  if (/国家|全国/.test(text)) return '国家级'
  if (/省/.test(text)) return '省级'
  if (/市/.test(text)) return '市级'
  if (/区|县/.test(text)) return '区级'
  if (/园|校/.test(text)) return '园级'
  return ''
}
