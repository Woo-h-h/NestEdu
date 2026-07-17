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
    'px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200'
  const cellClass = 'px-3 py-2 text-xs border border-gray-200 align-top'
  const editableClass = 'cursor-pointer hover:bg-blue-50 transition-colors'
  const mergeLabelClass =
    'px-3 py-2 text-xs font-semibold text-center bg-gray-50 border border-gray-200 w-20 whitespace-pre-line'

  const dayFields: (keyof DayPlan)[] = [
    'collectiveLearning',
    'regionalGames',
    'dailyLife',
    'outdoorSports',
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2 font-semibold text-gray-700">
          <span>周计划预览 & 编辑</span>
          <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">已生成</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setChatOpen(true)}
            className="px-3 py-1.5 text-sm bg-amber-50 text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-100 flex items-center gap-1.5"
          >
            <MessageSquare size={14} /> AI 修改
          </button>
          <ExportToolbar plan={plan} />
          <button
            onClick={onUploadToKnowledge}
            disabled={isUploading}
            className="px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center gap-1.5"
          >
            <CloudUpload size={14} /> {isUploading ? '上传中...' : '上传到知识库'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 px-5 py-2.5 bg-blue-50 text-sm">
        <span className="font-semibold text-blue-600">{plan.themeName}</span>
        <span className="text-gray-300">|</span>
        <span className="text-gray-600">{plan.className}</span>
        <span className="text-gray-300">|</span>
        <span className="text-gray-600">第 {plan.weekNumber} 周</span>
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
                    className="w-full border border-blue-300 rounded p-1 text-xs resize-none"
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
                        className="w-full border border-blue-300 rounded p-1 text-xs resize-none"
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
                    className="w-full border border-blue-300 rounded p-1 text-xs resize-none"
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
          <div className="absolute inset-0 bg-black/20" onClick={() => setChatOpen(false)} />
          <div className="relative w-[420px] bg-white shadow-xl h-full flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <span className="font-semibold text-gray-700">AI 对话修改</span>
              <button onClick={() => setChatOpen(false)} className="text-gray-400 hover:text-gray-600">
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
