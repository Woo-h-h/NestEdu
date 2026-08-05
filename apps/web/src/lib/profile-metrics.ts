import type { GrowthCategory, GrowthRecord } from '@/types/growth'

/** 与成果库首页前三栏对齐的系统统计 */
export interface SystemStats {
  activityPlans?: number
  weeklyPlans?: number
  /** 平台「教师成果库」本人手机号文件夹文档数 */
  archivePlans?: number
}

export interface CategoryCountItem {
  key: string
  label: string
  count: number
  source: 'system' | 'teacher' | 'platform'
}

export interface ProfileDimension {
  id: DimensionId
  label: string
  count: number
  description: string
  sources: string[]
}

/** 成长结构三维度：对齐成果库「活动方案 / 周计划 / 教师成果库」 */
export type DimensionId = 'activity' | 'weekly' | 'archive'

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
  relatedDimensions: DimensionId[]
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

export const DIMENSION_LABELS: Record<DimensionId, string> = {
  activity: '活动方案',
  weekly: '周计划',
  archive: '教师成果库',
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
    if (record.id.startsWith('kb_') || record.extra?.source === 'knowledge') continue
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
  _records: GrowthRecord[],
  systemStats: SystemStats = {}
): CategoryCountItem[] {
  return [
    {
      key: 'activityPlans',
      label: DIMENSION_LABELS.activity,
      count: systemStats.activityPlans ?? 0,
      source: 'system',
    },
    {
      key: 'weeklyPlans',
      label: DIMENSION_LABELS.weekly,
      count: systemStats.weeklyPlans ?? 0,
      source: 'system',
    },
    {
      key: 'archivePlans',
      label: DIMENSION_LABELS.archive,
      count: systemStats.archivePlans ?? 0,
      source: 'platform',
    },
  ]
}

