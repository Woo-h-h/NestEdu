import { GROWTH_TREE_BRANCHES, growthTreePositions, visibleTreeItems } from '@/lib/growth-tree'
import type { GrowthTreeArtifact, GrowthTreeBranch } from '@/lib/growth-tree'

const FRUIT_REGIONS: Record<Exclude<GrowthTreeBranch, 'daily'>, [number, number, number, number, number]> = {
  practice: [462, 293, 104, 69, 3],
  research: [157, 188, 92, 66, 7],
  honor: [377, 114, 108, 62, 11],
}

interface GrowthTreeSvgProps {
  year: number
  displayName: string
  artifacts: GrowthTreeArtifact[]
  playKey: number
  onSelect: (item: GrowthTreeArtifact) => void
}

export default function GrowthTreeSvg({
  year,
  displayName,
  artifacts,
  playKey,
  onSelect,
}: GrowthTreeSvgProps) {
  const daily = artifacts.filter((x) => x.branch === 'daily')
  const shownDaily = visibleTreeItems(daily, 'daily')
  const dailySlots = growthTreePositions(shownDaily.length, 300, 214, 236, 151, 1)

  return (
    <svg
      key={playKey}
      className="growth-tree-svg absolute bottom-[-4px] left-1/2 h-full w-[min(99%,690px)] -translate-x-1/2 overflow-visible"
      viewBox="0 0 620 620"
      role="img"
      aria-label={`${year} 年度专业成长树`}
    >
      <defs>
        <linearGradient id="gtTrunk" x1="0" y1="0" x2="1" y2="0.2">
          <stop offset="0" stopColor="#5c3a24" />
          <stop offset="0.48" stopColor="#8a5a38" />
          <stop offset="1" stopColor="#4e321c" />
        </linearGradient>
        <linearGradient id="gtTrunkLight" x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#c48a58" />
          <stop offset="1" stopColor="#7a4a2c" />
        </linearGradient>
        <radialGradient id="gtC1">
          <stop stopColor="#c6ea69" />
          <stop offset="1" stopColor="#86bd37" />
        </radialGradient>
        <radialGradient id="gtC2">
          <stop stopColor="#aadb4a" />
          <stop offset="1" stopColor="#64a628" />
        </radialGradient>
        <radialGradient id="gtC3">
          <stop stopColor="#87c43a" />
          <stop offset="1" stopColor="#3f8d1d" />
        </radialGradient>
        <radialGradient id="gtC4">
          <stop stopColor="#72b02e" />
          <stop offset="1" stopColor="#286f18" />
        </radialGradient>
        <linearGradient id="gtLeaf1">
          <stop stopColor="#c8f178" />
          <stop offset="1" stopColor="#76c83d" />
        </linearGradient>
        <linearGradient id="gtLeaf2">
          <stop stopColor="#8ce061" />
          <stop offset="1" stopColor="#38a447" />
        </linearGradient>
        <radialGradient id="gtMossFruit" cx="0.34" cy="0.24">
          <stop stopColor="#d4f0d8" />
          <stop offset="0.55" stopColor="#4a9b7f" />
          <stop offset="1" stopColor="#1b4d3e" />
        </radialGradient>
        <radialGradient id="gtPineFruit" cx="0.34" cy="0.24">
          <stop stopColor="#c5e4d8" />
          <stop offset="0.55" stopColor="#2f6f5e" />
          <stop offset="1" stopColor="#14382e" />
        </radialGradient>
        <radialGradient id="gtOliveFruit" cx="0.34" cy="0.24">
          <stop stopColor="#f3f6c8" />
          <stop offset="0.55" stopColor="#8aaa48" />
          <stop offset="1" stopColor="#4f6a22" />
        </radialGradient>
      </defs>

      <path
        d="M0 553C102 533 176 554 247 540c102-21 200-18 373 8v72H0Z"
        fill="#8cba38"
        opacity=".23"
      />
      <ellipse cx="308" cy="567" rx="224" ry="29" fill="#4e7627" opacity=".17" />

      <g className="growth-tree-body">
        <path
          d="M77 575c57-20 101-44 128-77 29-35 44-70 42-115-1-38-18-67-45-92-22-21-55-39-100-47 54-9 95 4 125 26-15-39-40-66-81-90 46 7 80 22 109 51-5-41-10-78-33-115 42 28 59 63 69 98 10-45 28-85 61-121-6 50-10 87-19 127 36-40 75-65 126-79-38 33-64 63-85 100 49-22 97-30 153-21-58 19-101 39-139 66-35 25-51 55-50 96 1 48 15 87 44 120 29 32 69 49 132 67-51 3-92-6-126-17 22 22 52 33 91 41-53 2-92-9-126-30-15 29-34 38-54 15-21 24-43 16-58-9-35 22-76 31-128 22 32-11 58-24 78-42-38 13-72 24-114 26Z"
          fill="url(#gtTrunk)"
          stroke="#5c3a24"
          strokeWidth="4"
        />
        <path
          d="M276 506c15-55 8-117 5-174-2-49 11-89 34-129-18 75 0 140-2 200-1 50 12 101 32 145-25 15-67 7-89-6Z"
          fill="url(#gtTrunkLight)"
          opacity=".46"
        />
        <path
          d="M264 456c9-14 7-29 4-43m11-30c13-14 13-34 9-50m5-30c10-13 14-28 16-45"
          fill="none"
          stroke="#d68a57"
          strokeWidth="4"
          strokeLinecap="round"
          opacity=".58"
        />
      </g>

      <g
        className="growth-tree-branches"
        fill="none"
        stroke="url(#gtTrunk)"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M273 389c-50-36-100-62-171-59" strokeWidth="34" />
        <path d="M322 356c63-33 111-52 199-49" strokeWidth="32" />
        <path d="M286 292c-45-48-84-79-161-101" strokeWidth="30" />
        <path d="M311 277c29-53 70-96 146-130" strokeWidth="31" />
      </g>

      <g className="growth-tree-canopy" opacity={shownDaily.length > 0 ? 1 : 0.38}>
        <g fill="url(#gtC2)">
          <circle cx="77" cy="350" r="49" />
          <circle cx="117" cy="328" r="61" />
          <circle cx="169" cy="346" r="58" />
          <circle cx="108" cy="288" r="53" />
          <circle cx="162" cy="278" r="60" />
          <circle cx="216" cy="309" r="50" />
        </g>
        <g fill="url(#gtC3)">
          <circle cx="399" cy="320" r="54" />
          <circle cx="455" cy="337" r="61" />
          <circle cx="511" cy="314" r="54" />
          <circle cx="421" cy="270" r="61" />
          <circle cx="485" cy="265" r="66" />
          <circle cx="542" cy="277" r="43" />
        </g>
        <g fill="url(#gtC4)">
          <circle cx="103" cy="216" r="53" />
          <circle cx="155" cy="198" r="64" />
          <circle cx="216" cy="214" r="59" />
          <circle cx="88" cy="164" r="45" />
          <circle cx="141" cy="143" r="56" />
          <circle cx="201" cy="152" r="62" />
          <circle cx="251" cy="179" r="48" />
        </g>
        <g fill="url(#gtC1)">
          <circle cx="276" cy="148" r="61" />
          <circle cx="337" cy="124" r="68" />
          <circle cx="401" cy="137" r="65" />
          <circle cx="463" cy="164" r="59" />
          <circle cx="291" cy="88" r="45" />
          <circle cx="356" cy="70" r="52" />
          <circle cx="420" cy="91" r="50" />
          <circle cx="497" cy="207" r="49" />
        </g>
      </g>

      <g>
        {shownDaily.map((item, i) => {
          const p = dailySlots[i]
          const plan = item.kind === '周计划'
          const scale = plan ? 0.72 : 0.8
          return (
            <g
              key={item.id}
              className="growth-tree-output growth-tree-leaf"
              tabIndex={0}
              role="button"
              aria-label={`查看${item.title}`}
              transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.rot}) scale(${scale})`}
              style={{ animationDelay: `${i * 18}ms` }}
              onClick={() => onSelect(item)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(item)
                }
              }}
            >
              <title>{`${item.kind}｜${item.title}`}</title>
              <path
                d="M-20 0C-12-18 11-18 21 0 11 17-11 17-20 0Z"
                fill={plan ? 'url(#gtLeaf1)' : 'url(#gtLeaf2)'}
                stroke={plan ? '#57a831' : '#278c39'}
                strokeWidth="2"
              />
              <path
                d="M-15 0Q0 1 16 0M-6-1l-6-6M2 0l-6-8M8 1l6-7M-5 1l-7 7M4 1l-6 8M10 0l6 6"
                fill="none"
                stroke={plan ? '#55a52f' : '#267f37'}
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </g>
          )
        })}
        {(['practice', 'research', 'honor'] as const).flatMap((branch) => {
          const items = visibleTreeItems(
            artifacts.filter((x) => x.branch === branch),
            branch
          )
          const region = FRUIT_REGIONS[branch]
          const slots = growthTreePositions(items.length, ...region)
          const grad =
            branch === 'practice' ? 'gtMossFruit' : branch === 'research' ? 'gtPineFruit' : 'gtOliveFruit'
          const stroke = branch === 'honor' ? '#6b8f3a' : 'rgba(46,66,47,.4)'
          return items.map((item, i) => {
            const p = slots[i]
            return (
              <g
                key={item.id}
                className="growth-tree-output"
                tabIndex={0}
                role="button"
                aria-label={`查看${item.title}`}
                transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(.7)`}
                onClick={() => onSelect(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(item)
                  }
                }}
              >
                <title>{`${item.kind}｜${item.title}`}</title>
                <g className="growth-tree-fruit" style={{ animationDelay: `${350 + i * 28}ms` }}>
                  <path
                    d="M0-11c1-7 4-11 8-14"
                    stroke="#694827"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d="M5-20c7-6 15-3 15 4-7 2-12 0-15-4Z"
                    fill="#5fa735"
                    stroke="#3d8124"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M0-10C-12-18-23-7-20 8c3 17 13 21 20 15 7 6 17 2 21-15C24-7 13-18 0-10Z"
                    fill={`url(#${grad})`}
                    stroke={stroke}
                    strokeWidth="2"
                  />
                  <ellipse
                    cx="-7"
                    cy="-1"
                    rx="4"
                    ry="7"
                    fill="rgba(255,255,255,.72)"
                    transform="rotate(35 -7 -1)"
                  />
                  {branch === 'honor' ? (
                    <path
                      className="growth-tree-spark"
                      d="M23-15l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"
                      fill="#eef5b0"
                    />
                  ) : null}
                </g>
              </g>
            )
          })
        })}
      </g>

      <g>
        <rect x="252" y="435" width="116" height="58" rx="23" fill="#f4f8f2" stroke="#8aaa70" strokeWidth="2" />
        <path d="M252 453h116" stroke="#d5e4c8" />
        <text x="310" y="451" textAnchor="middle" fontSize="15" fontWeight="700" fill="#1b4d3e">
          {displayName.slice(0, 6) || '老师'}
        </text>
        <text x="310" y="478" textAnchor="middle" fontSize="9" fill="#5c6f68">
          {year} · 华科附幼
        </text>
      </g>
    </svg>
  )
}

