import type { ProfileDimension } from '@/lib/profile-metrics'

interface DimensionCardsProps {
  dimensions: ProfileDimension[]
}

export default function DimensionCards({ dimensions }: DimensionCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {dimensions.map((dim) => (
        <article key={dim.id} className="surface-panel p-5">
          <p className="text-xs font-medium text-nest-muted">成长结构维度</p>
          <h3 className="font-display mt-1 text-base font-semibold text-nest-ink">{dim.label}</h3>
          <p className="mt-3 text-3xl font-bold tabular-nums text-nest-leaf">{dim.count}</p>
          <p className="mt-1 text-xs text-nest-muted">结构记录量 · 非能力分值</p>
          <p className="mt-3 text-sm leading-relaxed text-nest-muted">{dim.description}</p>
          <ul className="mt-3 space-y-1 text-xs text-nest-muted/90">
            {dim.sources.map((source) => (
              <li key={source} className="flex items-start gap-1.5">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-nest-moss" />
                {source}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  )
}
