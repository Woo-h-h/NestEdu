import type { ArchiveAchievement } from '@/api/archiveAchievements'
import { resolveDailyDocYear, type TeacherGeneratedDoc } from '@/api/teacherGeneratedDocs'
import {
  ARCHIVE_TREE_CATEGORY_LABELS,
  extractArchiveTreeMetaFromMarkdown,
  normalizeArchiveTreeCategory,
  resolveArchivePlanCategory,
} from '@/lib/archiveTreeCategory'
import type { GrowthRecord } from '@/types/growth'
import type { TeachingPlan } from '@/types/weeklyPlan'

export type GrowthTreeBranch = 'daily' | 'practice' | 'research' | 'honor'

export interface GrowthTreeKindRow {
  kind: string
  count: number
  unit: string
}

export interface GrowthTreeArtifact {
  id: string
  year: number
  branch: GrowthTreeBranch
  kind: string
  title: string
  dateLabel: string
  shortDate: string
  level: string
  source: string
  desc: string
  preview: string
  fileHint: string
  origin:
    | { type: 'generated'; doc: TeacherGeneratedDoc }
    | { type: 'knowledge'; plan: TeachingPlan }
    | { type: 'growth'; record: GrowthRecord }
    | { type: 'archive'; achievement: ArchiveAchievement; plan?: TeachingPlan }
}

export interface GrowthTreeBranchMeta {
  key: GrowthTreeBranch
  name: string
  short: string
  eyebrow: string
  symbol: string
  color: string
  soft: string
  summary: string
  note: string
  shape: string
}

/** 叶片仍为叶绿；三类果实用绿 / 橙 / 红区分，不做排名或绩效分。 */
export const GROWTH_TREE_BRANCHES: Record<GrowthTreeBranch, GrowthTreeBranchMeta> = {
  daily: {
    key: 'daily',
    name: '周计划与活动方案',
    short: '日常教学',
    eyebrow: '绿色叶片',
    symbol: '叶',
    color: '#2f6f5e',
    soft: '#e8f2ee',
    summary: '每一份周计划和活动方案，都对应树冠上的一片绿色叶子。数据来自本人系统入库记录。',
    note: '叶片疏密呈现日常教学产出的积累，不代表考核等级。',
    shape: '1 片绿色叶子',
  },
  practice: {
    key: 'practice',
    name: '特色实践枝',
    short: '特色实践',
    eyebrow: '绿色果实',
    symbol: '实',
    color: '#2f9e5a',
    soft: '#e6f6ec',
    summary: '主题实践、环境与家园类成果，凝结为树上的绿色实践果实。',
    note: '实践果实来自教师成果库文档（按标题归类），不是虚构数据。',
    shape: '1 颗绿色果实',
  },
  research: {
    key: 'research',
    name: '教研科研枝',
    short: '教研科研',
    eyebrow: '橙色果实',
    symbol: '研',
    color: '#e07a2f',
    soft: '#fff1e4',
    summary: '公开课、论文、课题与个案等，凝结为橙色教研果实。',
    note: '教研枝记录专业反思与研究沉淀，不做排名或绩效分。',
    shape: '1 颗橙色果实',
  },
  honor: {
    key: 'honor',
    name: '专业荣誉枝',
    short: '专业荣誉',
    eyebrow: '红色果实',
    symbol: '光',
    color: '#d64545',
    soft: '#fdecea',
    summary: '研修、获奖与荣誉表彰，凝结为树冠顶部的红色荣誉果实。',
    note: '颜色仅作类型区分，不用于积分、等级或教师之间比较。',
    shape: '1 颗红色果实',
  },
}

export const GROWTH_TREE_BRANCH_KEYS: GrowthTreeBranch[] = [
  'daily',
  'practice',
  'research',
  'honor',
]

export const GROWTH_TREE_MAX_LEAVES = 48
export const GROWTH_TREE_MAX_FRUIT = 24

const CURRENT_YEAR = new Date().getFullYear()

export function extractArtifactYear(...parts: string[]): number | undefined {
  for (const part of parts) {
    const match = part.match(/(20\d{2}|19\d{2})/)
    if (match) {
      const year = Number(match[1])
      if (year >= 1990 && year <= CURRENT_YEAR + 1) return year
    }
  }
  return undefined
}

export function parseArtifactYear(...parts: string[]): number {
  return extractArtifactYear(...parts) ?? CURRENT_YEAR
}

export function yearFromIso(iso?: string): number {
  if (!iso) return CURRENT_YEAR
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return CURRENT_YEAR
  return d.getFullYear()
}

