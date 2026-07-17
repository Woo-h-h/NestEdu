import { useState } from 'react'
import { BookOpen, Sparkles } from 'lucide-react'
import WeeklyPlanCreateSection from './create/index'
import WeeklyPlanManageSection from './manage/index'

type Section = 'generate' | 'manage'

export default function WeeklyPlanPage() {
  const [section, setSection] = useState<Section>('generate')

  return (
    <div className="page-enter mx-auto max-w-6xl">
      <div className="mb-7">
        <h1 className="font-display text-2xl font-bold tracking-wide text-nest-ink md:text-[1.75rem]">
          周计划管理
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-nest-muted">
          周计划生成与知识库管理相互独立：先勾选教案生成「快乐一周」，再编辑导出或入库；也可直接管理知识库文档
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSection('generate')}
          className={`tab-pill ${section === 'generate' ? 'tab-pill-active' : 'tab-pill-idle'}`}
        >
          <Sparkles size={16} /> 周计划生成
        </button>
        <button
          type="button"
          onClick={() => setSection('manage')}
          className={`tab-pill ${section === 'manage' ? 'tab-pill-active' : 'tab-pill-idle'}`}
        >
          <BookOpen size={16} /> 知识库管理
        </button>
      </div>

      {/* 保持挂载，切换 Tab 不丢失生成/编辑中的周计划 */}
      <div className={section === 'generate' ? '' : 'hidden'}>
        <WeeklyPlanCreateSection />
      </div>
      <div className={section === 'manage' ? '' : 'hidden'}>
        <WeeklyPlanManageSection />
      </div>
    </div>
  )
}
