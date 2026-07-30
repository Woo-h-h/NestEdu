import type { TeachingPlan } from '@/types/weeklyPlan'
import { FOCUS_DOMAINS, type FocusDomain } from '@/pages/resources/DomainSelector'
import { inferFocusDomain } from '@/lib/inferFocusDomain'

/** 年级（教案库 / 周计划库一级分类），顺序：大班 → 中班 → 小班 */
export const CLASS_LEVELS = ['大班', '中班', '小班'] as const
export type ClassLevel = (typeof CLASS_LEVELS)[number]

/** 五领域（教案库二级分类），顺序按产品要求 */
export const ACTIVITY_DOMAINS = ['科学', '艺术', '语言', '健康', '社会'] as const
export type ActivityDomain = (typeof ACTIVITY_DOMAINS)[number]

const PARENT_CATEGORY_NOISE = new Set([
  '教案知识库管理',
  '周计划管理',
  '教师成果库',
  '综合',
  '通用',
  '平台',
  '全部',
])

export function isClassLevel(value: string): value is ClassLevel {
  return (CLASS_LEVELS as readonly string[]).includes(value)
}

export function isActivityDomain(value: string): value is ActivityDomain {
  return (ACTIVITY_DOMAINS as readonly string[]).includes(value)
}

/** 从字段或正文推断大班/中班/小班；支持「小四班」等含班型写法 */
export function normalizeClassLevel(...parts: Array<string | undefined | null>): ClassLevel | '' {
  const text = parts.filter(Boolean).join('\n')
  if (!text.trim()) return ''

  // 显式「班级：大班」优先
  const labeled = text.match(/班级[：:]\s*(大班|中班|小班)/)
  if (labeled?.[1] && isClassLevel(labeled[1])) return labeled[1]

  const marker = text.match(/年级[：:]\s*(大班|中班|小班)/)
  if (marker?.[1] && isClassLevel(marker[1])) return marker[1]

  // 小四班 / 中二班 / 大一班 → 小/中/大班
  if (/大\s*\d*\s*班|大班/.test(text)) return '大班'
  if (/中\s*\d*\s*班|中班/.test(text)) return '中班'
  if (/小\s*\d*\s*班|小班/.test(text)) return '小班'

  return ''
}

export function splitDomainTokens(domain: string): string[] {
  return String(domain || '')
    .split(/[、,，/|]/)
    .map((d) => d.replace(/[（）()]/g, '').trim())
    .filter(Boolean)
}

/** 抽取有效五领域；无效时从正文推断 */
export function resolveActivityDomains(
  domainField: string,
  ...textParts: Array<string | undefined | null>
): ActivityDomain[] {
  const fromField = splitDomainTokens(domainField).filter(
    (d): d is ActivityDomain => isActivityDomain(d) && !PARENT_CATEGORY_NOISE.has(d)
  )
  if (fromField.length > 0) return [...new Set(fromField)]

  const text = [domainField, ...textParts].filter(Boolean).join('\n')
  const found = ACTIVITY_DOMAINS.filter((d) => text.includes(d))
  if (found.length > 0) return found

  // 关键词回退（单领域）
  const inferred = inferFocusDomain(text) as ActivityDomain
  return isActivityDomain(inferred) ? [inferred] : []
}

/** 列表展示用：规范化 gradeLevel / domain */
export function enrichPlanTaxonomy(plan: TeachingPlan): TeachingPlan {
  const classLevel =
    normalizeClassLevel(plan.gradeLevel, plan.title, plan.objectives, plan.content) ||
    (plan.gradeLevel && !PARENT_CATEGORY_NOISE.has(plan.gradeLevel) ? plan.gradeLevel : '') ||
    '通用'

  const domains = resolveActivityDomains(plan.domain, plan.title, plan.objectives, plan.content)
  const domain =
    domains.length > 0
      ? domains.join('、')
      : PARENT_CATEGORY_NOISE.has(plan.domain) || !plan.domain.trim()
        ? '综合'
        : plan.domain

  return {
    ...plan,
    gradeLevel: classLevel,
    domain,
  }
}

export function enrichPlansTaxonomy(plans: TeachingPlan[]): TeachingPlan[] {
  return plans.map(enrichPlanTaxonomy)
}

/** 写入正文头部，便于入库后再推断分类 */
export function buildTaxonomyContentPrefix(params: {
  classLevel?: string
  domains?: string[]
}): string {
  const classLevel = normalizeClassLevel(params.classLevel || '') || ''
  const domains = (params.domains || [])
    .map((d) => d.trim())
    .filter((d): d is ActivityDomain => isActivityDomain(d))
  const parts: string[] = []
  if (classLevel) parts.push(`年级：${classLevel}`)
  if (domains.length > 0) parts.push(`领域：${domains.join('、')}`)
  if (parts.length === 0) return ''
  return `【分类】${parts.join('；')}\n\n`
}

export function filterPlansByTaxonomy(
  plans: TeachingPlan[],
  options: {
    classLevel?: ClassLevel | '全部'
    domain?: ActivityDomain | '全部'
  }
): TeachingPlan[] {
  const classLevel = options.classLevel && options.classLevel !== '全部' ? options.classLevel : ''
  const domain = options.domain && options.domain !== '全部' ? options.domain : ''

  return plans.filter((plan) => {
    if (classLevel) {
      const resolved = normalizeClassLevel(
        plan.gradeLevel,
        plan.title,
        plan.content,
        plan.objectives
      )
      if (resolved !== classLevel) return false
    }
    if (domain) {
      const domains = resolveActivityDomains(plan.domain, plan.title, plan.objectives, plan.content)
      if (!domains.includes(domain)) return false
    }
    return true
  })
}

/** 兼容旧代码：FOCUS_DOMAINS 与 ACTIVITY_DOMAINS 集合一致 */
export { FOCUS_DOMAINS }
export type { FocusDomain }
