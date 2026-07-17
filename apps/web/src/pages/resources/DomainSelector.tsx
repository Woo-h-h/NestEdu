export const FOCUS_DOMAINS = ['艺术', '语言', '科学', '健康', '社会'] as const

export type FocusDomain = (typeof FOCUS_DOMAINS)[number]

interface Props {
  value: FocusDomain[]
  onChange: (v: FocusDomain[]) => void
}

const options: { label: string; value: FocusDomain; desc: string }[] = [
  { label: '艺术', value: '艺术', desc: '音乐 / 美术' },
  { label: '语言', value: '语言', desc: '阅读 / 表达' },
  { label: '科学', value: '科学', desc: '探究 / 自然' },
  { label: '健康', value: '健康', desc: '体能 / 习惯' },
  { label: '社会', value: '社会', desc: '交往 / 规则' },
]

export default function DomainSelector({ value, onChange }: Props) {
  const toggle = (domain: FocusDomain) => {
    if (value.includes(domain)) {
      onChange(value.filter((d) => d !== domain))
    } else {
      onChange([...value, domain])
    }
  }

  return (
    <div className="surface-panel p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2 font-medium text-nest-ink">
        <span>重点领域</span>
        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-500">可多选</span>
        {value.length > 0 && (
          <span className="rounded-full bg-nest-mist px-2 py-0.5 text-xs text-nest-leaf">
            已选 {value.length} 个 · 将生成 {value.length} 份教案
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {options.map((opt) => {
          const selected = value.includes(opt.value)
          return (
            <div
              key={opt.value}
              role="button"
              tabIndex={0}
              onClick={() => toggle(opt.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggle(opt.value)
                }
              }}
              className={`cursor-pointer rounded-xl border-2 px-3 py-4 text-center transition-all ${
                selected
                  ? 'border-nest-leaf bg-nest-mist shadow-sm shadow-nest-leaf/10'
                  : 'border-transparent bg-nest-sand/40 hover:border-nest-leaf/25 hover:bg-nest-mist/60'
              }`}
            >
              <div
                className={`font-display text-base font-semibold ${selected ? 'text-nest-pine' : 'text-nest-ink'}`}
              >
                {opt.label}
              </div>
              <div className="mt-1 text-xs text-nest-muted">{opt.desc}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