export function buildDimensions(
  _records: GrowthRecord[],
  systemStats: SystemStats = {}
): ProfileDimension[] {
  const activityPlans = systemStats.activityPlans ?? 0
  const weeklyPlans = systemStats.weeklyPlans ?? 0
  const archivePlans = systemStats.archivePlans ?? 0

  return [
    {
      id: 'activity',
      label: DIMENSION_LABELS.activity,
      count: activityPlans,
      description: '本人入库的活动方案（与成果库「活动方案」栏一致，MySQL 映射）',
      sources: ['本人入库 · MySQL：活动方案'],
    },
    {
      id: 'weekly',
      label: DIMENSION_LABELS.weekly,
      count: weeklyPlans,
      description: '本人入库的周计划（与成果库「周计划」栏一致，MySQL 映射）',
      sources: ['本人入库 · MySQL：周计划'],
    },
    {
      id: 'archive',
      label: DIMENSION_LABELS.archive,
      count: archivePlans,
      description: '平台知识库「教师成果库」下本人手机号文件夹中的文档',
      sources: ['平台知识库文件夹：教师成果库'],
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
  _records: GrowthRecord[],
  years: number[] = [2024, 2025, 2026],
  systemStats: SystemStats = {}
): YearTrendSeries[] {
  const dimensions = buildDimensions([], systemStats)
  const currentYear = new Date().getFullYear()

  return dimensions.map((dim) => {
    const points = years.map((year) => ({
      year,
      // 系统/平台计数暂无按年拆分，记入当前年
      count: year === currentYear ? dim.count : 0,
    }))
    return { dimensionId: dim.id, label: dim.label, points }
  })
}

/**
 * 优劣势规则：只围绕三维度（活动方案 / 周计划 / 教师成果库）。
 * 不做排名或绩效分，仅作个人成长结构观察。
 */
export function buildStrengthsAndGaps(
  records: GrowthRecord[],
  systemStats: SystemStats = {}
): StrengthGapResult {
  const strengths: AnalysisItem[] = []
  const gaps: AnalysisItem[] = []
  const dimensions = buildDimensions(records, systemStats)
  const total = dimensions.reduce((sum, d) => sum + d.count, 0)
  const maxCount = Math.max(...dimensions.map((d) => d.count), 0)
  const filled = dimensions.filter((d) => d.count > 0).length
  const teacher = countByTeacherCategory(records)
  const teacherTotal = Object.values(teacher).reduce((a, b) => a + b, 0)
  const kbRecords = records.filter((r) => r.id.startsWith('kb_') || r.extra?.source === 'knowledge')

  if (total === 0) {
    gaps.push({
      title: '三维度尚无记录',
      text: '建议先在「活动方案」「周计划」入库，或在「教师成果库」个人文件夹沉淀文档，画像将据此形成结构观察。',
      evidence: '活动方案 0 · 周计划 0 · 教师成果库 0',
      source: '规则：三维度全空',
    })
    return { strengths, gaps }
  }

  for (const dim of dimensions) {
    if (dim.count > 0 && dim.count === maxCount && maxCount >= 1) {
      strengths.push({
        title: `「${dim.label}」结构相对充实`,
        text: `当前「${dim.label}」有 ${dim.count} 条记录，在三维度中积累较多，可作为个人成长展示重点。`,
        evidence: `${dim.label} ${dim.count} 条`,
        source: '规则：维度最高且≥1',
      })
    }
    if (dim.count === 0) {
      gaps.push({
        title: `「${dim.label}」待补充`,
        text:
          dim.id === 'activity'
            ? '尚未有入库的活动方案。可到「活动方案」页生成并选择上传到平台知识库 + MySQL。'
            : dim.id === 'weekly'
              ? '尚未有入库的周计划。可到「周计划」页生成并入库，与成果库周计划栏对齐。'
              : '教师成果库本人文件夹暂无文档。可在成果库平台分区上传，或整理已有文件到手机号同名夹。',
        evidence: `${dim.label} 0 条`,
        source: '规则：维度缺失',
      })
    }
  }

  if (filled === 3) {
    strengths.push({
      title: '三维度均已起步',
      text: '活动方案、周计划、教师成果库均有记录，成长结构较完整，适合持续完善智能画像。',
      evidence: dimensions.map((d) => `${d.label} ${d.count}`).join(' · '),
      source: '规则：三维度齐全',
    })
  } else if (filled === 2) {
    strengths.push({
      title: '双维度已有积累',
      text: '已有两个维度有记录，继续补齐空白维度可使画像更立体。',
      evidence: dimensions
        .filter((d) => d.count > 0)
        .map((d) => `${d.label} ${d.count}`)
        .join(' · '),
      source: '规则：两维度有值',
    })
  }

  const activity = systemStats.activityPlans ?? 0
  const weekly = systemStats.weeklyPlans ?? 0
  if (activity >= 1 && weekly === 0) {
    gaps.push({
      title: '周计划可与活动方案联动',
      text: '已有活动方案入库，可将主题带入周计划生成，形成「单次活动 → 一周统筹」闭环。',
      evidence: `活动方案 ${activity} · 周计划 ${weekly}`,
      source: '规则：有教案无周计划',
    })
  }
  if (weekly >= 1 && activity === 0) {
    gaps.push({
      title: '活动方案可从周计划展开',
      text: '已有周计划入库，可从周看板点击活动跳转生成详细活动方案并入库。',
      evidence: `周计划 ${weekly} · 活动方案 ${activity}`,
      source: '规则：有周计划无教案',
    })
  }

  if (kbRecords.length >= 2) {
    strengths.push({
      title: '教师成果库文档可展示',
      text: `本人文件夹中已有 ${kbRecords.length} 份平台文档，可作为代表成果与智能画像材料。`,
      evidence: `成果库文档 ${kbRecords.length} 份`,
      source: '规则：成果库≥2',
    })
  }

  if (teacherTotal >= 1) {
    strengths.push({
      title: '教师补充录入已起步',
      text: `另有 ${teacherTotal} 条教师录入成长记录，可与三维度统计一并用于智能画像。`,
      evidence: `教师录入 ${teacherTotal} 条`,
      source: '规则：有本地录入',
    })
  }

  if (strengths.length === 0 && total >= 1) {
    strengths.push({
      title: '成长结构已起步',
      text: '您已开始在三维度中沉淀记录，继续入库将让结构观察更清晰。',
      evidence: dimensions.map((d) => `${d.label} ${d.count}`).join(' · '),
      source: '规则：fallback 正向',
    })
  }

  // 去重（按 title）
  const uniq = (items: AnalysisItem[]) => {
    const seen = new Set<string>()
    return items.filter((item) => {
      if (seen.has(item.title)) return false
      seen.add(item.title)
      return true
    })
  }

  return {
    strengths: uniq(strengths).slice(0, 4),
    gaps: uniq(gaps).slice(0, 4),
  }
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

  // 用维度标签增强词云可读性（有数据时）
  return [...freq.entries()]
    .map(([word, weight]) => ({ word, weight }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 24)
}

export function buildGrowthPaths(
  _records: GrowthRecord[],
  systemStats: SystemStats = {}
): GrowthPath[] {
  const activity = systemStats.activityPlans ?? 0
  const weekly = systemStats.weeklyPlans ?? 0
  const archive = systemStats.archivePlans ?? 0
  const total = activity + weekly + archive

  const clampPercent = (score: number, max: number) =>
    Math.min(98, Math.max(total === 0 ? 8 : 15, Math.round((score / Math.max(max, 1)) * 100)))

  return [
    {
      id: 'path-activity',
      label: '活动方案沉淀',
      description: '持续生成并入库活动方案，丰富单次保教设计结构',
      matchPercent: clampPercent(activity * 3 + (weekly > 0 ? 2 : 0), 12),
      relatedDimensions: ['activity'],
    },
    {
      id: 'path-weekly',
      label: '周计划统筹',
      description: '通过周计划生成与保存，形成一周保教统筹记录',
      matchPercent: clampPercent(weekly * 3 + (activity > 0 ? 2 : 0), 12),
      relatedDimensions: ['weekly'],
    },
    {
      id: 'path-archive',
      label: '成果库积累',
      description: '在教师成果库沉淀平台文档，支撑智能画像解读',
      matchPercent: clampPercent(archive * 3 + activity + weekly, 14),
      relatedDimensions: ['archive'],
    },
  ]
}

export function buildDefaultActionSeeds(
  gaps: AnalysisItem[],
  dimensions: ProfileDimension[] = []
): DefaultActionSeed[] {
  const byId = new Map(dimensions.map((d) => [d.id, d]))

  const seeds: DefaultActionSeed[] = []

  // 优先补齐为 0 的维度
  for (const dim of [...dimensions].sort((a, b) => a.count - b.count)) {
    if (dim.count > 0) continue
    if (dim.id === 'activity') {
      seeds.push({
        id: 'action-boost-activity',
        title: '生成并入库一份活动方案',
        description: '在「活动方案」页生成后选择「上传到平台知识库 + MySQL」，计入成长结构。',
        dimensionId: 'activity',
      })
    } else if (dim.id === 'weekly') {
      seeds.push({
        id: 'action-boost-weekly',
        title: '完成并保存本周周计划',
        description: '在「周计划」页生成并入库，与成果库「周计划」栏对齐。',
        dimensionId: 'weekly',
      })
    } else {
      seeds.push({
        id: 'action-boost-archive',
        title: '整理教师成果库文档',
        description: '确认平台「教师成果库」本人手机号文件夹有可读文档。',
        dimensionId: 'archive',
      })
    }
  }

  // 已有维度的巩固建议
  if ((byId.get('activity')?.count ?? 0) > 0) {
    seeds.push({
      id: 'action-activity-more',
      title: '再沉淀 1 份活动方案',
      description: '选择近期主题生成并入库，保持活动方案维度的持续积累。',
      dimensionId: 'activity',
    })
  }
  if ((byId.get('weekly')?.count ?? 0) > 0) {
    seeds.push({
      id: 'action-weekly-more',
      title: '完成本周周计划入库',
      description: '保持周计划节奏，便于与活动方案形成闭环。',
      dimensionId: 'weekly',
    })
  }
  if ((byId.get('archive')?.count ?? 0) > 0) {
    seeds.push({
      id: 'action-archive-review',
      title: '回顾教师成果库代表文档',
      description: '从本人文件夹中挑选可读文档，作为智能画像材料。',
      dimensionId: 'archive',
    })
  }

  for (const gap of gaps.slice(0, 2)) {
    if (gap.title.includes('周计划') && gap.title.includes('活动方案')) {
      seeds.unshift({
        id: 'action-link-activity-weekly',
        title: '打通活动方案与周计划',
        description: gap.text,
        dimensionId: 'weekly',
      })
    }
  }

  const seen = new Set<string>()
  return seeds
    .filter((s) => {
      if (seen.has(s.id)) return false
      seen.add(s.id)
      return true
    })
    .slice(0, 6)
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
  const analysis = buildStrengthsAndGaps(records, systemStats)
  const wordCloud = buildWordCloud(records)
  const paths = buildGrowthPaths(records, systemStats)
  const actionSeeds = buildDefaultActionSeeds(analysis.gaps, dimensions)
  const representatives = getRepresentativeRecords(records)
  const structureTotal = dimensions.reduce((sum, d) => sum + d.count, 0)

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
    teacherRecordCount: records.filter((r) => !r.id.startsWith('kb_')).length,
    structureTotal,
    isEmpty: structureTotal === 0,
  }
}
