import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import type { TeachingPlan } from '@/types/weeklyPlan'
import { FileText, Loader2, MessageSquare, Pencil, Send } from 'lucide-react'

interface Props {
  plans: TeachingPlan[]
  loading?: boolean
  activePlanId?: string | null
  onActivePlanChange?: (plan: TeachingPlan) => void
  onManualSave?: (plan: TeachingPlan) => void
  onAiModify?: (planId: string, instruction: string) => Promise<string>
  isAiModifying?: boolean
}

export type ActivityPlanPreviewHandle = {
  /** 上传前把未点「保存修改」的草稿一并提交 */
  flushPendingEdit: () => TeachingPlan | null
}

const AI_QUICK_COMMANDS = [
  '把活动过程写得更具体、可操作',
  '补充活动准备与安全注意',
  '增加家园共育延伸',
  '按小班注意力缩短环节',
]

type PreviewMode = 'view' | 'edit' | 'ai'

function normalizedDraft(draft: TeachingPlan): TeachingPlan | null {
  const next: TeachingPlan = {
    ...draft,
    title: draft.title.trim(),
    domain: draft.domain.trim(),
    gradeLevel: draft.gradeLevel.trim(),
    objectives: draft.objectives.trim(),
    content: draft.content.trim(),
  }
  if (
    !next.title ||
    !next.domain ||
    !next.gradeLevel ||
    !next.objectives ||
    !next.content
  ) {
    return null
  }
  return next
}