export function formatArtifactDate(isoOrDate: string): { dateLabel: string; shortDate: string } {
  const trimmed = isoOrDate.trim()
  const d = new Date(trimmed)
  if (!Number.isNaN(d.getTime()) && trimmed.length >= 8) {
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const day = d.getDate()
    return { dateLabel: `${y} 年 ${m} 月 ${day} 日`, shortDate: `${m} 月 ${day} 日` }
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const [y, m, day] = trimmed.slice(0, 10).split('-')
    return {
      dateLabel: `${y} 年 ${Number(m)} 月 ${Number(day)} 日`,
      shortDate: `${Number(m)} 月 ${Number(day)} 日`,
    }
  }
  if (trimmed) return { dateLabel: trimmed, shortDate: trimmed }
  return { dateLabel: '日期未记录', shortDate: '—' }
}

export function classifyArchiveText(title: string, extra = ''): Exclude<GrowthTreeBranch, 'daily'> {
  return normalizeArchiveTreeCategory(`${title}\n${extra}`)
}

export function classifyGrowthRecord(record: GrowthRecord): Exclude<GrowthTreeBranch, 'daily'> {
  if (record.category === '专业研究成果') return 'research'
  if (record.category === '获奖与荣誉' || record.category === '学习与研修') return 'honor'
  return classifyArchiveText(record.name, `${record.subtype} ${record.intro}`)
}

function clip(text: string, max = 180): string {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  return cleaned.length <= max ? cleaned : `${cleaned.slice(0, max)}…`
}

export function artifactFromGeneratedDoc(doc: TeacherGeneratedDoc): GrowthTreeArtifact {
  const year = resolveDailyDocYear(doc)
  const kind = doc.docType === 'weekly' ? '周计划' : '活动方案'
  const dates = formatArtifactDate(doc.createdAt || '')
  return {
    id: `gen:${doc.id}`,
    year,
    branch: 'daily',
    kind,
    title: doc.title || kind,
    dateLabel: dates.dateLabel,
    shortDate: dates.shortDate,
    level: '系统日常产出',
    source: '系统生成并归档',
    desc: '记录日常课程规划与活动设计，是专业成长树中持续生长的绿色叶片。',
    preview: clip(doc.content || '') || '打开详情可查看方案正文。',
    fileHint: doc.knowledgeDocId || doc.title,
    origin: { type: 'generated', doc },
  }
}

export function artifactFromKnowledgePlan(plan: TeachingPlan): GrowthTreeArtifact {
  const fromDoc = extractArchiveTreeMetaFromMarkdown(
    `${plan.objectives || ''}\n${plan.content || ''}`
  )
  const branch = resolveArchivePlanCategory(plan)
  const year =
    extractArtifactYear(plan.title) ||
    fromDoc.year ||
    (plan.year && plan.year > 0 ? plan.year : undefined) ||
    extractArtifactYear(plan.objectives || '', plan.content || '') ||
    CURRENT_YEAR
  const kind = ARCHIVE_TREE_CATEGORY_LABELS[branch]
  return {
    id: `kb:${plan.id}`,
    year,
    branch,
    kind: plan.domain && plan.domain !== '综合' ? plan.domain : kind,
    title: plan.title || '未命名成果',
    dateLabel: `${year} 年`,
    shortDate: String(year),
    level: '教师成果库文档',
    source: '平台知识库 · 个人文件夹',
    desc: GROWTH_TREE_BRANCHES[branch].summary,
    preview: clip(plan.objectives || plan.content || '') || '打开详情可查看解析正文。',
    fileHint: plan.title,
    origin: { type: 'knowledge', plan },
  }
}

export function artifactFromArchiveAchievement(
  row: ArchiveAchievement,
  plan?: TeachingPlan
): GrowthTreeArtifact {
  const branch = normalizeArchiveTreeCategory(row.treeCategory)
  const year =
    extractArtifactYear(row.title, plan?.title || '') ||
    (row.year > 0 ? row.year : undefined) ||
    yearFromIso(row.createdAt)
  const dates = formatArtifactDate(row.createdAt || '')
  return {
    id: `aa:${row.knowledgeDocId}`,
    year,
    branch,
    kind: row.materialType || ARCHIVE_TREE_CATEGORY_LABELS[branch],
    title: row.title,
    dateLabel: row.year > 0 ? `${row.year} 年` : dates.dateLabel,
    shortDate: row.year > 0 ? String(row.year) : dates.shortDate,
    level: ARCHIVE_TREE_CATEGORY_LABELS[branch],
    source: row.needsHumanReview ? '教师成果库（分类待核对）' : '教师成果库 · 已分类入库',
    desc: GROWTH_TREE_BRANCHES[branch].summary,
    preview: clip(row.summary || plan?.objectives || plan?.content || '') || '打开详情可查看解析正文。',
    fileHint: row.title,
    origin: { type: 'archive', achievement: row, plan },
  }
}

