import type { GrowthCategory } from '@/types/growth'

export interface ExtraFieldConfig {
  key: string
  label: string
  placeholder?: string
}

export interface CategoryConfig {
  label: GrowthCategory
  description: string
  icon: string
  subtypes: string[]
  roles: string[]
  extraFields: ExtraFieldConfig[]
}

export const GROWTH_LEVELS = ['园级', '片区/街道', '区级', '市级', '省级', '国家级', '其他'] as const

export const GROWTH_STATUSES = ['进行中', '已完成', '已发表/结题'] as const

export const GROWTH_CATEGORIES: CategoryConfig[] = [
  {
    label: '专业研究成果',
    description: '论文、课题、案例、著作等专业产出',
    icon: '📚',
    subtypes: ['论文', '课题', '案例', '著作', '其他'],
    roles: ['第一作者', '通讯作者', '核心成员', '参与'],
    extraFields: [
      { key: 'publication', label: '刊物/出版社', placeholder: '如：学前教育研究' },
      { key: 'volume', label: '卷期/页码', placeholder: '如：2025年第3期' },
      { key: 'doi', label: 'DOI/编号', placeholder: '可选' },
    ],
  },
  {
    label: '获奖与荣誉',
    description: '教学比赛、科研奖项、综合荣誉等',
    icon: '🏆',
    subtypes: ['教学比赛', '科研奖项', '综合荣誉', '指导获奖', '其他'],
    roles: ['个人', '团队负责人', '团队成员'],
    extraFields: [
      { key: 'awardName', label: '奖项全称', placeholder: '如：市级优质课评比' },
      { key: 'rank', label: '等次/名次', placeholder: '如：一等奖' },
    ],
  },
  {
    label: '学习与研修',
    description: '培训、观摩、学历提升、证书等',
    icon: '🎓',
    subtypes: ['培训', '观摩', '学历提升', '证书', '其他'],
    roles: ['学员', '主讲', '组织者'],
    extraFields: [
      { key: 'hours', label: '学时/天数', placeholder: '如：24 学时' },
      { key: 'certificateNo', label: '证书编号', placeholder: '可选' },
    ],
  },
]

export function getCategoryConfig(category: GrowthCategory | string): CategoryConfig | undefined {
  return GROWTH_CATEGORIES.find((item) => item.label === category)
}

export function countByCategory(records: { category: string }[]): Record<GrowthCategory, number> {
  const counts: Record<GrowthCategory, number> = {
    专业研究成果: 0,
    获奖与荣誉: 0,
    学习与研修: 0,
  }
  for (const record of records) {
    if (record.category in counts) {
      counts[record.category as GrowthCategory] += 1
    }
  }
  return counts
}
