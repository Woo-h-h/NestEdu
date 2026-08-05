import type { CategoryCountItem } from '@/lib/profile-metrics'

const SLICE_COLORS = ['#2f6f5e', '#4a9b7f', '#6bb896', '#1b4d3e', '#8fc4ad']

interface DonutChartProps {
  items: CategoryCountItem[]
  size?: number
}

export default function DonutChart({ items, size = 200 }: DonutChartProps) {
  const chartItems = items.filter((i) => i.count > 0)
  const total = chartItems.reduce((sum, i) => sum + i.count, 0)
  const cx = size / 2
  const cy = size / 2
  const outerR = size * 0.38
  const innerR = size * 0.24

  if (total === 0) {
    return (
      <div className="flex h-[200px] flex-col items-center justify-center text-sm text-nest-muted">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="#e8f2ee" strokeWidth={outerR - innerR} />
        </svg>
        <p className="mt-2">暂无结构分布数据</p>
      </div>
    )
  }

  let angle = -Math.PI / 2
  const slices = chartItems.map((item, index) => {
    const sliceAngle = (item.count / total) * Math.PI * 2
    const start = angle
    angle += sliceAngle
    const end = angle
    const largeArc = sliceAngle > Math.PI ? 1 : 0
    const x1 = cx + outerR * Math.cos(start)
    const y1 = cy + outerR * Math.sin(start)
    const x2 = cx + outerR * Math.cos(end)
    const y2 = cy + outerR * Math.sin(end)
    const ix1 = cx + innerR * Math.cos(end)
    const iy1 = cy + innerR * Math.sin(end)
    const ix2 = cx + innerR * Math.cos(start)
    const iy2 = cy + innerR * Math.sin(start)
    const d = [
      `M ${x1} ${y1}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${ix1} ${iy1}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2}`,
      'Z',
    ].join(' ')
    return { ...item, d, color: SLICE_COLORS[index % SLICE_COLORS.length] }
  })

  return (
    <div className="flex flex-col items-center gap-4 md:flex-row md:items-start">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="成果类别分布">
        {slices.map((slice) => (
          <path key={slice.key} d={slice.d} fill={slice.color} opacity={0.9} />
        ))}
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" className="fill-nest-ink text-lg font-bold">
          {total}
        </text>
      </svg>
      <ul className="space-y-2 text-sm">
        {chartItems.map((item, i) => (
          <li key={item.key} className="flex items-center gap-2 text-nest-muted">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: SLICE_COLORS[i % SLICE_COLORS.length] }}
            />
            <span>{item.label}</span>
            <span className="font-medium text-nest-ink">{item.count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
