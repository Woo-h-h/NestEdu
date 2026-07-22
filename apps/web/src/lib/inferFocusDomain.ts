import { FOCUS_DOMAINS, type FocusDomain } from '@/pages/resources/DomainSelector'

const KEYWORDS: Record<FocusDomain, string[]> = {
  科学: ['科学', '探究', '自然', '实验', '发现', '观察'],
  语言: ['语言', '阅读', '表达', '故事', '图书', '谈话', '儿歌'],
  艺术: ['艺术', '音乐', '美术', '绘画', '手工', '律动'],
  社会: ['社会', '交往', '规则', '合作', '情感'],
  健康: ['健康', '体能', '运动', '习惯', '户外', '体育'],
}

/** 从活动标题/描述文本推断五领域之一，默认科学 */
export function inferFocusDomain(text: string): FocusDomain {
  const trimmed = text.trim()
  if (!trimmed) return '科学'

  for (const domain of FOCUS_DOMAINS) {
    if (trimmed.includes(domain)) return domain
  }

  for (const domain of FOCUS_DOMAINS) {
    const words = KEYWORDS[domain]
    if (words.some((w) => trimmed.includes(w))) return domain
  }

  return '科学'
}