export function artifactFromGrowthRecord(record: GrowthRecord): GrowthTreeArtifact {
  const branch = classifyGrowthRecord(record)
  const dates = formatArtifactDate(record.date || record.createdAt)
  return {
    id: `gr:${record.id}`,
    year: record.year || parseArtifactYear(record.date, record.createdAt),
    branch,
    kind: record.subtype || record.category,
    title: record.name,
    dateLabel: dates.dateLabel,
    shortDate: dates.shortDate,
    level: record.level || record.category,
    source: '教师录入',
    desc: clip(record.intro) || GROWTH_TREE_BRANCHES[branch].summary,
    preview: clip(record.intro) || '打开详情可查看录入信息。',
    fileHint: record.files[0]?.name || record.name,
    origin: { type: 'growth', record },
  }
}

export function buildGrowthTreeArtifacts(input: {
  generatedDocs: TeacherGeneratedDoc[]
  archivePlans: TeachingPlan[]
  archiveAchievements?: ArchiveAchievement[]
  localRecords: GrowthRecord[]
}): GrowthTreeArtifact[] {
  const achievements = input.archiveAchievements || []
  const planById = new Map(input.archivePlans.map((plan) => [plan.id, plan]))
  const classifiedIds = new Set(achievements.map((row) => row.knowledgeDocId))
  const leftoverPlans = input.archivePlans.filter((plan) => !classifiedIds.has(plan.id))
  return [
    ...input.generatedDocs.map(artifactFromGeneratedDoc),
    ...achievements.map((row) => artifactFromArchiveAchievement(row, planById.get(row.knowledgeDocId))),
    ...leftoverPlans.map(artifactFromKnowledgePlan),
    ...input.localRecords
      .filter((item) => !item.id.startsWith('kb_'))
      .map(artifactFromGrowthRecord),
  ]
}

export function groupKindRows(items: GrowthTreeArtifact[]): GrowthTreeKindRow[] {
  const map = new Map<string, number>()
  for (const item of items) {
    map.set(item.kind, (map.get(item.kind) || 0) + 1)
  }
  const unitFor = (kind: string) => {
    if (kind.includes('周计划') || kind.includes('活动方案')) return '份'
    if (kind.includes('课')) return '次'
    if (kind.includes('论文') || kind.includes('个案') || kind.includes('案例')) return '篇'
    return '项'
  }
  return [...map.entries()].map(([kind, count]) => ({
    kind,
    count,
    unit: unitFor(kind),
  }))
}

export function collectYears(artifacts: GrowthTreeArtifact[]): number[] {
  const set = new Set<number>([CURRENT_YEAR])
  for (const item of artifacts) set.add(item.year)
  return [...set].sort((a, b) => a - b)
}

export function deriveGrowthTags(artifacts: GrowthTreeArtifact[]): string[] {
  const tags: string[] = []
  const by = (b: GrowthTreeBranch) => artifacts.some((x) => x.branch === b)
  if (artifacts.some((x) => x.kind === '周计划')) tags.push('周计划持续沉淀')
  if (artifacts.some((x) => x.kind === '活动方案')) tags.push('活动方案有积累')
  if (by('practice')) tags.push('实践成果已归档')
  if (by('research')) tags.push('教研科研有记录')
  if (by('honor')) tags.push('研修荣誉有记录')
  if (tags.length === 0) tags.push('成果正在自然积累')
  return tags.slice(0, 4)
}

export interface TreeSlot {
  x: number
  y: number
  rot: number
}

export function growthTreePositions(
  count: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seed: number
): TreeSlot[] {
  const n = Math.max(count, 0)
  return Array.from({ length: n }, (_, i) => {
    const a = (i + seed) * 2.399963
    const r = Math.sqrt((i + 0.65) / Math.max(n, 1))
    return {
      x: cx + Math.cos(a) * rx * r,
      y: cy + Math.sin(a) * ry * r,
      rot: ((i * 47 + seed * 19) % 70) - 35,
    }
  })
}

export function visibleTreeItems(
  items: GrowthTreeArtifact[],
  branch: GrowthTreeBranch
): GrowthTreeArtifact[] {
  const max = branch === 'daily' ? GROWTH_TREE_MAX_LEAVES : GROWTH_TREE_MAX_FRUIT
  return items.slice(0, max)
}

/** 所选年份的叶片与果实，供画像统计与树视图使用。 */
export function artifactsForStructureView(
  artifacts: GrowthTreeArtifact[],
  year: number
): GrowthTreeArtifact[] {
  return artifacts.filter((item) => item.year === year)
}
