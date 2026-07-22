import type { GrowthCategory, GrowthRecord } from '@/types/growth'

/** 系统生成类计数占位，后续接知识库统计 */
export interface SystemStats {
  activityPlans?: number
  weeklyPlans?: number
}

export interface CategoryCountItem {
  key: string
  label: string
  count: number
  source: 'system' | 'teacher'
}

export interface ProfileDimension {
  id: DimensionId
  label: string
  count: number
  description: string
  sources: string[]
}

export type DimensionId = 'activity' | 'research' | 'contribution'

export interface AnalysisItem {
  title: string
  text: string
  evidence: string
  source: string
}

export interface StrengthGapResult {
  strengths: AnalysisItem[]
  gaps: AnalysisItem[]
}

export interface WordCloudItem {
  word: string
  weight: number
}

export interface GrowthPath {
  id: string
  label: string
  description: string
  matchPercent: number
  relatedCategories: GrowthCategory[]
}

export interface YearTrendSeries {
  dimensionId: DimensionId
  label: string
  points: { year: number; count: number }[]
}

export interface DefaultActionSeed {
  id: string
  title: string
  description: string
  dimensionId?: DimensionId
}

const DIMENSION_LABELS: Record<DimensionId, string> = {
  activity: '保教活动设计与实施',
  research: '专业学习与园本研究',
  contribution: '园本资源与协同贡献',
}

const LEVEL_WEIGHT: Record<string, number> = {
  国家级: 5,
  省级: 4,
  市级: 3,
  '片区/街道': 2,
  区级: 2,
  园级: 1,
  其他: 1,
}

