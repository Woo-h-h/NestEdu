interface RadarChartProps {
  labels: string[]
  values: number[]
  size?: number
}

export default function RadarChart({ labels, values, size = 280 }: RadarChartProps) {
  const cx = size / 2
  const cy = size / 2
  const maxR = size * 0.36
  const levels = [25, 50, 75, 100]
  const count = labels.length

  const pointAt = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2
    const r = (value / 100) * maxR
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    }
  }

  const polygon = values
    .map((v, i) => {
      const { x, y } = pointAt(i, v)
      return `${x},${y}`
    })
    .join(' ')

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="成长结构雷达图">
        {levels.map((level) => {
          const ring = labels
            .map((_, i) => {
              const { x, y } = pointAt(i, level)
              return `${x},${y}`
            })
            .join(' ')
          return (
            <polygon
              key={level}
              points={ring}
              fill="none"
              stroke="rgba(47,111,94,0.15)"
              strokeWidth={1}
            />
          )
        })}
        {labels.map((label, i) => {
          const outer = pointAt(i, 100)
          const labelPt = pointAt(i, 118)
          return (
            <g key={label}>
              <line
                x1={cx}
                y1={cy}
                x2={outer.x}
                y2={outer.y}
                stroke="rgba(47,111,94,0.2)"
                strokeWidth={1}
              />
              <text
                x={labelPt.x}
                y={labelPt.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-nest-muted text-[9px]"
              >
                {label.length > 8 ? `${label.slice(0, 7)}…` : label}
              </text>
            </g>
          )
        })}
        <polygon
          points={polygon}
          fill="rgba(74,155,127,0.25)"
          stroke="#2f6f5e"
          strokeWidth={2}
        />
        {values.map((v, i) => {
          const { x, y } = pointAt(i, v)
          return <circle key={i} cx={x} cy={y} r={3.5} fill="#1b4d3e" />
        })}
      </svg>
      <p className="mt-2 max-w-xs text-center text-xs text-nest-muted">
        雷达值为成长结构丰富度观察，不代表能力或绩效评分。
      </p>
    </div>
  )
}
