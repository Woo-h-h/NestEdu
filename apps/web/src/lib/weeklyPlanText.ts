import type { WeeklyPlan } from '@/types/weeklyPlan'

/** 将周计划序列化为可入库的纯文本 */
export function serializeWeeklyPlanText(plan: WeeklyPlan): string {
  const lines: string[] = [
    `主题：${plan.themeName}`,
    `班级：${plan.className}`,
    `周次：第 ${plan.weekNumber} 周`,
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
      `集体学习：\n${day.collectiveLearning || '（无）'}`,
      `区域游戏：\n${day.regionalGames || '（无）'}`,
      `日常生活：\n${day.dailyLife || '（无）'}`,
      `户外运动：\n${day.outdoorSports || '（无）'}`
    )
  }

  lines.push('', '【家长工作建议】', plan.suggestions || '（无）')
  return lines.join('\n')
}

export function weeklyPlanUploadTitle(plan: WeeklyPlan): string {
  return `${plan.themeName}·${plan.className}·第${plan.weekNumber}周`
}
