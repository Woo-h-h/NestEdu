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
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4 font-semibold text-gray-700">填写基本信息</div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">
            主题名称 <span className="text-red-400">*</span>
          </label>
          <input
            value={themeName}
            onChange={(e) => onThemeNameChange(e.target.value)}
            placeholder="如：好宝宝爱图书"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">
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
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>
      </div>
      <div className="mt-3">
        <label className="block text-sm text-gray-600 mb-1">备注（选填）</label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={2}
          placeholder="补充说明，如特殊活动安排等"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none"
        />
      </div>
    </div>
  )
}
