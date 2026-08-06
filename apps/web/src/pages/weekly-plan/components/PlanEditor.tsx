import { useEffect, useState } from 'react'
import type { WeeklyPlan, DayPlan, ChatMessage } from '@/types/weeklyPlan'
import AiChatPanel from './AiChatPanel'
import ExportToolbar from './ExportToolbar'
import { MessageSquare, X, CloudUpload, Pencil, Check } from 'lucide-react'

interface Props {
  plan: WeeklyPlan
  chatHistory: ChatMessage[]
  isAiModifying: boolean
  isUploading?: boolean
  onPlanUpdate: (p: WeeklyPlan) => void
  onUploadToKnowledge: () => void
  onSendInstruction: (instruction: string) => Promise<void>
}

const dayFields: { key: keyof DayPlan; label: string }[] = [
  { key: 'collectiveLearning', label: '自主学习' },
  { key: 'regionalGames', label: '自主游戏' },
  { key: 'dailyLife', label: '自主生活' },
  { key: 'outdoorSports', label: '自主运动' },
]

function clonePlan(plan: WeeklyPlan): WeeklyPlan {
  return JSON.parse(JSON.stringify(plan)) as WeeklyPlan
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
  const [manualEditMode, setManualEditMode] = useState(false)
  const [draft, setDraft] = useState<WeeklyPlan>(() => clonePlan(plan))

  useEffect(() => {
    if (!manualEditMode) {
      setDraft(clonePlan(plan))
    }
  }, [plan, manualEditMode])

  const startEdit = (key: string) => {
    if (manualEditMode) return
    setEditing(key)
    const parts = key.split('.')
    if (parts[0] === 'focus') setEditValue(plan.weeklyFocus)
    else if (parts[0] === 'suggestions') setEditValue(plan.suggestions)
    else {
      const dp = plan.dailyPlans[Number(parts[1])]
      if (dp) setEditValue(String(dp[parts[2] as keyof DayPlan] || ''))
    }
  }

  const confirmEdit = () => {
    if (!editing) return
    const newPlan = clonePlan(plan)
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

  const enterManualEdit = () => {
    setEditing(null)
    setDraft(clonePlan(plan))
    setManualEditMode(true)
  }

  const saveManualEdit = () => {
    onPlanUpdate(draft)
    setManualEditMode(false)
  }

  const cancelManualEdit = () => {
    setDraft(clonePlan(plan))
    setManualEditMode(false)
  }

  const updateDraftFocus = (value: string) => {
    setDraft((prev) => ({ ...prev, weeklyFocus: value }))
  }

  const updateDraftSuggestions = (value: string) => {
    setDraft((prev) => ({ ...prev, suggestions: value }))
  }

  const updateDraftDay = (dayIndex: number, field: keyof DayPlan, value: string) => {
    setDraft((prev) => {
      const next = clonePlan(prev)
      next.dailyPlans[dayIndex] = { ...next.dailyPlans[dayIndex], [field]: value }
      return next
    })
  }

  const viewPlan = manualEditMode ? draft : plan

  const headerClass =
    'border border-nest-leaf/15 bg-nest-mist/60 px-3 py-2 text-xs font-semibold text-nest-pine'
  const cellClass = 'border border-nest-leaf/15 px-3 py-2 text-xs align-top text-nest-ink'
  const editableClass = manualEditMode
    ? ''
    : 'cursor-pointer transition-colors hover:bg-nest-mist/50'
  const mergeLabelClass =
    'w-20 whitespace-pre-line border border-nest-leaf/15 bg-nest-mist/60 px-3 py-2 text-center text-xs font-semibold text-nest-pine'
  const textareaClass =
    'field-input w-full resize-y !rounded-lg !p-2 text-xs leading-relaxed min-h-[72px]'

  return (
    <div className="surface-panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-nest-leaf/10 bg-nest-mist/30 px-5 py-4">
        <div className="flex items-center gap-2 font-medium text-nest-ink">
          <span className="font-display">周计划预览 & 编辑</span>
          <span className="rounded-full bg-nest-mist px-2 py-0.5 text-xs text-nest-leaf">
            {manualEditMode ? '编辑中' : '已生成'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {manualEditMode ? (
            <>
              <button
                type="button"
                onClick={cancelManualEdit}
                className="inline-flex items-center gap-1.5 rounded-xl border border-nest-leaf/20 bg-white px-3 py-1.5 text-sm text-nest-muted transition-colors hover:bg-nest-mist"
              >
                取消
              </button>
              <button
                type="button"
                onClick={saveManualEdit}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700 transition-colors hover:bg-emerald-100"
              >
                <Check size={14} /> 保存修改
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={enterManualEdit}
              className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm text-sky-700 transition-colors hover:bg-sky-100"
            >
              <Pencil size={14} /> 自主编辑
            </button>
          )}
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            disabled={manualEditMode}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50"
          >
            <MessageSquare size={14} /> AI 修改
          </button>
          <ExportToolbar plan={viewPlan} />
          <button
            type="button"
            onClick={onUploadToKnowledge}
            disabled={isUploading || manualEditMode}
            className="btn-primary !px-3 !py-1.5 text-sm disabled:opacity-50"
          >
            <CloudUpload size={14} /> {isUploading ? '上传中...' : '上传到知识库'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-nest-mist/50 px-5 py-2.5 text-sm">
        <span className="font-display font-semibold text-nest-pine">{viewPlan.themeName}</span>
        <span className="text-nest-leaf/30">|</span>
        <span className="text-nest-muted">{viewPlan.className}</span>
        <span className="text-nest-leaf/30">|</span>
        <span className="text-nest-muted">第 {viewPlan.weekNumber} 周</span>
      </div>

      {!manualEditMode && (
        <p className="border-b border-nest-leaf/10 bg-white px-5 py-2 text-xs text-nest-muted">
          点击「自主编辑」可修改整张周计划；也可双击单个单元格快速修改。
        </p>
      )}

      {manualEditMode && (
        <p className="border-b border-sky-100 bg-sky-50/80 px-5 py-2 text-xs text-sky-800">
          自主编辑模式：可直接修改下方各栏内容，完成后点击「保存修改」。
        </p>
      )}

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
                {manualEditMode ? (
                  <textarea
                    value={draft.weeklyFocus}
                    onChange={(e) => updateDraftFocus(e.target.value)}
                    className={textareaClass}
                    rows={4}
                  />
                ) : editing === 'focus' ? (
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={confirmEdit}
                    autoFocus
                    className={textareaClass}
                    rows={4}
                  />
                ) : (
                  viewPlan.weeklyFocus
                )}
              </td>
            </tr>
            <tr>
              <td className={mergeLabelClass}>{'\n'}</td>
              {dayFields.map((field) => (
                <td key={field.key} className={headerClass}>
                  {field.label}
                </td>
              ))}
            </tr>
            {viewPlan.dailyPlans.map((dp, i) => (
              <tr key={dp.day}>
                <td className={mergeLabelClass}>{dp.day}</td>
                {dayFields.map((field) => {
                  const editKey = `${i}.${field.key}`
                  return (
                    <td
                      key={field.key}
                      className={`${cellClass} ${editableClass} whitespace-pre-line`}
                      onDoubleClick={() => startEdit(editKey)}
                    >
                      {manualEditMode ? (
                        <textarea
                          value={draft.dailyPlans[i][field.key]}
                          onChange={(e) => updateDraftDay(i, field.key, e.target.value)}
                          className={textareaClass}
                          rows={5}
                        />
                      ) : editing === editKey ? (
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={confirmEdit}
                          autoFocus
                          className={textareaClass}
                          rows={5}
                        />
                      ) : (
                        dp[field.key]
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
            <tr>
              <td className={mergeLabelClass}>实施{'\n'}建议</td>
              <td
                colSpan={4}
                className={`${cellClass} ${editableClass} whitespace-pre-line`}
                onDoubleClick={() => startEdit('suggestions')}
              >
                {manualEditMode ? (
                  <textarea
                    value={draft.suggestions}
                    onChange={(e) => updateDraftSuggestions(e.target.value)}
                    className={textareaClass}
                    rows={4}
                  />
                ) : editing === 'suggestions' ? (
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={confirmEdit}
                    autoFocus
                    className={textareaClass}
                    rows={4}
                  />
                ) : (
                  viewPlan.suggestions
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {chatOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-nest-pine/20 backdrop-blur-[2px]"
            onClick={() => setChatOpen(false)}
          />
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