function countByTeacherCategory(records: GrowthRecord[]): Record<GrowthCategory, number> {
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

/** 结构丰富度：基于记录量映射 0–100，非能力或绩效评分 */
export function structuralRichnessScore(count: number, tiers = [1, 2, 4, 7, 12]): number {
  if (count <= 0) return 10
  let score = 18
  for (let i = 0; i < tiers.length; i += 1) {
    if (count >= tiers[i]) {
      score = 28 + i * 18
    }
  }
  return Math.min(100, score)
}

export function buildCategoryCounts(
  records: GrowthRecord[],
  systemStats: SystemStats = {}
): CategoryCountItem[] {
  const teacher = countByTeacherCategory(records)
  const activityPlans = systemStats.activityPlans ?? 0
  const weeklyPlans = systemStats.weeklyPlans ?? 0

  return [
    { key: 'activityPlans', label: '活动方案', count: activityPlans, source: 'system' },
    { key: 'weeklyPlans', label: '周计划', count: weeklyPlans, source: 'system' },
    {
      key: '专业研究成果',
      label: '专业研究成果',
      count: teacher['专业研究成果'],
      source: 'teacher',
    },
    { key: '获奖与荣誉', label: '获奖与荣誉', count: teacher['获奖与荣誉'], source: 'teacher' },
    { key: '学习与研修', label: '学习与研修', count: teacher['学习与研修'], source: 'teacher' },
  ]
}

export function buildDimensions(
  records: GrowthRecord[],
  systemStats: SystemStats = {}
): ProfileDimension[] {
  const teacher = countByTeacherCategory(records)
  const activityPlans = systemStats.activityPlans ?? 0
  const weeklyPlans = systemStats.weeklyPlans ?? 0
  const activityCount = activityPlans + weeklyPlans
  const researchCount = teacher['专业研究成果'] + teacher['学习与研修']
  const contributionCount = teacher['获奖与荣誉']

  return [
    {
      id: 'activity',
      label: DIMENSION_LABELS.activity,
      count: activityCount,
      description: '由系统生成的活动方案与周计划计入保教实施结构',
      sources:
        activityCount > 0
          ? ['系统自动统计：活动方案', '系统自动统计：周计划']
          : ['系统自动统计（待接入）'],
    },
    {
      id: 'research',
      label: DIMENSION_LABELS.research,
      count: researchCount,
      description: '专业研究成果与研修学习共同反映园本研究与学习结构',
      sources: ['教师录入：专业研究成果', '教师录入：学习与研修'],
    },
    {
      id: 'contribution',
      label: DIMENSION_LABELS.contribution,
      count: contributionCount,
      description: '获奖与荣誉记录体现实践展示与协同贡献结构',
      sources: ['教师录入：获奖与荣誉'],
    },
  ]
}

/** 雷达结构值：各维 0–100，表示成长结构观察而非能力评分 */
export function buildRadarValues(
  records: GrowthRecord[],
  systemStats: SystemStats = {}
): { labels: string[]; values: number[]; dimensionIds: DimensionId[] } {
  const dimensions = buildDimensions(records, systemStats)
  return {
    labels: dimensions.map((d) => d.label),
    values: dimensions.map((d) => structuralRichnessScore(d.count)),
    dimensionIds: dimensions.map((d) => d.id),
  }
}

export function buildYearTrend(
  records: GrowthRecord[],
  years: number[] = [2024, 2025, 2026],
  systemStats: SystemStats = {}
): YearTrendSeries[] {
  const dimensions = buildDimensions(records, systemStats)

  return dimensions.map((dim) => {
    const points = years.map((year) => {
      if (dim.id === 'activity') {
        const inRange = records.length === 0 && (systemStats.activityPlans || systemStats.weeklyPlans)
        return { year, count: inRange ? dim.count : 0 }
      }
      let count = 0
      if (dim.id === 'research') {
        count = records.filter(
          (r) =>
            r.year === year &&
            (r.category === '专业研究成果' || r.category === '学习与研修')
        ).length
      } else if (dim.id === 'contribution') {
        count = records.filter((r) => r.year === year && r.category === '获奖与荣誉').length
      }
      return { year, count }
    })
    return { dimensionId: dim.id, label: dim.label, points }
  })
}

function categoryLabel(category: GrowthCategory): string {
  return category
}

export function buildStrengthsAndGaps(records: GrowthRecord[]): StrengthGapResult {
  const strengths: AnalysisItem[] = []
  const gaps: AnalysisItem[] = []
  const teacher = countByTeacherCategory(records)
  const total = records.length
  const categories = Object.entries(teacher) as [GrowthCategory, number][]
  const maxCount = Math.max(...categories.map(([, c]) => c), 0)
  const years = new Set(records.map((r) => r.year))
  const repCount = records.filter((r) => r.representative).length
  const highLevel = records.filter((r) =>
    ['市级', '省级', '国家级'].includes(r.level)
  ).length

  if (total === 0) {
    gaps.push({
      title: '尚无成长记录',
      text: '建议先在成果库录入或生成保教成果，画像将据此形成个人成长结构观察。',
      evidence: '当前录入 0 条',
      source: '规则：空数据',
    })
    return { strengths, gaps }
  }

  for (const [category, count] of categories) {
    if (count >= 2 && count === maxCount) {
      strengths.push({
        title: `${categoryLabel(category)}积累较充分`,
        text: `您在「${category}」方向已有 ${count} 条记录，成长结构在该维度较为丰富。`,
        evidence: `${category} ${count} 条`,
        source: '规则：录入类最高且≥2',
      })
    }
    if (count === 0 && total >= 1) {
      gaps.push({
        title: `${categoryLabel(category)}待补充`,
        text: `尚未录入「${category}」类成果，可结合近期工作补充 1–2 条代表性记录。`,
        evidence: `${category} 0 条`,
        source: '规则：录入类缺失',
      })
    }
  }

  if (years.size >= 2) {
    strengths.push({
      title: '跨年度持续积累',
      text: `成果分布在 ${years.size} 个年度，体现持续的专业成长轨迹。`,
      evidence: `涉及年度：${[...years].sort().join('、')}`,
      source: '规则：跨年度≥2',
    })
  }

  if (highLevel >= 1) {
    strengths.push({
      title: '较高层级成果可见',
      text: '已有市级及以上层级的记录，可在代表成果中重点展示。',
      evidence: `高层级记录 ${highLevel} 条`,
      source: '规则：level 权重',
    })
  }

  if (repCount === 0 && total >= 2) {
    gaps.push({
      title: '尚未标记代表成果',
      text: '建议在成果库为 1–3 条最满意的作品开启「代表成果」，便于年度报告展示。',
      evidence: '代表成果 0 条',
      source: '规则：representative',
    })
  }

  if (teacher['学习与研修'] === 0 && teacher['专业研究成果'] >= 2) {
    gaps.push({
      title: '研修学习结构偏少',
      text: '研究成果较多但研修记录较少，可补充培训、观摩或证书类成果以平衡结构。',
      evidence: `专业研究成果 ${teacher['专业研究成果']} 条，学习与研修 0 条`,
      source: '规则：research vs training',
    })
  }

  if (strengths.length === 0 && total >= 1) {
    strengths.push({
      title: '成长记录已起步',
      text: '您已开始沉淀个人成果，继续录入将让结构观察更清晰。',
      evidence: `共 ${total} 条录入`,
      source: '规则：fallback 正向',
    })
  }

  return { strengths: strengths.slice(0, 4), gaps: gaps.slice(0, 4) }
}

const STOP_WORDS = new Set(['的', '与', '及', '等', '和', '在', '了', '一个', '进行', '活动', '幼儿园'])

export function buildWordCloud(records: GrowthRecord[]): WordCloudItem[] {
  const freq = new Map<string, number>()
  const addToken = (raw: string, weight: number) => {
    const token = raw.trim()
    if (token.length < 2 || STOP_WORDS.has(token)) return
    freq.set(token, (freq.get(token) || 0) + weight)
  }

  for (const record of records) {
    addToken(record.name, 3)
    addToken(record.subtype, 2)
    addToken(record.org, 1)
    for (const kw of record.keywords || []) {
      addToken(kw, 2)
    }
    const levelBoost = LEVEL_WEIGHT[record.level] || 1
    if (record.representative) {
      addToken(record.name, levelBoost)
    }
  }

  return [...freq.entries()]
    .map(([word, weight]) => ({ word, weight }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 24)
}

export function buildGrowthPaths(records: GrowthRecord[], systemStats: SystemStats = {}): GrowthPath[] {
  const teacher = countByTeacherCategory(records)
  const activityTotal = (systemStats.activityPlans ?? 0) + (systemStats.weeklyPlans ?? 0)
  const researchScore = teacher['专业研究成果'] * 2 + teacher['学习与研修']
  const practiceScore = teacher['获奖与荣誉'] * 2 + activityTotal
  const breadthScore = records.length + (records.filter((r) => r.representative).length > 0 ? 2 : 0)

  const clampPercent = (score: number, max: number) =>
    Math.min(98, Math.max(records.length === 0 ? 8 : 15, Math.round((score / Math.max(max, 1)) * 100)))

  return [
    {
      id: 'path-research',
      label: '园本教研深化',
      description: '侧重论文、课题、研修与园本研究类成果的持续积累',
      matchPercent: clampPercent(researchScore, 12),
      relatedCategories: ['专业研究成果', '学习与研修'],
    },
    {
      id: 'path-practice',
      label: '保教创新实践',
      description: '结合活动方案、周计划与教学比赛、荣誉的实践展示路径',
      matchPercent: clampPercent(practiceScore, 14),
      relatedCategories: ['获奖与荣誉'],
    },
    {
      id: 'path-balanced',
      label: '综合成长',
      description: '多类别均衡录入，形成全面的个人成长结构档案',
      matchPercent: clampPercent(breadthScore, 10),
      relatedCategories: ['专业研究成果', '获奖与荣誉', '学习与研修'],
    },
  ]
}

export function buildDefaultActionSeeds(
  gaps: AnalysisItem[],
  dimensions: ProfileDimension[] = []
): DefaultActionSeed[] {
  const seeds: DefaultActionSeed[] = [
    {
      id: 'action-archive-rep',
      title: '标记 1–3 条代表成果',
      description: '在成果库中为最满意的作品开启「代表成果」，便于画像与年度报告展示。',
      dimensionId: 'contribution',
    },
    {
      id: 'action-training',
      title: '补充一次研修学习记录',
      description: '录入近期培训、观摩或证书，丰富「专业学习与园本研究」结构。',
      dimensionId: 'research',
    },
    {
      id: 'action-weekly',
      title: '完成并保存本周周计划',
      description: '通过周计划生成与保存，沉淀保教活动设计与实施记录（系统统计）。',
      dimensionId: 'activity',
    },
  ]

  for (const gap of gaps.slice(0, 2)) {
    if (gap.title.includes('专业研究成果')) {
      seeds.unshift({
        id: 'action-research-paper',
        title: '录入一项专业研究成果',
        description: gap.text,
        dimensionId: 'research',
      })
    }
    if (gap.title.includes('获奖与荣誉')) {
      seeds.unshift({
        id: 'action-award',
        title: '录入一项获奖与荣誉',
        description: gap.text,
        dimensionId: 'contribution',
      })
    }
  }

  const lowDim = [...dimensions].sort((a, b) => a.count - b.count)[0]
  if (lowDim && lowDim.count === 0) {
    seeds.unshift({
      id: `action-boost-${lowDim.id}`,
      title: `加强「${lowDim.label}」记录`,
      description: lowDim.description,
      dimensionId: lowDim.id,
    })
  }

  const seen = new Set<string>()
  return seeds.filter((s) => {
    if (seen.has(s.id)) return false
    seen.add(s.id)
    return true
  }).slice(0, 6)
}

export function getRepresentativeRecords(records: GrowthRecord[]): GrowthRecord[] {
  const reps = records.filter((r) => r.representative)
  if (reps.length > 0) return reps.slice(0, 5)
  return [...records]
    .sort((a, b) => {
      const wa = LEVEL_WEIGHT[a.level] || 1
      const wb = LEVEL_WEIGHT[b.level] || 1
      return wb - wa
    })
    .slice(0, 3)
}

export function buildProfileSummary(records: GrowthRecord[], systemStats: SystemStats = {}) {
  const dimensions = buildDimensions(records, systemStats)
  const categoryCounts = buildCategoryCounts(records, systemStats)
  const radar = buildRadarValues(records, systemStats)
  const trend = buildYearTrend(records, undefined, systemStats)
  const analysis = buildStrengthsAndGaps(records)
  const wordCloud = buildWordCloud(records)
  const paths = buildGrowthPaths(records, systemStats)
  const actionSeeds = buildDefaultActionSeeds(analysis.gaps, dimensions)
  const representatives = getRepresentativeRecords(records)

  return {
    dimensions,
    categoryCounts,
    radar,
    trend,
    analysis,
    wordCloud,
    paths,
    actionSeeds,
    representatives,
    teacherRecordCount: records.length,
    isEmpty: records.length === 0 && !(systemStats.activityPlans || systemStats.weeklyPlans),
  }
}
