import type { DayPlan, TeachingPlan, WeeklyPlan } from '@/types/weeklyPlan'

/** 导出 / 上传文件名：如「小四班第7周计划.docx」 */
export function weeklyPlanFileName(plan: Pick<WeeklyPlan, 'className' | 'weekNumber'>): string {
  const cls = String(plan.className || '周计划').trim() || '周计划'
  const week = Number(plan.weekNumber) > 0 ? Number(plan.weekNumber) : 1
  return `${cls}第${week}周计划.docx`
}

/** 知识库文档标题（与导出文件名主体一致，无扩展名） */
export function weeklyPlanUploadTitle(plan: Pick<WeeklyPlan, 'className' | 'weekNumber' | 'themeName'>): string {
  const cls = String(plan.className || '').trim()
  const week = Number(plan.weekNumber) > 0 ? Number(plan.weekNumber) : 1
  if (cls) return `${cls}第${week}周计划`
  const theme = String(plan.themeName || '').trim()
  return theme ? `${theme}第${week}周计划` : `第${week}周计划`
}

/** 将周计划序列化为可入库的纯文本（与导出表格字段对应） */
export function serializeWeeklyPlanText(plan: WeeklyPlan): string {
  const lines: string[] = [
    '快乐一周',
    `主题名称：${plan.themeName}    班级：${plan.className}    第${plan.weekNumber}周`,
    '',
    '【周工作重点】',
    plan.weeklyFocus || '（无）',
    '',
    '【每日安排】',
  ]

  for (const day of plan.dailyPlans || []) {
    lines.push(
      '',
      `## ${day.day}`,
      `自主学习：\n${day.collectiveLearning || '（无）'}`,
      `自主游戏：\n${day.regionalGames || '（无）'}`,
      `自主生活：\n${day.dailyLife || '（无）'}`,
      `自主运动：\n${day.outdoorSports || '（无）'}`
    )
  }

  lines.push('', '【实施建议】', plan.suggestions || '（无）')
  return lines.join('\n')
}

const DAY_ORDER = ['周一', '周二', '周三', '周四', '周五'] as const

function emptyDays(): DayPlan[] {
  return DAY_ORDER.map((day) => ({
    day,
    collectiveLearning: '',
    regionalGames: '',
    dailyLife: '',
    outdoorSports: '',
  }))
}

function pickMetaFromTitle(title: string): Partial<WeeklyPlan> {
  const t = title.trim()
  // 小四班第7周计划 / 小班第7周计划
  const m1 = t.match(/^(.+?)第\s*(\d+)\s*周计划$/)
  if (m1) {
    return { className: m1[1].trim(), weekNumber: Number(m1[2]) }
  }
  // 主题·班级·第N周
  const m2 = t.match(/^(.+?)[·•](.+?)[·•]第\s*(\d+)\s*周$/)
  if (m2) {
    return {
      themeName: m2[1].trim(),
      className: m2[2].trim(),
      weekNumber: Number(m2[3]),
    }
  }
  return { themeName: t || '周主题' }
}

function parseMetaLine(text: string): Partial<WeeklyPlan> {
  const theme =
    text.match(/主题名称[：:]\s*(.+?)(?=\s{2,}|班级[：:]|$)/)?.[1]?.trim() ||
    text.match(/主题[：:]\s*(.+?)(?=\s{2,}|班级[：:]|$)/)?.[1]?.trim()
  const className =
    text.match(/班级[：:]\s*(.+?)(?=\s{2,}|第\s*\d+\s*周|$)/)?.[1]?.trim()
  const weekRaw = text.match(/第\s*(\d+)\s*周/)?.[1]
  const out: Partial<WeeklyPlan> = {}
  if (theme) out.themeName = theme
  if (className) out.className = className
  if (weekRaw) out.weekNumber = Number(weekRaw)
  return out
}

/**
 * 从知识库文档（TeachingPlan）解析为可导出的 WeeklyPlan。
 * 兼容本系统入库文本，以及标题「班级第N周计划」格式。
 */
export function parseWeeklyPlanFromDocument(doc: TeachingPlan): WeeklyPlan {
  const raw = [doc.content, doc.objectives].filter(Boolean).join('\n')
  const fromTitle = pickMetaFromTitle(doc.title || '')
  let themeName = fromTitle.themeName || '周主题'
  let className = fromTitle.className || '中班'
  let weekNumber = fromTitle.weekNumber || 1
  let weeklyFocus = ''
  let suggestions = ''
  const dailyPlans = emptyDays()

  const metaLine = raw
    .split(/\n/)
    .map((l) => l.trim())
    .find((l) => /主题/.test(l) && (/班级/.test(l) || /第\s*\d+\s*周/.test(l)))
  if (metaLine) {
    const m = parseMetaLine(metaLine)
    if (m.themeName) themeName = m.themeName
    if (m.className) className = m.className
    if (m.weekNumber) weekNumber = m.weekNumber
  }

  const focusMatch = raw.match(
    /【周工作重点】\s*([\s\S]*?)(?=【每日安排】|【实施建议】|【家长工作建议】|$)/
  )
  if (focusMatch) weeklyFocus = focusMatch[1].trim()

  const suggestMatch = raw.match(/【(?:实施建议|家长工作建议)】\s*([\s\S]*?)$/)
  if (suggestMatch) suggestions = suggestMatch[1].trim()

  const dayBlock = raw.match(/【每日安排】\s*([\s\S]*?)(?=【实施建议】|【家长工作建议】|$)/)
  const daySrc = dayBlock?.[1] || raw
  for (let i = 0; i < DAY_ORDER.length; i++) {
    const day = DAY_ORDER[i]
    const next = DAY_ORDER[i + 1]
    const re = new RegExp(
      `##\\s*${day}\\s*([\\s\\S]*?)(?=##\\s*${next || '实施'}|【实施|【家长|$)`
    )
    const block = daySrc.match(re)?.[1] || ''
    const pick = (labels: string[]) => {
      for (const label of labels) {
        const m = block.match(
          new RegExp(`${label}[：:]\\s*([\\s\\S]*?)(?=(?:自主学习|自主游戏|自主生活|自主运动|集体学习|区域游戏|日常生活|户外运动)[：:]|$)`)
        )
        if (m?.[1]) return m[1].trim()
      }
      return ''
    }
    dailyPlans[i] = {
      day,
      collectiveLearning: pick(['自主学习', '集体学习']),
      regionalGames: pick(['自主游戏', '区域游戏']),
      dailyLife: pick(['自主生活', '日常生活']),
      outdoorSports: pick(['自主运动', '户外运动']),
    }
  }

  // 若结构化解析几乎为空，把全文塞进周工作重点，保证仍可导出
  const hasDayContent = dailyPlans.some(
    (d) => d.collectiveLearning || d.regionalGames || d.dailyLife || d.outdoorSports
  )
  if (!weeklyFocus && !hasDayContent && raw.trim()) {
    weeklyFocus = raw.trim().slice(0, 4000)
  }

  return {
    id: doc.id || `kb_${Date.now()}`,
    themeName,
    className,
    weekNumber,
    weeklyFocus: weeklyFocus || doc.objectives || '',
    dailyPlans,
    suggestions: suggestions || '',
    createdAt: new Date().toISOString(),
    status: 'draft',
  }
}
