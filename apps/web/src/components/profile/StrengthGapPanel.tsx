import type { AnalysisItem } from '@/lib/profile-metrics'
import { Sparkles, Target } from 'lucide-react'

interface StrengthGapPanelProps {
  strengths: AnalysisItem[]
  gaps: AnalysisItem[]
}

export default function StrengthGapPanel({ strengths, gaps }: StrengthGapPanelProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel
        title="成长优势（规则分析）"
        icon={Sparkles}
        tone="text-emerald-700 bg-emerald-50 ring-emerald-200/80"
        items={strengths}
        emptyHint="三维度有更多记录后，将基于规则识别您的结构优势。"
      />
      <Panel
        title="待发展关注（规则分析）"
        icon={Target}
        tone="text-amber-800 bg-amber-50 ring-amber-200/80"
        items={gaps}
        emptyHint="当前三维度未发现明显缺口，可继续保持入库节奏。"
      />
    </div>
  )
}

function Panel({
  title,
  icon: Icon,
  tone,
  items,
  emptyHint,
}: {
  title: string
  icon: typeof Sparkles
  tone: string
  items: AnalysisItem[]
  emptyHint: string
}) {
  return (
    <section className="surface-panel p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ring-1 ${tone}`}>
          <Icon size={18} />
        </div>
        <h3 className="font-display text-base font-semibold text-nest-ink">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-nest-muted">{emptyHint}</p>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={item.title} className="rounded-xl border border-nest-leaf/10 bg-nest-mist/40 p-4">
              <h4 className="font-medium text-nest-ink">{item.title}</h4>
              <p className="mt-1.5 text-sm leading-relaxed text-nest-muted">{item.text}</p>
              <p className="mt-2 text-xs text-nest-muted/80">
                依据：{item.evidence} · {item.source}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
