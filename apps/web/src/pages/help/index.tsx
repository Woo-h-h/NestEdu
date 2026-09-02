import { Link } from 'react-router-dom'
import { CircleHelp } from 'lucide-react'
import {
  TEACHER_HANDBOOK_INTRO,
  TEACHER_HANDBOOK_SECTIONS,
  type HandbookBlock,
} from '@/lib/teacherHandbook'

function Block({ block }: { block: HandbookBlock }) {
  return (
    <div className="space-y-3">
      {block.heading ? (
        <h3 className="text-base font-semibold text-nest-ink">{block.heading}</h3>
      ) : null}
      {block.paragraphs?.map((text) => (
        <p key={text} className="text-sm leading-relaxed text-nest-muted">
          {text}
        </p>
      ))}
      {block.steps ? (
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-nest-ink">
          {block.steps.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ol>
      ) : null}
      {block.bullets ? (
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-nest-ink">
          {block.bullets.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      ) : null}
      {block.note ? (
        <p className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-sm leading-relaxed text-amber-950">
          {block.note}
        </p>
      ) : null}
    </div>
  )
}

export default function HelpPage() {
  return (
    <div className="page-enter mx-auto max-w-4xl">
      <section className="surface-panel mb-5 p-6 md:p-8">
        <p className="inline-flex items-center gap-1.5 text-xs tracking-wide text-nest-muted">
          <CircleHelp size={14} /> 给老师看的操作说明
        </p>
        <h1 className="font-display mt-2 text-2xl font-semibold text-nest-ink md:text-3xl">
          {TEACHER_HANDBOOK_INTRO.title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-nest-muted">{TEACHER_HANDBOOK_INTRO.lead}</p>
        <p className="mt-2 text-sm leading-relaxed text-nest-pine">{TEACHER_HANDBOOK_INTRO.flow}</p>
      </section>

      <nav
        className="mb-5 flex flex-wrap gap-2"
        aria-label="说明目录"
      >
        {TEACHER_HANDBOOK_SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="rounded-full border border-nest-leaf/20 bg-white px-3 py-1.5 text-xs text-nest-pine transition hover:border-nest-leaf/50 hover:bg-nest-mist/80"
          >
            {section.title}
          </a>
        ))}
      </nav>

      <div className="space-y-4">
        {TEACHER_HANDBOOK_SECTIONS.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="surface-panel scroll-mt-6 space-y-5 p-5 md:p-6"
          >
            <h2 className="font-display text-xl font-semibold text-nest-ink">{section.title}</h2>
            {section.blocks.map((block, index) => (
              <Block key={`${section.id}-${index}`} block={block} />
            ))}
          </section>
        ))}
      </div>

      <p className="mt-6 text-center text-sm text-nest-muted">
        看完后可回到{' '}
        <Link to="/" className="font-medium text-nest-leaf underline-offset-2 hover:underline">
          首页
        </Link>
        开始使用。
      </p>
    </div>
  )
}