export function GrowthTreeLabels({
  active,
  onSelect,
}: {
  active: GrowthTreeBranch
  onSelect: (branch: GrowthTreeBranch) => void
}) {
  const items: { key: GrowthTreeBranch; className: string }[] = [
    { key: 'daily', className: 'left-[2%] bottom-[23%]' },
    { key: 'practice', className: 'right-[2%] top-[47%]' },
    { key: 'research', className: 'left-[2%] top-[28%]' },
    { key: 'honor', className: 'right-[4%] top-[14%]' },
  ]
  return (
    <>
      {items.map(({ key, className }) => {
        const meta = GROWTH_TREE_BRANCHES[key]
        const isActive = active === key
        return (
          <button
            key={key}
            type="button"
            className={`absolute z-[4] rounded-xl border border-white/95 bg-white/92 px-2.5 py-1.5 text-left shadow-[0_7px_20px_rgba(53,81,57,.12)] transition hover:-translate-y-0.5 ${className} ${isActive ? 'ring-1 ring-nest-leaf/40' : ''}`}
            style={{ borderLeft: `3px solid ${meta.color}` }}
            onClick={() => onSelect(key)}
          >
            <small className="block text-[10px] text-nest-muted">{meta.eyebrow}</small>
            <b className="mt-0.5 block text-[11px] text-nest-ink">{meta.short}</b>
          </button>
        )
      })}
    </>
  )
}
