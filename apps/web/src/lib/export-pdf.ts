import type { WeeklyPlan } from '@/types/weeklyPlan'

export async function exportToPdf(plan: WeeklyPlan): Promise<void> {
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${plan.className}第${plan.weekNumber}周计划</title>
  <style>
    @page { size: A4 landscape; margin: 15mm; }
    body { font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif; font-size: 12px; color: #333; }
    h1 { text-align: center; font-size: 20px; margin-bottom: 8px; }
    .info { text-align: center; font-size: 14px; margin-bottom: 16px; color: #666; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #000; padding: 6px 8px; vertical-align: top; text-align: left; font-size: 11px; line-height: 1.5; white-space: pre-line; word-break: break-all; }
    th { background-color: #f0f0f0; text-align: center; font-weight: bold; }
    .label-cell { text-align: center; font-weight: bold; background-color: #f0f0f0; width: 60px; white-space: pre-line; }
    .day-cell { text-align: center; font-weight: bold; width: 50px; }
    .header-cell { text-align: center; font-weight: bold; background-color: #f0f0f0; }
  </style>
</head>
<body>
  <h1>快乐一周</h1>
  <div class="info">
    主题名称：${escapeHtml(plan.themeName)} &nbsp;&nbsp;&nbsp;&nbsp;
    班级：${escapeHtml(plan.className)} &nbsp;&nbsp;&nbsp;&nbsp;
    第${plan.weekNumber}周
  </div>
  <table>
    <tr>
      <td class="label-cell">周工作<br>重点</td>
      <td colspan="4">${escapeHtml(plan.weeklyFocus)}</td>
    </tr>
    <tr>
      <td class="header-cell">日期</td>
      <td class="header-cell">自主学习</td>
      <td class="header-cell">自主游戏</td>
      <td class="header-cell">自主生活</td>
      <td class="header-cell">自主运动</td>
    </tr>
    ${plan.dailyPlans
      .map(
        (dp) => `
    <tr>
      <td class="day-cell">${dp.day}</td>
      <td>${escapeHtml(dp.collectiveLearning)}</td>
      <td>${escapeHtml(dp.regionalGames)}</td>
      <td>${escapeHtml(dp.dailyLife)}</td>
      <td>${escapeHtml(dp.outdoorSports)}</td>
    </tr>`
      )
      .join('')}
    <tr>
      <td class="label-cell">实施<br>建议</td>
      <td colspan="4">${escapeHtml(plan.suggestions)}</td>
    </tr>
  </table>
</body>
</html>`

  const printWindow = window.open('', '_blank', 'width=1200,height=800')
  if (!printWindow) {
    throw new Error('浏览器阻止了弹窗，请允许此网站打开弹窗')
  }
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()

  await new Promise((resolve) => setTimeout(resolve, 500))
  printWindow.print()
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
