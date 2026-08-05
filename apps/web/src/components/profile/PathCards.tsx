import type { GrowthPath, WordCloudItem } from '@/lib/profile-metrics'

interface PathCardsProps {
  paths: GrowthPath[]
  wordCloud: WordCloudItem[]
}

export default function PathCards({ paths, wordCloud }: PathCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <section className="surface-panel p-5">
        <h3 className="font-display text-base font-semibold text-nest-ink">成长路径参考</h3>
        <p className="mt-1 text-xs text-nest-muted">
          「当前匹配度」按活动方案 / 周计划 / 教师成果库三维度计算，仅供个人发展参考，非排名或绩效指标。
        </p>
        <ul className="mt-4 space-y-3">
          {paths.map((path) => (
            <li key={path.id} className="rounded-xl border border-nest-leaf/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-medium text-nest-ink">{path.label}</h4>
                  <p className="mt-1 text-sm text-nest-muted">{path.description}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-2xl font-bold tabular-nums text-nest-leaf">{path.matchPercent}%</p>
                  <p className="text-[10px] text-nest-muted">当前匹配度</p>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-nest-mist">
                <div
                  className="h-full rounded-full bg-nest-leaf transition-all"
                  style={{ width: `${path.matchPercent}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="surface-panel p-5">
        <h3 className="font-display text-base font-semibold text-nest-ink">关键词云</h3>
        <p className="mt-1 text-xs text-nest-muted">来自成果名称、关键词与子类型，反映关注主题。</p>
        {wordCloud.length === 0 ? (
          <p className="mt-6 text-sm text-nest-muted">暂无足够文本生成词云。</p>
        ) : (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 px-2 py-4">
            {wordCloud.map((item) => {
              const size = 12 + Math.min(item.weight * 2, 16)
              return (
                <span
                  key={item.word}
                  className="inline-block rounded-lg bg-nest-mist/80 px-2 py-1 text-nest-pine transition hover:bg-nest-mist"
                  style={{ fontSize: `${size}px`, opacity: 0.55 + item.weight * 0.08 }}
                >
                  {item.word}
                </span>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
