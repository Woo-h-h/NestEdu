import { FolderKanban, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

type PlaceholderPageProps = {
  title: string
  phase: string
  description: string
  nextHint: string
}

export default function PlaceholderPage({
  title,
  phase,
  description,
  nextHint,
}: PlaceholderPageProps) {
  return (
    <div className="page-enter mx-auto max-w-2xl">
      <div className="surface-panel p-8 md:p-10">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-nest-mist text-nest-leaf ring-1 ring-nest-leaf/15">
          <FolderKanban size={22} />
        </div>
        <p className="text-xs font-semibold tracking-wide text-nest-leaf uppercase">{phase}</p>
        <h1 className="font-display mt-2 text-2xl font-semibold text-nest-ink">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-nest-muted">{description}</p>
        <p className="mt-4 rounded-xl bg-nest-mist/60 px-4 py-3 text-sm text-nest-ink/80 ring-1 ring-nest-leaf/10">
          <Sparkles size={14} className="mr-1.5 inline text-nest-leaf" />
          {nextHint}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/activity" className="btn-primary">
            先去活动方案
          </Link>
          <Link to="/weekly-plan" className="btn-secondary">
            去周计划
          </Link>
        </div>
      </div>
    </div>
  )
}