export default forwardRef<ActivityPlanPreviewHandle, Props>(function ActivityPlanPreview(
  {
    plans,
    loading = false,
    activePlanId,
    onActivePlanChange,
    onManualSave,
    onAiModify,
    isAiModifying = false,
  },
  ref
) {
  const [localIndex, setLocalIndex] = useState(0)
  const [mode, setMode] = useState<PreviewMode>('view')
  const [draft, setDraft] = useState<TeachingPlan | null>(null)
  const [aiInstruction, setAiInstruction] = useState('')
  const [aiMessage, setAiMessage] = useState('')

  const activeIndex =
    activePlanId != null
      ? Math.max(
          0,
          plans.findIndex((p) => p.id === activePlanId)
        )
      : localIndex

  const plan = plans[activeIndex]

  useEffect(() => {
    setMode('view')
    setDraft(null)
    setAiInstruction('')
    setAiMessage('')
  }, [plan?.id])

  const selectPlan = (index: number) => {
    setLocalIndex(index)
    const next = plans[index]
    if (next) onActivePlanChange?.(next)
  }

  const startEdit = () => {
    if (!plan) return
    setDraft({ ...plan })
    setMode('edit')
  }

  const saveEdit = () => {
    if (!draft) return
    const saved = normalizedDraft(draft)
    if (!saved) return
    onManualSave?.(saved)
    setMode('view')
    setDraft(null)
  }

  const flushPendingEdit = (): TeachingPlan | null => {
    if (mode !== 'edit' || !draft) return null
    const saved = normalizedDraft(draft)
    if (!saved) return null
    onManualSave?.(saved)
    setMode('view')
    setDraft(null)
    return saved
  }

  useImperativeHandle(ref, () => ({ flushPendingEdit }), [mode, draft, onManualSave])

  const sendAi = async (text?: string) => {
    const instruction = (text || aiInstruction).trim()
    if (!plan || !instruction || !onAiModify || isAiModifying) return
    setAiInstruction('')
    try {
      const message = await onAiModify(plan.id, instruction)
      setAiMessage(message)
    } catch {
      // 失败提示由页面 toast 处理
    }
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-full flex-col items-center justify-center gap-3 text-nest-muted">
        <Loader2 size={28} className="animate-spin text-nest-leaf" />
        <p className="text-sm">正在生成活动方案…</p>
      </div>
    )
  }

  if (plans.length === 0) {
    return (
      <div className="flex h-full min-h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-nest-leaf/20 bg-nest-mist/20 px-6 text-center">
        <FileText size={36} className="text-nest-leaf/40" />
        <p className="font-display text-base font-medium text-nest-ink">方案预览区</p>
        <p className="max-w-xs text-sm leading-relaxed text-nest-muted">
          填写左侧条件并生成后，将在此以文档形式预览单次活动方案
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col">
      {plans.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-2 border-b border-nest-leaf/10 pb-3">
          {plans.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => selectPlan(i)}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                i === activeIndex
                  ? 'bg-nest-leaf text-white shadow-sm shadow-nest-leaf/20'
                  : 'border border-nest-leaf/10 bg-white text-nest-muted hover:bg-nest-mist hover:text-nest-pine'
              }`}
            >
              {p.domain.split('、')[0]?.trim() || `方案 ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      {plan && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startEdit}
              disabled={mode === 'edit'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-800 hover:bg-sky-100 disabled:opacity-60"
            >
              <Pencil size={14} />
              自主编辑
            </button>
            <button
              type="button"
              onClick={() => setMode('ai')}
              disabled={mode === 'ai'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-60"
            >
              <MessageSquare size={14} />
              AI 修改
            </button>
          </div>

          {mode === 'edit' && draft && (
            <div className="mb-3 space-y-2 rounded-xl border border-sky-100 bg-sky-50/40 p-3">
              <input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                className="field-input"
                placeholder="活动标题"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={draft.domain}
                  onChange={(e) => setDraft({ ...draft, domain: e.target.value })}
                  className="field-input"
                  placeholder="领域，如：语言"
                />
                <input
                  value={draft.gradeLevel}
                  onChange={(e) => setDraft({ ...draft, gradeLevel: e.target.value })}
                  className="field-input"
                  placeholder="班级，如：小班"
                />
              </div>
              <textarea
                value={draft.objectives}
                onChange={(e) => setDraft({ ...draft, objectives: e.target.value })}
                rows={4}
                className="field-input resize-none"
                placeholder="活动目标"
              />
              <textarea
                value={draft.content}
                onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                rows={10}
                className="field-input resize-y"
                placeholder="活动内容"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('view')
                    setDraft(null)
                  }}
                  className="btn-secondary !py-1.5 text-xs"
                >
                  取消
                </button>
                <button type="button" onClick={saveEdit} className="btn-primary !py-1.5 text-xs">
                  保存修改
                </button>
              </div>
            </div>
          )}

          {mode === 'ai' && (
            <div className="mb-3 space-y-2 rounded-xl border border-amber-100 bg-amber-50/40 p-3">
              <div className="flex flex-wrap gap-1.5">
                {AI_QUICK_COMMANDS.map((cmd) => (
                  <button
                    key={cmd}
                    type="button"
                    onClick={() => void sendAi(cmd)}
                    disabled={isAiModifying}
                    className="rounded-full bg-white px-2 py-1 text-[11px] text-nest-muted ring-1 ring-amber-200/80 hover:bg-amber-100 hover:text-amber-900 disabled:opacity-50"
                  >
                    {cmd}
                  </button>
                ))}
              </div>
              {aiMessage ? (
                <p className="rounded-lg bg-white px-3 py-2 text-xs leading-relaxed text-nest-ink">
                  {aiMessage}
                </p>
              ) : (
                <p className="text-xs text-nest-muted">描述你想改的地方，智能助手会改当前这份方案。</p>
              )}
              {isAiModifying && (
                <p className="flex items-center gap-1.5 text-xs text-amber-800">
                  <Loader2 size={12} className="animate-spin" />
                  正在按你的说明修改…
                </p>
              )}
              <div className="flex gap-2">
                <textarea
                  value={aiInstruction}
                  onChange={(e) => setAiInstruction(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void sendAi()
                    }
                  }}
                  rows={2}
                  disabled={isAiModifying}
                  placeholder="输入修改指令…"
                  className="field-input flex-1 resize-none"
                />
                <button
                  type="button"
                  onClick={() => void sendAi()}
                  disabled={!aiInstruction.trim() || isAiModifying}
                  className="btn-primary shrink-0 !px-3"
                >
                  <Send size={16} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setMode('view')}
                className="text-xs text-nest-muted hover:text-nest-pine"
              >
                收起
              </button>
            </div>
          )}

          <article className="flex-1 rounded-xl border border-nest-leaf/10 bg-white p-5 shadow-sm shadow-nest-leaf/5">
            <header className="border-b border-nest-leaf/10 pb-4">
              <h3 className="font-display text-lg font-semibold text-nest-ink">{plan.title}</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {plan.domain.split('、').map((d) => (
                  <span
                    key={d}
                    className="rounded-full bg-nest-mist px-2.5 py-0.5 text-xs font-medium text-nest-pine"
                  >
                    {d.trim()}
                  </span>
                ))}
                {plan.gradeLevel && (
                  <span className="rounded-full bg-nest-sand/60 px-2.5 py-0.5 text-xs text-nest-muted">
                    {plan.gradeLevel}
                  </span>
                )}
              </div>
            </header>

            {plan.objectives && (
              <section className="mt-4">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-nest-pine">
                  活动目标
                </h4>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-nest-ink">
                  {plan.objectives}
                </p>
              </section>
            )}

            {plan.content && (
              <section className="mt-4">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-nest-pine">
                  活动内容
                </h4>
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-nest-ink/90">
                  {plan.content}
                </div>
              </section>
            )}
          </article>
        </>
      )}
    </div>
  )
})
