import type { YearTrendSeries } from '@/lib/profile-metrics'

const COLORS = ['#2f6f5e', '#4a9b7f', '#1b4d3e']

interface TrendChartProps {
  series: YearTrendSeries[]
  width?: number
  height?: number
}

export default function TrendChart({ series, width = 420, height = 220 }: TrendChartProps) {
  if (series.length === 0) return null

  const years = series[0].points.map((p) => p.year)
  const maxCount = Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.count)))
  const pad = { top: 16, right: 16, bottom: 36, left: 36 }
  const chartW = width - pad.left - pad.right
  const chartH = height - pad.top - pad.bottom

  const xAt = (index: number) => pad.left + (index / Math.max(years.length - 1, 1)) * chartW
  const yAt = (count: number) => pad.top + chartH - (count / maxCount) * chartH

  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="年度趋势图">
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = pad.top + chartH * (1 - ratio)
          return (
            <g key={ratio}>
              <line
                x1={pad.left}
                y1={y}
                x2={width - pad.right}
                y2={y}
                stroke="rgba(47,111,94,0.1)"
              />
              <text x={pad.left - 8} y={y + 4} textAnchor="end" className="fill-nest-muted text-[10px]">
                {Math.round(maxCount * ratio)}
              </text>
            </g>
          )
        })}
        {years.map((year, i) => (
          <text
            key={year}
            x={xAt(i)}
            y={height - 10}
            textAnchor="middle"
            className="fill-nest-muted text-[11px]"
          >
            {year}
          </text>
        ))}
        {series.map((s, si) => {
          const color = COLORS[si % COLORS.length]
          const path = s.points
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i)} ${yAt(p.count)}`)
            .join(' ')
          return (
            <g key={s.dimensionId}>
              <path d={path} fill="none" stroke={color} strokeWidth={2} />
              {s.points.map((p, i) => (
                <circle key={i} cx={xAt(i)} cy={yAt(p.count)} r={3.5} fill={color} />
              ))}
            </g>
          )
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3">
        {series.map((s, i) => (
          <span key={s.dimensionId} className="inline-flex items-center gap-1.5 text-xs text-nest-muted">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}
