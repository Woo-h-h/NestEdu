import { useNavigate } from 'react-router-dom'
import type { WeeklyPlan } from '@/types/weeklyPlan'
import { inferFocusDomain } from '@/lib/inferFocusDomain'
import { Sparkles } from 'lucide-react'

interface Props {
  plan: WeeklyPlan
}

const ROW_LABELS: { key: keyof WeeklyPlan['dailyPlans'][0]; label: string }[] = [
  { key: 'collectiveLearning', label: '集体教学' },
  { key: 'regionalGames', label: '区域游戏' },
  { key: 'dailyLife', label: '日常生活' },
  { key: 'outdoorSports', label: '户外运动' },
]

export default function WeekBoard({ plan }: Props) {
  const navigate = useNavigate()

  const jumpToActivity = (topic: string) => {
    const text = topic.trim()
    if (!text) return
    const domain = inferFocusDomain(text)
    navigate(`/activity?topic=${encodeURIComponent(text)}&domain=${encodeURIComponent(domain)}`)
  }

  return (
    <div className="mb-5 overflow-hidden rounded-2xl border border-nest-leaf/15 bg-white shadow-sm shadow-nest-leaf/5">
      <div className="border-b border-nest-leaf/10 bg-nest-mist/40 px-4 py-3">
        <h3 className="font-display text-base font-semibold text-nest-ink">周看板</h3>
        <p className="mt-0.5 text-xs text-nest-muted">
          第 {plan.weekNumber} 周 · {plan.themeName} · 点击集体教学可跳转生成详细活动方案
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr>
              <th className="w-24 border border-nest-leaf/10 bg-nest-mist/50 px-2 py-2 text-xs font-semibold text-nest-pine" />
              {plan.dailyPlans.map((day) => (
                <th
                  key={day.day}
                  className="border border-nest-leaf/10 bg-nest-mist/50 px-2 py-2 text-center text-xs font-semibold text-nest-pine"
                >
                  {day.day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROW_LABELS.map(({ key, label }) => (
              <tr key={key}>
                <td className="border border-nest-leaf/10 bg-nest-mist/30 px-2 py-2 text-center text-xs font-semibold text-nest-pine">
                  {label}
                </td>
                {plan.dailyPlans.map((day) => {
                  const value = day[key]
                  const isCollective = key === 'collectiveLearning'
                  return (
                    <td
                      key={`${day.day}-${key}`}
                      className="border border-nest-leaf/10 px-2 py-2 align-top text-xs text-nest-ink"
                    >
                      {value ? (
                        <div className="space-y-2">
                          <p className="whitespace-pre-wrap leading-relaxed">{value}</p>
                          {isCollective && (
                            <button
                              type="button"
                              onClick={() => jumpToActivity(value.split('\n')[0] || value)}
                              className="inline-flex items-center gap-1 rounded-lg border border-nest-leaf/20 bg-nest-mist/50 px-2 py-1 text-[11px] font-medium text-nest-pine transition-colors hover:border-nest-leaf/40 hover:bg-nest-mist"
                            >
                              <Sparkles size={12} />
                              生成详细方案
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-nest-muted/50">—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
