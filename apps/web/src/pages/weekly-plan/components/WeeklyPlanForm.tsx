interface Props {
  themeName: string
  weekNumber: number | null
  notes: string
  onThemeNameChange: (v: string) => void
  onWeekNumberChange: (v: number | null) => void
  onNotesChange: (v: string) => void
}

export default function WeeklyPlanForm({
  themeName,
  weekNumber,
  notes,
  onThemeNameChange,
  onWeekNumberChange,
  onNotesChange,
}: Props) {
  return (
    <div className="surface-panel p-5">
      <div className="mb-4 font-display font-medium text-nest-ink">填写基本信息</div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm text-nest-muted">
            主题名称 <span className="text-red-400">*</span>
          </label>
          <input
            value={themeName}
            onChange={(e) => onThemeNameChange(e.target.value)}
            placeholder="如：好宝宝爱图书"
            className="field-input"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-nest-muted">
            第几周 <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            min={1}
            max={20}
            value={weekNumber ?? ''}
            onChange={(e) =>
              onWeekNumberChange(e.target.value ? Number(e.target.value) : null)
            }
            placeholder="第N周"
            className="field-input"
          />
        </div>
      </div>
      <div className="mt-3">
        <label className="mb-1.5 block text-sm text-nest-muted">备注（选填）</label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={2}
          placeholder="补充说明，如特殊活动安排等"
          className="field-input resize-none"
        />
      </div>
    </div>
  )
}
