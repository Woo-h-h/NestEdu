import type { ClassType } from '@/types/weeklyPlan'

interface Props {
  value: ClassType | ''
  onChange: (v: ClassType) => void
}

const options: { label: string; value: ClassType; desc: string }[] = [
  { label: '小班', value: '小班', desc: '3–4 岁' },
  { label: '中班', value: '中班', desc: '4–5 岁' },
  { label: '大班', value: '大班', desc: '5–6 岁' },
]

export default function ClassSelector({ value, onChange }: Props) {
  return (
    <div className="surface-panel p-5">
      <div className="mb-4 flex items-center gap-2 font-medium text-nest-ink">
        <span>选择班级</span>
        <span className="rounded-md bg-rose-50 px-2 py-0.5 text-xs text-rose-600">必选</span>
      </div>
      <div className="flex gap-3">
        {options.map((opt) => {
          const selected = value === opt.value
          return (
            <button
              type="button"
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={`flex-1 rounded-2xl border-2 px-4 py-4 text-center transition-all duration-200 ${
                selected
                  ? 'border-nest-leaf bg-nest-mist shadow-sm shadow-nest-leaf/10'
                  : 'border-transparent bg-nest-sand/40 hover:border-nest-leaf/25 hover:bg-nest-mist/60'
              }`}
            >
              <div className={`font-display text-base font-semibold ${selected ? 'text-nest-pine' : 'text-nest-ink'}`}>
                {opt.label}
              </div>
              <div className="mt-1 text-xs text-nest-muted">{opt.desc}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
