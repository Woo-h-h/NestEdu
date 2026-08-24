import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  BookOpen,
  Home,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  FolderKanban,
  Radar,
  Sparkles,
} from 'lucide-react'
import UserBadge from '@/components/layout/UserBadge'
import { formatAppVersionLabel } from '@/lib/appVersion'

type MenuItem = {
  path: string
  title: string
  shortLabel: string
  subtitle: string
  icon: typeof Home
}

const menuItems: MenuItem[] = [
  {
    path: '/',
    title: '首页',
    shortLabel: '首页',
    subtitle: '智能生成、成果沉淀与专业成长',
    icon: Home,
  },
  {
    path: '/activity',
    title: '活动方案',
    shortLabel: '活动',
    subtitle: '单次保教活动的详细设计与实施支持',
    icon: BookOpen,
  },
  {
    path: '/weekly-plan',
    title: '周计划',
    shortLabel: '周计划',
    subtitle: '一周保教工作整体统筹与活动联动',
    icon: CalendarDays,
  },
  {
    path: '/archive',
    title: '成果库',
    shortLabel: '成果',
    subtitle: '系统生成成果与专业成长成果统一汇集',
    icon: FolderKanban,
  },
  {
    path: '/profile',
    title: '教师画像',
    shortLabel: '画像',
    subtitle: '专业成长树与发展建议',
    icon: Radar,
  },
]

function isMenuActive(pathname: string, path: string): boolean {
  if (path === '/') return pathname === '/'
  return pathname === path || pathname.startsWith(`${path}/`)
}

function resolveActiveMenu(pathname: string): MenuItem {
  if (pathname === '/') return menuItems[0]
  const match = menuItems.find(
    (m) => m.path !== '/' && (pathname === m.path || pathname.startsWith(`${m.path}/`))
  )
  return match ?? menuItems[0]
}

function SidebarNav({
  collapsed,
  pathname,
  onNavigate,
}: {
  collapsed: boolean
  pathname: string
  onNavigate: (path: string) => void
}) {
  return (
    <nav className="relative z-10 flex-1 space-y-1.5 overflow-y-auto px-3 py-5" aria-label="主要导航">
      {menuItems.map((item) => {
        const Icon = item.icon
        const active = isMenuActive(pathname, item.path)
        return (
          <button
            type="button"
            key={item.path}
            onClick={() => onNavigate(item.path)}
            title={item.title}
            aria-current={active ? 'page' : undefined}
            className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm transition-all ${
              active
                ? 'bg-white font-bold text-[#1e5142] shadow-sm'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            } ${collapsed ? 'justify-center px-2' : ''}`}
          >
            <Icon size={21} className="shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </button>
        )
      })}
    </nav>
  )
}

function BottomNav({ pathname, onNavigate }: { pathname: string; onNavigate: (path: string) => void }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-[#dfe8e3] bg-white/96 backdrop-blur-md md:hidden"
      aria-label="主要导航"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          const active = isMenuActive(pathname, item.path)
          return (
            <button
              type="button"
              key={item.path}
              onClick={() => onNavigate(item.path)}
              aria-current={active ? 'page' : undefined}
              aria-label={item.title}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[10px] transition-colors ${
                active ? 'font-bold text-[#1e5142]' : 'text-[#6d7d76] hover:text-[#1e5142]'
              }`}
            >
              <Icon size={20} className="shrink-0" />
              <span className="truncate">{item.shortLabel}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const activeMenu = resolveActiveMenu(location.pathname)

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={`relative hidden flex-col text-white transition-all duration-300 md:flex ${
          collapsed ? 'w-[4.5rem]' : 'w-[246px]'
        }`}
        style={{
          background: 'linear-gradient(165deg, #163d32 0%, #1e5142 45%, #245a48 100%)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(74,155,127,0.35), transparent 45%), radial-gradient(circle at 80% 80%, rgba(244,240,232,0.08), transparent 40%)',
          }}
        />

        <div className="relative z-10 border-b border-white/15 px-3 py-5">
          <div className={`flex items-center gap-2.5 ${collapsed ? 'justify-center' : 'px-1'}`}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#f0f7f3] text-[#1e5142] shadow-md shadow-black/20">
              <Sparkles size={20} />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="font-display text-[16px] font-bold leading-tight tracking-wide">
                  启芽智教
                </div>
                <div className="mt-0.5 truncate text-[11px] text-white/60">
                  幼儿园教师智能工作与成长平台
                </div>
              </div>
            )}
          </div>
        </div>

        <SidebarNav
          collapsed={collapsed}
          pathname={location.pathname}
          onNavigate={navigate}
        />

        {!collapsed && (
          <div className="relative z-10 mx-3 mb-3 rounded-[14px] border border-white/15 bg-white/10 p-3.5 text-[12px] leading-relaxed text-white/70">
            <strong className="mb-1 block text-[13px] text-white">保教资源与专业成长一体化</strong>
            画像用于支持教师个人发展，不进行教师排名或绩效评分。
          </div>
        )}

        <div
          className={`relative z-10 border-t border-white/10 px-3 pt-2 text-center text-[10px] tracking-wide text-white/40 ${
            collapsed ? 'px-1' : ''
          }`}
          title={formatAppVersionLabel()}
        >
          {collapsed ? formatAppVersionLabel({ compact: true }) : formatAppVersionLabel()}
        </div>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="relative z-10 flex justify-center border-t border-white/10 py-3 text-white/50 transition-colors hover:text-white"
          aria-label={collapsed ? '展开侧栏' : '收起侧栏'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#e8f0eb]">
        <header className="z-10 flex h-[74px] items-center justify-between gap-4 border-b border-[#dfe8e3] bg-white/94 px-4 backdrop-blur-md md:px-8">
          <div className="min-w-0">
            <div className="truncate text-lg font-bold text-[#243b34]">{activeMenu.title}</div>
            <div className="truncate text-xs text-[#6d7d76]">{activeMenu.subtitle}</div>
          </div>
          <UserBadge />
        </header>

        <main className="flex-1 overflow-auto p-4 pb-20 md:p-8 md:pb-8">
          <Outlet />
        </main>

        <BottomNav pathname={location.pathname} onNavigate={navigate} />
      </div>
    </div>
  )
}
