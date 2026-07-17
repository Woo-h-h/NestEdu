import { useState } from 'react'
import type { WeeklyPlan, DayPlan, ChatMessage } from '@/types/weeklyPlan'
import AiChatPanel from './AiChatPanel'
import ExportToolbar from './ExportToolbar'
import { MessageSquare, X, CloudUpload } from 'lucide-react'

interface Props {
  plan: WeeklyPlan
  chatHistory: ChatMessage[]
  isAiModifying: boolean
  isUploading?: boolean
  onPlanUpdate: (p: WeeklyPlan) => void
  onUploadToKnowledge: () => void
  onSendInstruction: (instruction: string) => Promise<void>
}

export default function PlanEditor({
  plan,
  chatHistory,
  isAiModifying,
  isUploading = false,
  onPlanUpdate,
  onUploadToKnowledge,
  onSendInstruction,
}: Props) {
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [chatOpen, setChatOpen] = useState(false)

  const startEdit = (key: string) => {
    setEditing(key)
    const parts = key.split('.')
    if (parts[0] === 'focus') setEditValue(plan.weeklyFocus)
    else if (parts[0] === 'suggestions') setEditValue(plan.suggestions)
    else {
      const dp = plan.dailyPlans[Number(parts[1])]
      if (dp) setEditValue((dp as Record<string, string>)[parts[2]] || '')
    }
  }

  const confirmEdit = () => {
    if (!editing) return
    const newPlan = JSON.parse(JSON.stringify(plan)) as WeeklyPlan
    const parts = editing.split('.')
    if (parts[0] === 'focus') newPlan.weeklyFocus = editValue
    else if (parts[0] === 'suggestions') newPlan.suggestions = editValue
    else {
      const dp = newPlan.dailyPlans[Number(parts[1])]
      if (dp) (dp as Record<string, string>)[parts[2]] = editValue
    }
    setEditing(null)
    onPlanUpdate(newPlan)
  }

  const headerClass =
    'border border-nest-leaf/15 bg-nest-mist/60 px-3 py-2 text-xs font-semibold text-nest-pine'
  const cellClass = 'border border-nest-leaf/15 px-3 py-2 text-xs align-top text-nest-ink'
  const editableClass = 'cursor-pointer transition-colors hover:bg-nest-mist/50'
  const mergeLabelClass =
    'w-20 whitespace-pre-line border border-nest-leaf/15 bg-nest-mist/60 px-3 py-2 text-center text-xs font-semibold text-nest-pine'

  const dayFields: (keyof DayPlan)[] = [
    'collectiveLearning',
    'regionalGames',
    'dailyLife',
    'outdoorSports',
  ]

  return (
    <div className="surface-panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-nest-leaf/10 bg-nest-mist/30 px-5 py-4">
        <div className="flex items-center gap-2 font-medium text-nest-ink">
          <span className="font-display">周计划预览 & 编辑</span>
          <span className="rounded-full bg-nest-mist px-2 py-0.5 text-xs text-nest-leaf">已生成</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-700 transition-colors hover:bg-amber-100"
          >
            <MessageSquare size={14} /> AI 修改
          </button>
          <ExportToolbar plan={plan} />
          <button
            type="button"
            onClick={onUploadToKnowledge}
            disabled={isUploading}
            className="btn-primary !px-3 !py-1.5 text-sm"
          >
            <CloudUpload size={14} /> {isUploading ? '上传中...' : '上传到知识库'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-nest-mist/50 px-5 py-2.5 text-sm">
        <span className="font-display font-semibold text-nest-pine">{plan.themeName}</span>
        <span className="text-nest-leaf/30">|</span>
        <span className="text-nest-muted">{plan.className}</span>
        <span className="text-nest-leaf/30">|</span>
        <span className="text-nest-muted">第 {plan.weekNumber} 周</span>
      </div>

      <div className="overflow-x-auto p-4">
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className={mergeLabelClass}>周工作{'\n'}重点</td>
              <td
                colSpan={4}
                className={`${cellClass} ${editableClass} whitespace-pre-line`}
                onDoubleClick={() => startEdit('focus')}
              >
                {editing === 'focus' ? (
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={confirmEdit}
                    autoFocus
                    className="field-input w-full resize-none !rounded-lg !p-1 text-xs"
                    rows={3}
                  />
                ) : (
                  plan.weeklyFocus
                )}
              </td>
            </tr>
            <tr>
              <td className={mergeLabelClass}>{'\n'}</td>
              <td className={headerClass}>自主学习</td>
              <td className={headerClass}>自主游戏</td>
              <td className={headerClass}>自主生活</td>
              <td className={headerClass}>自主运动</td>
            </tr>
            {plan.dailyPlans.map((dp, i) => (
              <tr key={dp.day}>
                <td className={mergeLabelClass}>{dp.day}</td>
                {dayFields.map((field) => (
                  <td
                    key={field}
                    className={`${cellClass} ${editableClass} whitespace-pre-line`}
                    onDoubleClick={() => startEdit(`${i}.${field}`)}
                  >
                    {editing === `${i}.${field}` ? (
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={confirmEdit}
                        autoFocus
                        className="field-input w-full resize-none !rounded-lg !p-1 text-xs"
                        rows={3}
                      />
                    ) : (
                      dp[field]
                    )}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td className={mergeLabelClass}>实施{'\n'}建议</td>
              <td
                colSpan={4}
                className={`${cellClass} ${editableClass} whitespace-pre-line`}
                onDoubleClick={() => startEdit('suggestions')}
              >
                {editing === 'suggestions' ? (
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={confirmEdit}
                    autoFocus
                    className="field-input w-full resize-none !rounded-lg !p-1 text-xs"
                    rows={3}
                  />
                ) : (
                  plan.suggestions
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {chatOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-nest-pine/20 backdrop-blur-[2px]" onClick={() => setChatOpen(false)} />
          <div className="relative flex h-full w-[420px] flex-col border-l border-nest-leaf/10 bg-white shadow-2xl shadow-nest-pine/20">
            <div className="flex items-center justify-between border-b border-nest-leaf/10 px-4 py-3">
              <span className="font-display font-semibold text-nest-ink">AI 对话修改</span>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                className="text-nest-muted hover:text-nest-pine"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <AiChatPanel
                chatHistory={chatHistory}
                isAiModifying={isAiModifying}
                onSendInstruction={onSendInstruction}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
