import type { ClassType } from '@/types/weeklyPlan'

interface Props {
  value: ClassType | ''
  onChange: (v: ClassType) => void
}

const options: { label: string; value: ClassType; desc: string }[] = [
  { label: '小班', value: '小班', desc: '3-4岁' },
  { label: '中班', value: '中班', desc: '4-5岁' },
  { label: '大班', value: '大班', desc: '5-6岁' },
]

export default function ClassSelector({ value, onChange }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4 font-semibold text-gray-700">
        <span>选择班级</span>
        <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded">必选</span>
      </div>
      <div className="flex gap-3">
        {options.map((opt) => (
          <div
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-4 px-4 rounded-lg border-2 text-center cursor-pointer transition-all ${value === opt.value ? 'border-blue-400 bg-blue-50' : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50'}`}
          >
            <div className="font-semibold text-gray-800">{opt.label}</div>
            <div className="text-xs text-gray-400 mt-1">{opt.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
