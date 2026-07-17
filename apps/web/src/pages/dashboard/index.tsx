import { ArrowRight, BookOpen, CalendarDays, FolderOpen, Plus, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function DashboardPage() {
  const navigate = useNavigate()

  return (
    <div className="page-enter mx-auto max-w-5xl">
      <section className="relative mb-8 overflow-hidden rounded-3xl border border-nest-leaf/10 bg-gradient-to-br from-nest-pine via-nest-leaf to-[#3d8f74] px-7 py-9 text-white shadow-lg shadow-nest-pine/15 md:px-10 md:py-11">
        <div
          className="nest-orb pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-nest-sand/15 blur-3xl"
          aria-hidden
        />
        <p className="relative text-xs font-medium tracking-[0.18em] text-emerald-100/80 uppercase">
          HUST Affiliated Kindergarten
        </p>
        <h1 className="font-display relative mt-3 text-3xl font-bold tracking-wide md:text-4xl">
          华科附幼智能教案助手
        </h1>
        <p className="relative mt-3 max-w-xl text-sm leading-relaxed text-emerald-50/85 md:text-[15px]">
          用智能体生成教案与周计划，按知识库分类管理与导出——服务一线教师的一日生活与主题教学。
        </p>
        <div className="relative mt-6 flex flex-wrap items-center gap-2 text-xs text-emerald-50/90">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 ring-1 ring-white/20 backdrop-blur-sm">
            <BookOpen size={13} /> 课程资源库
          </span>
          <ArrowRight size={14} className="text-white/40" />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 ring-1 ring-white/20 backdrop-blur-sm">
            <CalendarDays size={13} /> 周计划生成
          </span>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <article className="surface-panel group flex flex-col p-6 transition-transform duration-300 hover:-translate-y-0.5">
          <div className="mb-5 flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-nest-mist text-nest-leaf ring-1 ring-nest-leaf/15 transition-colors group-hover:bg-nest-leaf group-hover:text-white">
              <BookOpen size={22} />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-nest-ink">课程资源库</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-nest-muted">
                按主题与重点领域生成教案，确认后入库；或在知识库中上传、查看与删除文档。
              </p>
            </div>
          </div>
          <button type="button" onClick={() => navigate('/resources')} className="btn-primary mt-auto w-fit">
            进入资源库
            <ArrowRight size={16} />
          </button>
        </article>

        <article className="surface-panel group flex flex-col p-6 transition-transform duration-300 hover:-translate-y-0.5">
          <div className="mb-5 flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 ring-1 ring-sky-200/80 transition-colors group-hover:bg-sky-600 group-hover:text-white">
              <CalendarDays size={22} />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-nest-ink">周计划生成</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-nest-muted">
                选择班级与主题后勾选教案一键生成「快乐一周」；支持编辑、AI 改稿、导出与入库。
              </p>
            </div>
          </div>
          <div className="mt-auto flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate('/weekly-plan/create')}
              className="btn-primary"
            >
              <Plus size={16} />
              新建周计划
            </button>
            <button
              type="button"
              onClick={() => navigate('/weekly-plan/manage')}
              className="btn-secondary"
            >
              <FolderOpen size={16} />
              周计划管理
            </button>
          </div>
        </article>
      </div>

      <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-xs text-nest-muted/80">
        <Sparkles size={12} className="text-nest-moss" />
        自然和谐 · 共同成长
      </p>
    </div>
  )
}
