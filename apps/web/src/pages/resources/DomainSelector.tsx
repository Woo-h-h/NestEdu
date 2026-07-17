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
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4 font-semibold text-gray-700 flex-wrap">
        <span>重点领域</span>
        <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded">可多选</span>
        {value.length > 0 && (
          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
            已选 {value.length} 个 · 将生成 {value.length} 份教案
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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
              className={`py-4 px-3 rounded-lg border-2 text-center cursor-pointer transition-all ${
                selected
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50'
              }`}
            >
              <div className="font-semibold text-gray-800">{opt.label}</div>
              <div className="text-xs text-gray-400 mt-1">{opt.desc}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
