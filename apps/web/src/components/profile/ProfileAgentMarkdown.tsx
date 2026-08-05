import type { ReactNode } from 'react'

/**
 * 智能画像 Markdown 格式拆解渲染：
 * 按 ## / ### 切成区块卡片，并轻量解析加粗与有序列表。
 */

type ProfileSection = {
  level: 2 | 3
  title: string
  body: string
}

const SECTION_HINTS: Record<string, string> = {
  数字名片: '一句话概括教师、材料范围与画像主题',
  成长结构观察: '围绕活动方案 / 周计划 / 教师成果库三维度',
  相对充实的方向: '有数据支撑的优势结构（须带证据）',
  建议加强的方向: '待补齐的维度或材料缺口（须带证据）',
  代表成果建议: '可展示的代表文档与推荐理由',
  写给自己的一段话: '鼓励性短文，可选',
  数据说明: '范围、局限与合规声明',
}

/** 已下线的模块：旧快照若仍含这些标题则跳过不展示 */
const HIDDEN_SECTION_KEYS = [
  '近 30 天行动建议',
  '近30天行动建议',
  '成长路径',
  '关键词',
  '结构趋势',
]

function splitSections(text: string): ProfileSection[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const sections: ProfileSection[] = []
  let current: ProfileSection | null = null

  const push = () => {
    if (current) {
      current.body = current.body.trim()
      sections.push(current)
    }
  }

  for (const raw of lines) {
    const h2 = raw.match(/^##\s+(.+)$/)
    const h3 = raw.match(/^###\s+(.+)$/)
    if (h2) {
      push()
      current = { level: 2, title: h2[1].trim(), body: '' }
      continue
    }
    if (h3) {
      push()
      current = { level: 3, title: h3[1].trim(), body: '' }
      continue
    }
    if (!current) {
      current = { level: 2, title: '前言', body: '' }
    }
    current.body += `${raw}\n`
  }
  push()
  return sections.filter((s) => {
    if (s.title === '前言' && !s.body) return false
    return !HIDDEN_SECTION_KEYS.some((key) => s.title.includes(key))
  })
}

function hintFor(title: string): string | undefined {
  for (const [key, hint] of Object.entries(SECTION_HINTS)) {
    if (title.includes(key)) return hint
  }
  return undefined
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const re = /\*\*(.+?)\*\*/g
  let last = 0
  let match: RegExpExecArray | null
  let i = 0
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(
        <span key={`${keyPrefix}-t${i++}`}>{text.slice(last, match.index)}</span>
      )
    }
    nodes.push(
      <strong key={`${keyPrefix}-b${i++}`} className="font-semibold text-nest-ink">
        {match[1]}
      </strong>
    )
    last = match.index + match[0].length
  }
  if (last < text.length) {
    nodes.push(<span key={`${keyPrefix}-t${i++}`}>{text.slice(last)}</span>)
  }
  return nodes
}

function SectionBody({ body }: { body: string }) {
  const blocks = body
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)

  if (blocks.length === 0) {
    return <p className="text-sm text-nest-muted">（本节暂无内容）</p>
  }

  return (
    <div className="space-y-2.5 text-sm leading-relaxed text-nest-ink/90">
      {blocks.map((block, index) => {
        const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
        const isOrdered = lines.every((line) => /^\d+\.\s+/.test(line))
        const isBullet = lines.every((line) => /^[-*•]\s+/.test(line))

        if (isOrdered || isBullet) {
          return (
            <ol
              key={index}
              className={`space-y-2 pl-5 ${isOrdered ? 'list-decimal' : 'list-disc'}`}
            >
              {lines.map((line, lineIndex) => {
                const content = line.replace(/^\d+\.\s+/, '').replace(/^[-*•]\s+/, '')
                return (
                  <li key={lineIndex} className="pl-1">
                    {renderInline(content, `${index}-${lineIndex}`)}
                  </li>
                )
              })}
            </ol>
          )
        }

        // 单行「证据：」提示
        if (/[（(]证据[:：]/.test(block) || /证据[:：]/.test(block)) {
          return (
            <p key={index} className="rounded-lg bg-nest-mist/50 px-3 py-2 text-nest-ink">
              {renderInline(block, `p${index}`)}
            </p>
          )
        }

        return (
          <p key={index} className="whitespace-pre-wrap">
            {renderInline(block, `p${index}`)}
          </p>
        )
      })}
    </div>
  )
}

export default function ProfileAgentMarkdown({ text }: { text: string }) {
  const sections = splitSections(text.trim())

  if (sections.length === 0) {
    return <p className="text-sm text-nest-muted">暂无画像内容</p>
  }

  // 未能按 ## 切分时回退整段
  if (sections.length === 1 && sections[0].title === '前言') {
    return (
      <div className="space-y-3 text-sm leading-relaxed text-nest-ink">
        <SectionBody body={sections[0].body} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <details className="rounded-xl border border-nest-leaf/15 bg-white/70 px-4 py-3 text-xs text-nest-muted">
        <summary className="cursor-pointer select-none font-medium text-nest-pine">
          查看输出格式拆解（共 {sections.length} 个区块）
        </summary>
        <ol className="mt-3 list-decimal space-y-1.5 pl-4">
          {sections.map((section, index) => (
            <li key={`${section.title}-${index}`}>
              <span className="font-medium text-nest-ink">
                {section.level === 3 ? '　↳ ' : ''}
                {section.title}
              </span>
              {hintFor(section.title) ? (
                <span className="text-nest-muted"> — {hintFor(section.title)}</span>
              ) : null}
            </li>
          ))}
        </ol>
        <p className="mt-3 leading-relaxed text-nest-muted">
          约定结构：数字名片 → 成长结构观察（充实 / 加强）→ 代表成果 →
          写给自己的一段话（可选）→ 数据说明。判断须带证据，禁止排名与绩效分。
        </p>
      </details>

      {sections.map((section, index) => {
        const hint = hintFor(section.title)
        const isH3 = section.level === 3
        return (
          <article
            key={`${section.title}-${index}`}
            className={`rounded-2xl border border-nest-leaf/10 ${
              isH3 ? 'bg-white/60 px-4 py-3 ml-0 md:ml-3' : 'bg-white/80 px-4 py-4'
            }`}
          >
            <header className="mb-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-nest-muted">
                {isH3 ? '子节' : `第 ${index + 1} 节`}
              </p>
              <h3
                className={`font-display font-semibold text-nest-ink ${
                  isH3 ? 'text-sm text-nest-pine' : 'text-base'
                }`}
              >
                {section.title}
              </h3>
              {hint ? <p className="mt-0.5 text-xs text-nest-muted">{hint}</p> : null}
            </header>
            <SectionBody body={section.body} />
          </article>
        )
      })}
    </div>
  )
}
